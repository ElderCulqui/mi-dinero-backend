const db = require("../config/db");
const { paginate } = require("../helpers/paginationHelper");
const prisma = db.getClient();

exports.createAccount = async (data) => {
  const conflict = await prisma.account.findFirst({
    where: {
      name: data.name,
      type: data.type,
    },
  });
  if (conflict) {
    throw new Error("La cuenta con el mismo nombre y tipo ya existe");
  }

  return prisma.account.create({ data });
};

exports.getAccountById = async (id) => {
  return prisma.account.findUnique({ where: { id: parseInt(id) } });
};

exports.getAccounts = async (userId) => {
  // const result = await paginate("account");
  const result = await prisma.account.findMany({
    where: { userId: parseInt(userId) },
  });
  return result;
};

exports.updateAccount = async (id, data) => {
  try {
    return await prisma.account.update({
      where: { id: parseInt(id) },
      data,
    });
  } catch (error) {
    if (error.code === "P2025") {
      throw new Error("Account not found");
    }
    throw error;
  }
};

exports.deleteAccount = async (id) => {
  try {
    await prisma.account.delete({
      where: { id: parseInt(id) },
    });
  } catch (error) {
    if (error.code === "P2025") {
      throw new Error("Account not found");
    }
    throw error;
  }
};
