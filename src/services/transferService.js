const db = require("@/config/db");
const { convertToBase } = require("@/helpers/currencyHelper");
const { getRateByDate } = require("@/services/exchangeRateService");
const prisma = db.getClient();

const toInt = (v) =>
  v === undefined || v === null || v === "" ? undefined : parseInt(v);

async function getCrossRate(from, to, date) {
    if (from === to) return 1;
    const direct = await getRateByDate(from, to, date, "sell");
    if (direct) return direct.rate;
    const inverse = await getRateByDate(to, from, date, "sell");
    if (inverse) return 1 / inverse.rate;

    throw new Error(`No hay tipo de cambio ${from}->${to} para la fecha`);
}

async function resolveTransfer(data, userId) {
    const fromAccount = await prisma.account.findUnique({
        where: { id: toInt(data.fromAccountId) }
    });
    const toAccount = await prisma.account.findUnique({
        where: { id: toInt(data.toAccountId) }
    });
    if (!fromAccount) throw new Error("Cuenta origen no existe o fue eliminada");
    if (!toAccount) throw new Error("Cuenta destino no existe o fue eliminada");
    if (fromAccount.userId !== userId || toAccount.userId !== userId)
        throw new Error("Cuenta no pertenece al usuario");
    if (fromAccount.id === toAccount.id)
        throw new Error("Las cuentas origen y destino deben ser distintas");

    const date = new Date(data.date);
    const fromAmount = Number(data.fromAmount);
    const fromCurrency = fromAccount.currency;
    const toCurrency = toAccount.currency;

    const hasRate =
        data.rate !== undefined && data.rate !== null && data.rate !== "";
    let rate = hasRate ? Number(data.rate) : null;
    let toAmount;

    if (fromCurrency === toCurrency) {
        toAmount = fromAmount;
        rate = rate ?? 1;
    } else if (data.toAmount !== undefined && data.toAmount !== null && data.toAmount !== "") {
        toAmount = Number(data.toAmount);
        rate = rate ?? toAmount / fromAmount;
    } else {
        rate = rate ?? (await getCrossRate(fromCurrency, toCurrency, date));
        toAmount = fromAmount * rate;
    }

    const fromAmountBase = await convertToBase(fromAmount, fromCurrency, date);
    const toAmountBase = await convertToBase(toAmount, toCurrency, date);

    return {
        userId,
        fromAccount,
        toAccount,
        date,
        fromAmount,
        toAmount,
        fromCurrency,
        toCurrency,
        rate,
        fromAmountBase,
        toAmountBase,
        description: data.description ?? null,
    };
};

exports.create = async (data) => {
    const userId = toInt(data.userId);
    const r = await resolveTransfer(data, userId);

    return prisma.$transaction(async (tx) => {
        const fromTxn = await tx.transaction.create({
            data: {
                userId,
                accountId: r.fromAccount.id,
                type: "egreso",
                amount: r.fromAmount,
                amountBase: r.fromAmountBase,
                date: r.date,
                source: "transfer",
                description: r.description || "Transferencia",
            },
        });

        const toTxn = await tx.transaction.create({
            data: {
                userId,
                accountId: r.toAccount.id,
                type: "ingreso",
                amount: r.toAmount,
                amountBase: r.toAmountBase,
                date: r.date,
                source: "transfer",
                description: r.description || "Transferencia",
            },
        });

        return tx.transfer.create({
            data: {
                userId,
                fromAccountId: r.fromAccount.id,
                toAccountId: r.toAccount.id,
                fromAmount: r.fromAmount,
                toAmount: r.toAmount,
                fromCurrency: r.fromCurrency,
                toCurrency: r.toCurrency,
                rate: r.rate,
                date: r.date,
                description: r.description,
                fromTxnId: fromTxn.id,
                toTxnId: toTxn.id,
            },
            include: { fromAccount: true, toAccount: true },
        });
    });
};

exports.getAll = async (userId) =>
  prisma.transfer.findMany({
    where: { userId: toInt(userId) },
    orderBy: [{ date: "desc" }, { id: "desc" }],
    include: { fromAccount: true, toAccount: true },
  });

exports.getById = async (id) =>
  prisma.transfer.findUnique({
    where: { id: parseInt(id) },
    include: { fromAccount: true, toAccount: true },
  });

exports.update = async (id, data) => {
  const transferId = parseInt(id);
  const current = await prisma.transfer.findUnique({ where: { id: transferId } });
  if (!current) throw new Error("Transfer not found");

  const userId = current.userId;
  const r = await resolveTransfer(data, userId);

  return prisma.$transaction(async (tx) => {
    const now = new Date();
    if (current.fromTxnId) {
      await tx.transaction.updateMany({
        where: { id: current.fromTxnId, deletedAt: null },
        data: { deletedAt: now },
      });
    }
    if (current.toTxnId) {
      await tx.transaction.updateMany({
        where: { id: current.toTxnId, deletedAt: null },
        data: { deletedAt: now },
      });
    }

    const fromTxn = await tx.transaction.create({
      data: {
        userId,
        accountId: r.fromAccount.id,
        type: "egreso",
        amount: r.fromAmount,
        amountBase: r.fromAmountBase,
        date: r.date,
        source: "transfer",
        description: r.description || "Transferencia",
      },
    });
    const toTxn = await tx.transaction.create({
      data: {
        userId,
        accountId: r.toAccount.id,
        type: "ingreso",
        amount: r.toAmount,
        amountBase: r.toAmountBase,
        date: r.date,
        source: "transfer",
        description: r.description || "Transferencia",
      },
    });

    return tx.transfer.update({
      where: { id: transferId },
      data: {
        fromAccountId: r.fromAccount.id,
        toAccountId: r.toAccount.id,
        fromAmount: r.fromAmount,
        toAmount: r.toAmount,
        fromCurrency: r.fromCurrency,
        toCurrency: r.toCurrency,
        rate: r.rate,
        date: r.date,
        description: r.description,
        fromTxnId: fromTxn.id,
        toTxnId: toTxn.id,
      },
      include: { fromAccount: true, toAccount: true },
    });
  });
};

exports.delete = async (id) => {
  const transferId = parseInt(id);
  const current = await prisma.transfer.findUnique({ where: { id: transferId } });
  if (!current) throw new Error("Transfer not found");

  const now = new Date();
  const txnIds = [current.fromTxnId, current.toTxnId].filter(Boolean);

  await prisma.$transaction([
    prisma.transaction.updateMany({
      where: { id: { in: txnIds }, deletedAt: null },
      data: { deletedAt: now },
    }),
    prisma.transfer.update({
      where: { id: transferId },
      data: { deletedAt: now },
    }),
  ]);
};

