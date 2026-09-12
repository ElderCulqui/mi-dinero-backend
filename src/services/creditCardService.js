const db = require("../config/db");
const prisma = db.getClient();

const DEFAULT_CURRENCY = "PEN";

const toInt = (v) => (v === undefined || v === null ? v : parseInt(v));

exports.create = async (data) => {
    return prisma.creditCard.create({ 
      data: {
        ...data,
        bankCurrency: data.bankCurrency || DEFAULT_CURRENCY,
        userId: toInt(data.userId)
      },
    });
};

exports.getAll = async (userId, filters = {}) => {
  const where = { userId: parseInt(userId)};
  
  if (filters.isActive !== undefined) where.isActive = filters.isActive === "true" || filters.isActive === true;
  if (filters.name) where.name = { contains: filters.name, mode: "insensitive" };
  
  return prisma.creditCard.findMany({ where });
}

exports.getById = async (id) => {
  return prisma.creditCard.findUnique({ where: { id: parseInt(id) } });
};

exports.update = async (id, data) => {
  try {
    return await prisma.creditCard.update({
      where: { id: parseInt(id) },
      data,
    });
  } catch (error) {
    if (error.code === "P2025") throw new Error("CreditCard not found");
    throw error;
  }
};

exports.delete = async (id) => {
  const cardId = parseInt(id);
  const now = new Date();
  try {
    await prisma.$transaction([
      prisma.billingCycle.updateMany({
        where: { creditCardId: cardId, deletedAt: null },
        data: { deletedAt: now },
      }),
      prisma.account.updateMany({
        where: { creditCardId: cardId, deletedAt: null },
        data: { deletedAt: now },
      }),
      prisma.creditCard.update({
        where: { id: cardId },
        data: { deletedAt: now },
      }),
    ]);
  } catch (error) {
    if (error.code === "P2025") {
      throw new Error("CreditCard not found");
    }
    throw error;
  }
};