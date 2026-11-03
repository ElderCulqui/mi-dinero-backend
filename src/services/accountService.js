const db = require("../config/db");
const { parseMinor } = require("../helpers/money");
const { computeAccountBalances } = require("../helpers/accountBalance");
const prisma = db.getClient();

const parseOptionalMinor = (value) => {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  return parseMinor(value);
};

const parseOpeningBalanceDate = (value) => {
  if (value === undefined) return undefined;
  if (value === null || value === "") {
    throw Object.assign(new Error("openingBalanceDate es obligatoria"), {
      status: 400,
    });
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw Object.assign(new Error("openingBalanceDate inválida"), {
      status: 400,
    });
  }

  return date;
};

const buildData = (data) => {
  const next = {
    ...data,
    openingBalanceMinor:
      data.openingBalanceMinor !== undefined
        ? parseOptionalMinor(data.openingBalanceMinor)
        : undefined,
    openingBalanceDate: parseOpeningBalanceDate(data.openingBalanceDate),
    creditLimit:
      data.creditLimit !== undefined
        ? parseOptionalMinor(data.creditLimit)
        : undefined,
  };

  if (data.creditCardId !== undefined) {
    next.creditCardId = data.creditCardId
      ? parseInt(data.creditCardId, 10)
      : null;
  }

  delete next.id;
  delete next.balance;
  delete next.openingBalance;
  delete next.currentBalance;
  delete next.currentBalanceMinor;
  delete next.debtMinor;
  delete next.availableCreditMinor;

  return next;
};

const getTotals = async (account) => {
  const rows = await prisma.transaction.groupBy({
    by: ["type"],
    where: {
      accountId: account.id,
      userId: account.userId,
      deletedAt: null,
      status: "ejecutado",
      date: { gte: account.openingBalanceDate },
    },
    _sum: { amount: true },
  });

  return rows.reduce(
    (totals, row) => {
      if (row.type === "ingreso") totals.income = row._sum.amount ?? 0n;
      if (row.type === "egreso") totals.expense = row._sum.amount ?? 0n;
      return totals;
    },
    { income: 0n, expense: 0n },
  );
};

const withBalances = async (account) => {
  const totals = await getTotals(account);
  return { ...account, ...computeAccountBalances(account, totals) };
};

exports.create = async (data) => {
  const conflict = await prisma.account.findFirst({
    where: { name: data.name, type: data.type, userId: data.userId },
  });
  if (conflict) throw new Error("La cuenta con el mismo nombre y tipo ya existe");

  const account = await prisma.account.create({
    data: {
      ...buildData(data),
      userId: parseInt(data.userId),
      creditCardId: data.creditCardId ? parseInt(data.creditCardId) : null,
    },
  });

  return withBalances(account);
};

exports.getById = async (id) => {
  const account = await prisma.account.findUnique({ where: { id: parseInt(id) } });
  if (!account) return null;
  return withBalances(account);
};

exports.getAll = async (userId) => {
  const accounts = await prisma.account.findMany({
    where: { userId: parseInt(userId) },
  });

  return Promise.all(accounts.map(withBalances));
};

exports.update = async (id, data) => {
  try {
    const account = await prisma.account.update({
      where: { id: parseInt(id) },
      data: buildData(data),
    });

    return withBalances(account);
  } catch (error) {
    if (error.code === "P2025") throw new Error("Account not found");
    throw error;
  }
};

exports.delete = async (id) => {
  try {
    await prisma.account.delete({ where: { id: parseInt(id) } });
  } catch (error) {
    if (error.code === "P2025") throw new Error("Account not found");
    throw error;
  }
};
