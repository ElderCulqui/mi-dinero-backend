const { convertFromBase } = require("@/helpers/currencyHelper");
const db = require("../config/db");
const prisma = db.getClient();

exports.create = async (data) => {
    data.creditCardId = parseInt(data.creditCardId);

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
        bankAmount: data.bankAmount !== undefined ? Number(data.bankAmount) : undefined,
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

  const totalAmountBase = transactions.reduce((sum, t) => sum + t.amountBase, 0);
  const bankCurrency = cycle.creditCard.bankCurrency || "PEN";

  let totalBankAmount = 0;
  for (const t of transactions) {
    totalBankAmount += await convertFromBase(t.amountBase, bankCurrency, t.date);
  }

  const round = (n) => Math.round(n * 100) / 100;

  return {
    billingCycle: cycle,
    bankCurrency,
    totalAmountBase: round(totalAmountBase),
    totalBankAmount: round(totalBankAmount),
    transactionCount: transactions.length,
    transactions,
  };
}