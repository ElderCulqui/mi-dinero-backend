const billingCycleService = require("@/services/billingCycleService");

const create = async (req, res) => {
  try {
    const data = { ...req.body, userId: req.user.id };
    const bc = await billingCycleService.create(data);
    res.status(201).json(bc);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getById = async (req, res) => {
  res.json(req.ownedResource);
};

const getAll = async (req, res) => {
  try {
    const cycles = await billingCycleService.getByUser(req.user.id);
    res.json(cycles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


const destroy = async (req, res) => {
  try {
    await billingCycleService.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  create,
  getAll,
  getById,
  destroy,
};
