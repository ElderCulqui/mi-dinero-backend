const db = require("@/config/db");
const prisma = db.getClient();

exports.createCategory = async (data) => {
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

  return prisma.category.create({ data });
};

exports.getCategoryById = async (id) => {
  return prisma.category.findUnique({ where: { id: parseInt(id) } });
};

exports.getCategories = async (userId) => {
  return prisma.category.findMany({ where: { userId } });
};

exports.updateCategory = async (id, data) => {
  try {
    return await prisma.category.update({
      where: { id: parseInt(id) },
      data,
    });
  } catch (error) {
    if (error.code === "P2025") {
      throw new Error("Category not found");
    }
    throw error;
  }
};

exports.deleteCategory = async (id) => {
  try {
    await prisma.category.delete({
      where: { id: parseInt(id) },
    });
  } catch (error) {
    if (error.code === "P2025") {
      throw new Error("Category not found");
    }
    throw error;
  }
};
