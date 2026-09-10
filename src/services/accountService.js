const db = require("../config/db");
const { paginate } = require("../helpers/paginationHelper");
const prisma = db.getClient();

exports.create = async (data) => {
  const conflict = await prisma.account.findFirst({
    where: { name: data.name, type: data.type, userId: data.userId },
  });
  if (conflict) throw new Error("La cuenta con el mismo nombre y tipo ya existe");

  return prisma.account.create({ 
    data: {
      ...data,
      userId: parseInt(data.userId),
      creditCardId: data.creditCardId ? parseInt(data.creditCardId) : null,
    },
  });
};

exports.getById = async (id) => 
  prisma.account.findUnique({ where: { id: parseInt(id) } });

exports.getAll = async (userId) =>
  prisma.account.findMany({ where: { userId: parseInt(userId) }, });

exports.update = async (id, data) => {
  try {
    return await prisma.account.update({
      where: { id: parseInt(id) },
      data,
    });
  } catch (error) {
    if (error.code === "P2025") throw new Error("Account not found");
    throw error;
  }
};

exports.delete = async (id) => {
  try {
    await prisma.account.delete({ where: { id: parseInt(id) }, });
  } catch (error) {
    if (error.code === "P2025") throw new Error("Account not found");
    throw error;
  }
};
