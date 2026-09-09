const db = require("../config/db");
const prisma = db.getClient();

exports.createCreditCard = async (data) => {
    return prisma.creditCard.create({ data })
}

exports.getCreditCards = async (userId, filters) => {
    const result = await prisma.creditCard.findMany({
        where: { userId: parseInt(userId) }
    })
    return result;
}

exports.getCreditCardById = async (id) => {
  return prisma.creditCard.findUnique({ where: { id: parseInt(id) } });
};

exports.updateCreditCard = async (id, data) => {
  try {
    return await prisma.creditCard.update({
      where: { id: parseInt(id) },
      data,
    });
  } catch (error) {
    if (error.code === "P2025") {
      throw new Error("CreditCard not found");
    }
    throw error;
  }
};

exports.deleteCreditCard = async (id) => {
  try {
    //TODO:  prisma.$transaction([updateMany BillingCycle, updateMany Account, update CreditCard]) todos con mismo deletedAt
    await prisma.creditCard.delete({
      where: { id: parseInt(id) },
    });
  } catch (error) {
    if (error.code === "P2025") {
      throw new Error("Transaction not found");
    }
    throw error;
  }
};