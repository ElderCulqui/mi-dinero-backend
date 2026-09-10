const { convertToBase } = require("@/helpers/currencyHelper");
const db = require("../config/db");
const { AccountType } = require("@prisma/client");
const prisma = db.getClient();

const safeParseInt = (v) => {
  if (v === undefined || v === null || v === "") return undefined;
  const n = parseInt(v);
  return isNaN(n) ? undefined : n;
};

exports.create = async (data) => {
    const account = await prisma.account.findUnique({ 
      where: { id: safeParseInt(data.accountId) } 
    })
    if (!account) throw new Error("Account no existe o fue eliminada");
    const amountBase = await convertToBase(data.amount, account.currency, data.date)

    let billingCycleId = null
    if (account.type === AccountType.tarjeta_credito && account.creditCardId) {
        const cycle = await resolveBillingCycle(account.creditCardId, data.date);
        billingCycleId = cycle ? cycle.id : null;
    }

    return prisma.transaction.create({ 
      data: { 
        ...data, 
        userId: safeParseInt(data.userId),
        accountId: safeParseInt(data.accountId),
        categoryId: safeParseInt(data.categoryId),
        billingCycleId: safeParseInt(data.billingCycleId) ?? billingCycleId,
        amountBase 
      } 
    })
}

exports.getAll = async (userId, filters = {}) => {
    const where = { userId: safeParseInt(userId) };
    if (filters.type) where.type = filters.type;
    if (filters.accountId) where.accountId = safeParseInt(filters.accountId);
    if (filters.categoryId) where.categoryId = safeParseInt(filters.categoryId);
    if (filters.source) where.source = filters.source;
    if (filters.from || filters.to) {
      where.date = {};
      if (filters.from) where.date.gte = new Date(filters.from);
      if (filters.to) where.date.lte = new Date(filters.to);
    }
    return prisma.transaction.findMany({ where });
}

exports.getById = async (id) => {
  return prisma.transaction.findUnique({ where: { id: parseInt(id) } });
};

exports.delete = async (id) => {
  try {
    await prisma.transaction.delete({ where: { id: parseInt(id) } });
  } catch (error) {
    if (error.code === "P2025") throw new Error("Transaction not found");
    throw error;
  }
};

async function resolveBillingCycle(creditCardId, date) {
  return prisma.billingCycle.findFirst({
    where: {
      creditCardId,
      periodStart: { lte: date },
      periodEnd: { gte: date }
    },
  });
}