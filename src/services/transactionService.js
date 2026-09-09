const { convertToBase } = require("@/helpers/currencyHelper");
const db = require("../config/db");
const { AccountType } = require("@prisma/client");
const prisma = db.getClient();

exports.createTransaction = async (data) => {

    const account = await prisma.account.findUnique({ where: { id: parseInt(data.accountId) } })
    const amountBase = await convertToBase(data.amount, account.currency, data.date)

    if (account.type === AccountType.tarjeta_credito) {
        const cycle = await resolveBillingCycle(account.id, data.date);
        data.billingCycleId = cycle ? parseInt(cycle.id) : null;
    }
    data.accountId = parseInt(data.accountId);
    data.categoryId = parseInt(data.categoryId);

    return prisma.transaction.create({ data: { ...data, amountBase } })
}

exports.getTransactions = async (userId, filters) => {
    //TODO: Agregar los filtros opcionales type, accountId, categoryId, source, rango date.
    const result = await prisma.transaction.findMany({
        where: { userId: parseInt(userId) }
    })
    return result;
}

exports.getTransactionById = async (id) => {
  return prisma.transaction.findUnique({ where: { id: parseInt(id) } });
};

exports.deleteTransaction = async (id) => {
  try {
    await prisma.transaction.delete({
      where: { id: parseInt(id) },
    });
  } catch (error) {
    if (error.code === "P2025") {
      throw new Error("Transaction not found");
    }
    throw error;
  }
};

async function resolveBillingCycle(accountId, date) {
  const account = await prisma.account.findUnique({ where: { id: accountId }});
  if (!account?.creditCardId) return null;

  return prisma.billingCycle.findFirst({
    where: {
      creditCardId: account.creditCardId,
      periodStart: { lte: date },
      periodEnd: { gte: date }
    }
  })
}