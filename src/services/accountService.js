const db = require("../config/db");
const { parseMinor } = require("../helpers/money");
const { computeAccountBalances } = require("../helpers/accountBalance");
const {
  DEFAULT_TIMEZONE,
  normalizeTimeZone,
  startOfDayUtc,
} = require("../helpers/timezone");
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

const getTotals = async (account, timeZone = DEFAULT_TIMEZONE) => {
  const rows = await prisma.transaction.groupBy({
    by: ["type"],
    where: {
      accountId: account.id,
      userId: account.userId,
      deletedAt: null,
      status: "ejecutado",
      date: {
        gte: startOfDayUtc(account.openingBalanceDate, timeZone),
      },
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

const getUserTimeZone = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: parseInt(userId) },
    select: { timezone: true },
  });
  return normalizeTimeZone(user?.timezone);
};

const withBalances = async (
  account,
  statementLineUsedMinor = null,
  timeZone = DEFAULT_TIMEZONE,
) => {
  const totals = await getTotals(account, timeZone);
  const balances = computeAccountBalances(account, totals);

  if (
    account.type === "tarjeta_credito" &&
    statementLineUsedMinor !== null &&
    statementLineUsedMinor !== undefined &&
    account.creditLimit !== null &&
    account.creditLimit !== undefined
  ) {
    balances.availableCreditMinor =
      account.creditLimit - statementLineUsedMinor;
  }

  return { ...account, ...balances };
};

const getLatestStatementByCard = async (userId, cardIds) => {
  if (cardIds.length === 0) return new Map();

  const cycles = await prisma.billingCycle.findMany({
    where: {
      userId,
      creditCardId: { in: cardIds },
      lineUsedMinor: { not: null },
    },
    orderBy: { periodEnd: "desc" },
    include: { creditCard: { select: { bankCurrency: true } } },
  });

  const latest = new Map();
  for (const cycle of cycles) {
    if (!latest.has(cycle.creditCardId)) latest.set(cycle.creditCardId, cycle);
  }
  return latest;
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

  return withBalances(account, null, await getUserTimeZone(account.userId));
};

exports.getById = async (id) => {
  const account = await prisma.account.findUnique({ where: { id: parseInt(id) } });
  if (!account) return null;

  let lineUsedMinor = null;
  if (account.creditCardId) {
    const latest = await getLatestStatementByCard(account.userId, [
      account.creditCardId,
    ]);
    const cycle = latest.get(account.creditCardId);
    if (cycle && cycle.creditCard.bankCurrency === account.currency) {
      lineUsedMinor = cycle.lineUsedMinor;
    }
  }

  return withBalances(
    account,
    lineUsedMinor,
    await getUserTimeZone(account.userId),
  );
};

exports.getAll = async (userId) => {
  const parsedUserId = parseInt(userId);
  const accounts = await prisma.account.findMany({
    where: { userId: parsedUserId },
  });

  const cardIds = [
    ...new Set(
      accounts
        .map((account) => account.creditCardId)
        .filter((cardId) => cardId !== null && cardId !== undefined),
    ),
  ];
  const latestStatements = await getLatestStatementByCard(
    parsedUserId,
    cardIds,
  );
  const timeZone = await getUserTimeZone(parsedUserId);

  return Promise.all(
    accounts.map((account) => {
      const cycle = account.creditCardId
        ? latestStatements.get(account.creditCardId)
        : null;
      const lineUsedMinor =
        cycle && cycle.creditCard.bankCurrency === account.currency
          ? cycle.lineUsedMinor
          : null;

      return withBalances(account, lineUsedMinor, timeZone);
    }),
  );
};

exports.update = async (id, data) => {
  try {
    const account = await prisma.account.update({
      where: { id: parseInt(id) },
      data: buildData(data),
    });

    return withBalances(
      account,
      null,
      await getUserTimeZone(account.userId),
    );
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
