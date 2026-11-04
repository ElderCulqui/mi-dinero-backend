const { convertFromBase, convertToBase } = require("@/helpers/currencyHelper");
const { parseMinor } = require("@/helpers/money");
const db = require("../config/db");
const prisma = db.getClient();

const parseOptionalMinor = (value) => {
    if (value === undefined) return undefined;
    if (value === null || value === "") return null;
    return parseMinor(value);
};

const STATEMENT_MINOR_FIELDS = [
    "bankAmount",
    "bankAmountUsd",
    "minimumPaymentMinor",
    "minimumPaymentUsdMinor",
    "totalBalanceMinor",
    "totalBalanceUsdMinor",
    "lineUsedMinor",
    "paidAmountMinor",
    "paidAmountUsdMinor",
];

const dayAfterStart = (date) => {
    const next = new Date(date);
    next.setUTCDate(next.getUTCDate() + 1);
    return new Date(
        Date.UTC(
            next.getUTCFullYear(),
            next.getUTCMonth(),
            next.getUTCDate(),
            0,
            0,
            0,
            0,
        ),
    );
};
exports.create = async (data) => {
    data.creditCardId = parseInt(data.creditCardId);
    if (data.bankAmount !== undefined && data.bankAmount !== null && data.bankAmount !== "") {
        data.bankAmount = parseMinor(data.bankAmount);
    }
    if (data.bankAmountUsd !== undefined && data.bankAmountUsd !== null && data.bankAmountUsd !== "") {
        data.bankAmountUsd = parseMinor(data.bankAmountUsd);
    }

    return prisma.billingCycle.create({ data })
}

exports.getById = async (id) => {
  return prisma.billingCycle.findUnique({ 
        where: { id: parseInt(id) } 
    });
};

exports.getByUser = async (userId) => {
  return prisma.billingCycle.findMany({
        where: { userId: parseInt(userId) }
    });
};

exports.update = async (id, data) => {
  const cycleId = parseInt(id);
  const current = await prisma.billingCycle.findUnique({ where: { id: cycleId } });
  if (!current) throw new Error("BillingCycle not found");

  const periodStart = data.periodStart !== undefined ? new Date(data.periodStart) : current.periodStart;
  const periodEnd = data.periodEnd !== undefined ? new Date(data.periodEnd) : current.periodEnd;
  const dueDate = data.dueDate !== undefined ? new Date(data.dueDate) : current.dueDate;

  const overlap = await prisma.billingCycle.findFirst({
    where: {
      creditCardId: current.creditCardId,
      deletedAt: null,
      id: { not: cycleId },
      periodStart: { lt: periodEnd },
      periodEnd: { gt: periodStart },
    },
  });
  if (overlap) throw new Error("El rango se solapa con otro BillingCycle de la tarjeta");

  try {
    return await prisma.billingCycle.update({
      where: { id: cycleId },
      data: {
        periodStart,
        periodEnd,
        dueDate,
        bankAmount: data.bankAmount !== undefined
          ? (data.bankAmount === null ? null : parseMinor(data.bankAmount))
          : undefined,
        bankAmountUsd: data.bankAmountUsd !== undefined
          ? (data.bankAmountUsd === null ? null : parseMinor(data.bankAmountUsd))
          : undefined,
        status: data.status,
      },
    });
  } catch (error) {
    if (error.code === "P2025") throw new Error("BillingCycle not found");
    throw error;
  }
}

exports.updateStatement = async (id, data) => {
  const cycleId = parseInt(id);
  const cycle = await prisma.billingCycle.findUnique({
    where: { id: cycleId },
    include: { creditCard: { include: { accounts: true } } },
  });
  if (!cycle) throw new Error("BillingCycle not found");

  const update = {};
  for (const field of STATEMENT_MINOR_FIELDS) {
    if (data[field] !== undefined) update[field] = parseOptionalMinor(data[field]);
  }
  if (data.paidDate !== undefined) {
    update.paidDate = data.paidDate ? new Date(data.paidDate) : null;
  }
  if (data.status !== undefined) update.status = data.status;
  update.statementRegisteredAt = new Date();

  const shouldUpdateBalance =
    data.updateAccountBalance === true || data.updateAccountBalance === "true";
  const bankCurrency = cycle.creditCard.bankCurrency || "PEN";
  const accounts = cycle.creditCard.accounts || [];
  const primaryAccount = accounts.find((a) => a.currency === bankCurrency);
  const usdAccount = accounts.find((a) => a.currency === "USD");
  const openingDate = dayAfterStart(cycle.periodEnd);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.billingCycle.update({
      where: { id: cycleId },
      data: update,
    });

    if (shouldUpdateBalance) {
      if (!primaryAccount) {
        throw Object.assign(
          new Error(`La tarjeta no tiene cuenta en ${bankCurrency}`),
          { status: 400 },
        );
      }

      const totalBalance =
        update.totalBalanceMinor !== undefined
          ? update.totalBalanceMinor
          : cycle.totalBalanceMinor;

      if (totalBalance === null || totalBalance === undefined) {
        throw Object.assign(
          new Error(
            "totalBalanceMinor es obligatorio para actualizar el saldo de la tarjeta",
          ),
          { status: 400 },
        );
      }

      await tx.account.update({
        where: { id: primaryAccount.id },
        data: {
          openingBalanceMinor: totalBalance,
          openingBalanceDate: openingDate,
        },
      });

      const totalUsd =
        update.totalBalanceUsdMinor !== undefined
          ? update.totalBalanceUsdMinor
          : cycle.totalBalanceUsdMinor;

      if (usdAccount && totalUsd !== null && totalUsd !== undefined) {
        await tx.account.update({
          where: { id: usdAccount.id },
          data: {
            openingBalanceMinor: totalUsd,
            openingBalanceDate: openingDate,
          },
        });
      }
    }

    return updated;
  });
}

exports.delete = async (id) => {
  try {
    await prisma.billingCycle.delete({
      where: { id: parseInt(id) },
    });
  } catch (error) {
    if (error.code === "P2025") {
      throw new Error("BillingCycle not found");
    }
    throw error;
  }
};

exports.getByCreditCard = async (creditCardId, year) => {
  const where = { creditCardId: parseInt(creditCardId) };
  if (year) {
    const y = parseInt(year);
    where.periodStart = {
      gte: new Date(Date.UTC(y, 0, 1)),
      lt: new Date(Date.UTC(y + 1, 0, 1)),
    };
  }
  return prisma.billingCycle.findMany({
    where,
    orderBy: { periodStart: "asc" },
  });
};

exports.getSummary = async (id) => {
  const cycleId = parseInt(id);
  const cycle = await prisma.billingCycle.findUnique({
    where: { id: cycleId },
    include: { creditCard: true },
  });
  if (!cycle) return null;

  const transactions = await prisma.transaction.findMany({
    where: { billingCycleId: cycleId },
    orderBy: { date: "asc" },
    include: { account: true, category: true },
  });

  const totalAmountBase = transactions.reduce((sum, t) => sum + t.amountBase, 0n);
  const bankCurrency = cycle.creditCard.bankCurrency || "PEN";

  let totalBankAmount = 0n;
  for (const t of transactions) {
    totalBankAmount += await convertFromBase(t.amountBase, bankCurrency, t.date);
  }

  const installments = await prisma.installment.findMany({
    where: {
      installmentPlan: {
        creditCardId: cycle.creditCardId,
        deletedAt: null,
      },
      dueDate: { gt: cycle.periodEnd, lte: cycle.dueDate },
      status: { not: "pagado" },
    },
    include: {
      installmentPlan: {
        select: { id: true, description: true, currency: true },
      },
    },
    orderBy: { installmentPlanId: "asc" },
  });

  let installmentsDueMinor = 0n;
  for (const installment of installments) {
    const remaining = installment.amount - installment.paidAmount;
    if (remaining <= 0n) continue;

    if (installment.installmentPlan.currency === bankCurrency) {
      installmentsDueMinor += remaining;
    } else {
      const base = await convertToBase(
        remaining,
        installment.installmentPlan.currency,
        cycle.dueDate,
      );
      installmentsDueMinor += await convertFromBase(
        base,
        bankCurrency,
        cycle.dueDate,
      );
    }
  }

  const computedTotalBankAmount = totalBankAmount + installmentsDueMinor;
  const differenceMinor =
    cycle.bankAmount !== null
      ? computedTotalBankAmount - cycle.bankAmount
      : null;

  return {
    billingCycle: cycle,
    bankCurrency,
    totalAmountBase,
    totalBankAmount,
    installmentsDueMinor,
    computedTotalBankAmount,
    differenceMinor,
    transactionCount: transactions.length,
    transactions,
    installmentsDue: installments.map((installment) => ({
      id: installment.id,
      number: installment.number,
      amount: installment.amount,
      paidAmount: installment.paidAmount,
      status: installment.status,
      planId: installment.installmentPlan.id,
      description: installment.installmentPlan.description,
      currency: installment.installmentPlan.currency,
    })),
    statement: {
      bankAmount: cycle.bankAmount,
      bankAmountUsd: cycle.bankAmountUsd,
      minimumPaymentMinor: cycle.minimumPaymentMinor,
      minimumPaymentUsdMinor: cycle.minimumPaymentUsdMinor,
      totalBalanceMinor: cycle.totalBalanceMinor,
      totalBalanceUsdMinor: cycle.totalBalanceUsdMinor,
      lineUsedMinor: cycle.lineUsedMinor,
      paidAmountMinor: cycle.paidAmountMinor,
      paidAmountUsdMinor: cycle.paidAmountUsdMinor,
      paidDate: cycle.paidDate,
      statementRegisteredAt: cycle.statementRegisteredAt,
    },
  };
}