const db = require("@/config/db");
const prisma = db.getClient();

const requireOwnership = (
    modelName, 
    { idParam = "id", userIdField = "userId", notFoundMsg } = {}
) => {
    return async (req, res, next) => {
        try {
            const id = parseInt(req.params[idParam]);
            if (isNaN(id)) {
                return res.status(400).json({ error: `${idParam} inválido`});
            }
            const row = await prisma[modelName].findUnique({ where: { id } });
            if (!row) {
                return res.status(404).json({ error: notFoundMsg || `${modelName} not found`});
            }
            if (row[userIdField] !== req.user.id) {
                return res.status(403).json({ error: "No autorizado" });
            }
            req.ownedResource = row;
            next();
        } catch (err) {
            next(err);
        }
    };
};

module.exports = { 
    requireOwnership 
};