const service = require("@/services/installmentPlanService");

const wrap = (fn) => async (req, res, next) => {
  try { res.json(await fn(req, res, next)); } catch (e) { next(e); }
};

module.exports = {
  create: wrap((req) => service.create(req.user.id, req.body)),
  getAll: wrap((req) => service.getAll(req.user.id)),
  getById: wrap((req) => service.getById(req.user.id, req.params.id)),
  update: wrap((req) => service.update(req.user.id, req.params.id, req.body)),
  remove: wrap(async (req) => { await service.remove(req.user.id, req.params.id); return { ok: true }; }),
  getSummary: wrap((req) => service.getSummary(req.user.id, req.params.id)),
  payInstallment: wrap((req) =>
    service.payInstallment(req.user.id, req.params.id, req.params.installmentId, req.body)
  ),
};