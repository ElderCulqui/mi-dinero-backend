const { convertToBase } = require("../helpers/currencyHelper");
const db = require("../config/db");
const { AccountType } = require("@prisma/client");
const { paginate } = require("@/helpers/paginationHelper");
const prisma = db.getClient();

const safeParseInt = (v) => {
  if (v === undefined || v === null || v === "") return undefined;
  const n = parseInt(v);
  return isNaN(n) ? undefined : n;
};

const transactionRelations = {
  account: {
    select: {
      id: true,
      name: true,
      currency: true,
    },
  },
  category: {
    select: {
      id: true,
      name: true,
      color: true,
      type: true,
    },
  },
}

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
      },
      include: transactionRelations,
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

    const orderBy = [
      { date: "desc" },
      { id: "desc" },
    ];

    const pageWasSent = filters.page !== undefined;
    const pageSize = filters.pageSize ? Number(filters.pageSize) : 10;

    if (!pageWasSent) {
      return prisma.transaction.findMany({
        where,
        orderBy,
        take: pageSize,
        include: transactionRelations
      })
    }

    const page = Number(filters.page);

    return paginate("transaction", page, pageSize, {
      where,
      orderBy,
      include: transactionRelations,
    });
}

exports.getById = async (id) => {
  return prisma.transaction.findUnique({ 
    where: { id: parseInt(id) },
    include: transactionRelations
  });
};

exports.update = async (id, data) => {
  const txnId = parseInt(id);
  const current = await prisma.transaction.findUnique({ where: { id: txnId } });
  if (!current) throw new Error("Transaction not found");

  const accountId = data.accountId !== undefined ? safeParseInt(data.accountId) : current.accountId;
  const account = await prisma.account.findUnique({ where: { id: accountId }});
  if (!account) throw new Error("Account no existe o fue eliminada");

  const amount = data.amount !== undefined ? Number(data.amount) : current.amount;
  const date = data.date !== undefined ? new Date(data.date) : current.date;
  const amountBase = await convertToBase(amount, account.currency, date);

  let billingCycleId = null;
  if (account.type == AccountType.tarjeta_credito && account.creditCardId) {
    const cycle = await resolveBillingCycle(account.creditCardId, date)
    billingCycleId = cycle ? cycle.id : null;
  }
  if (data.billingCycleId !== undefined) {
    billingCycleId = safeParseInt(data.billingCycleId) ?? null;
  }

  const payload = {
    type: data.type ?? current.type,
    amount,
    date,
    amountBase,
    description: data.description ?? current.description,
    status: data.status ?? current.status,
    accountId,
    categoryId: data.categoryId !== undefined ? safeParseInt(data.categoryId) : current.categoryId,
    billingCycleId,
  }
  
  try {
    return await prisma.transaction.update({ where: { id: txnId }, data: payload });
  } catch (error) {
    if (error.code === "P2025") throw new Error("Transaction not found");
    throw error;
  }
};

exports.reassignBillingCycle = async (id, billingCycleId) => {
  const txnId = parseInt(id);
  const cycleId = safeParseInt(billingCycleId) ?? null;
  
  const txn = await prisma.transaction.findUnique({ where: { id: txnId } });
  if (!txn) throw new Error("Transaction not found");

  const cycle = await prisma.billingCycle.findUnique({ where: { id: cycleId } });
  if (!cycle) throw new Error("BillingCycle not found");

  if (cycle.userId !== txn.userId) throw new Error("BillingCycle no pertenece al usuario");

  return prisma.transaction.update({
    where: { id: txnId},
    data: { billingCycleId: cycleId },
  });
}

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