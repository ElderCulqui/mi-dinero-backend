const { convertFromBase } = require("@/helpers/currencyHelper");
const { parseMinor } = require("@/helpers/money");
const db = require("../config/db");
const prisma = db.getClient();

exports.create = async (data) => {
    data.creditCardId = parseInt(data.creditCardId);
    if (data.bankAmount !== undefined && data.bankAmount !== null && data.bankAmount !== "") {
        data.bankAmount = parseMinor(data.bankAmount);
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
        status: data.status,
      },
    });
  } catch (error) {
    if (error.code === "P2025") throw new Error("BillingCycle not found");
    throw error;
  }
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

  return {
    billingCycle: cycle,
    bankCurrency,
    totalAmountBase,
    totalBankAmount,
    transactionCount: transactions.length,
    transactions,
  };
}