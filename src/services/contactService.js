const db = require("@/config/db");
const prisma = db.getClient();

exports.create = async (data) => {
    const conflict = await prisma.contact.findFirst({
        where: { name: data.name, userId: data.userId },
    })
    if (conflict) throw new Error("Ya existe un contacto con el mismo nombre");

    return prisma.contact.create({
        data: { ...data, userId: parseInt(data.userId) },
    });
};

exports.getById = async (id) =>
    prisma.contact.findUnique({ where: { id: parseInt(id) } });

exports.getAll = async (userId) => 
    prisma.contact.findMany({ where: { userId: parseInt(userId) } });

exports.update = async(id, data) => {
    try {
        return await prisma.contact.update({ where: { id: parseInt(id) }, data });
    } catch (error) {
        if (error.code === "P2025") throw new Error("Contact not found");
        throw error;
    }
}

exports.delete = async(id) => {
    try {
        return await prisma.contact.delete({ where: { id: parseInt(id) } });
    } catch (error) {
        if (error.code === "P2025") throw new Error("Contact not found");
        throw error;
    }
}