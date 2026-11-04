const service = require("@/services/recurringExpenseService");

const wrap = (fn) => async (req, res, next) => {
    try {
        res.json(await fn(req, res, next));
    } catch (error) {
        if (error.status) return res.status(error.status).json({ error: error.message });
        next(error);
    }
};

const create = async (req, res, next) => {
    try {
        const recurring = await service.create(req.user.id, req.body);
        res.status(201).json(recurring);
    } catch (error) {
        if (error.status) return res.status(error.status).json({ error: error.message });
        next(error);
    }
};

module.exports = {
    create,
    getAll: wrap((req) => service.getAll(req.user.id)),
    getById: wrap((req) => service.getById(req.user.id, req.params.id)),
    update: wrap((req) => service.update(req.user.id, req.params.id, req.body)),
    remove: wrap(async (req) => {
        await service.remove(req.user.id, req.params.id);
        return { ok: true };
    }),
};
