const db = require("@/config/db");
const prisma = db.getClient();

exports.create = async (data) => {
  const conflict = await prisma.category.findFirst({
    where: {
      name: data.name,
      type: data.type,
      userId: data.userId,
    },
  });

  if (conflict) {
    throw new Error(
      "La categoría con el mismo nombre y tipo ya existe para este usuario",
    );
  }

  return prisma.category.create({ 
    data: { ...data, userId: parseInt(data.userId) }
  });
};

exports.getById = async (id) => 
  prisma.category.findUnique({ where: { id: parseInt(id) } });

exports.getAll = async (userId) =>
  prisma.category.findMany({ where: { userId: parseInt(userId) } });

exports.update = async (id, data) => {
  try {
    return await prisma.category.update({
      where: { id: parseInt(id) },
      data,
    });
  } catch (error) {
    if (error.code === "P2025") throw new Error("Category not found");
    throw error;
  }
};

exports.delete = async (id) => {
  try {
    await prisma.category.delete({ where: { id: parseInt(id) }, });
  } catch (error) {
    if (error.code === "P2025") throw new Error("Category not found");
    throw error;
  }
};
