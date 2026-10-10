const service = require("@/services/transferService");

const create = async (req, res) => {
  try {
    const data = { ...req.body, userId: req.user.id };
    const transfer = await service.create(data);
    res.status(201).json(transfer);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getById = async (req, res) => res.json(await service.getById(req.params.id));

const getAll = async (req, res) => {
  try {
    const transfers = await service.getAll(req.user.id);
    res.json(transfers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const update = async (req, res) => {
  try {
    const updatedTransfer = await service.update(req.params.id,req.body);
    res.json(updatedTransfer);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const destroy = async (req, res) => {
  try {
    await service.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  create,
  getById,
  getAll,
  update,
  destroy,
};
