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