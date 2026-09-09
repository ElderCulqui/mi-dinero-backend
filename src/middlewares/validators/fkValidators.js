const { body, param } = require("express-validator");
const db = require("@/config/db");
const prisma = db.getClient();

const formSource = (source) => {
    if (source === "param") return param;
    if (source === "query") return require("express-validator").query;
    return body;
}

const existsActive = (
    modelName, 
    source = "body", 
    field = `${modelName}Id`, 
    customName
) => {
    const src = formSource(source);
    
    return src(field)
        .isInt().withMessage(`${field} debe ser entero`).bail()
        .custom(async (value) => {
            const row = await prisma[modelName].findUnique({
                where: { id: parseInt(value) },
            });
            if (!row) throw new Error(`${customName || modelName} no existe`);
            if (row.deletedAt) throw new Error(`${customName || modelName} eliminado`);
            return true;
        });
}

const existsActiveOwnedByUser = (
    modelName, 
    source = "body", 
    field = `${modelName}Id`, 
    customName
) => {
    const src = formSource(source);

    return src(field)
        .isInt().withMessage(`${field} debe ser entero`).bail()
        .custom(async (value, { req }) => {
             const row = await prisma[modelName].findUnique({
                where: { id: parseInt(value)},
             });
             if (!row) throw new Error(`${customName || modelName} no existe`);
             if (row.deletedAt) throw new Error(`${customName || modelName} eliminado`);
             if (row.userId !== req.user.id) {
                throw new Error(`${customName || modelName} no pertence al usuario`);
             }
             return true;
        });
}

module.exports = { existsActive, existsActiveOwnedByUser };