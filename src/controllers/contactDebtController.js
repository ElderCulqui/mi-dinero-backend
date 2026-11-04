const service = require("@/services/contactDebtService");

const wrap = (fn) => async (req, res, next) => {
    try {
        res.json(await fn(req, res, next));
    } catch (error) {
        if (error.status) {
            return res.status(error.status).json({ error: error.message });
        }
        next(error);
    }
};

const create = async (req, res, next) => {
    try {
        const debt = await service.create(req.user.id, req.params.id, req.body);
        res.status(201).json(debt);
    } catch (error) {
        if (error.status) {
            return res.status(error.status).json({ error: error.message });
        }
        next(error);
    }
};

module.exports = {
    create,
    getByContact: wrap((req) => service.getByContact(req.user.id, req.params.id)),
    getSummary: wrap((req) => service.getSummary(req.user.id, req.params.id)),
    markPaid: wrap((req) => service.markPaid(req.user.id, req.params.id, req.body)),
    remove: wrap(async (req) => {
        await service.remove(req.user.id, req.params.id);
        return { ok: true };
    }),
};
