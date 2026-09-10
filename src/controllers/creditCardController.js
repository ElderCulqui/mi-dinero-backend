const creditCardService = require("@/services/creditCardService");

const create = async (req, res) => {
  try {
    const data = { ...req.body, userId: req.user.id };
    const card = await creditCardService.create(data);
    res.status(201).json(card);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getById = async (req, res) => res.json(req.ownedResource);

const getAll = async (req, res) => {
  try {
    const cards = await creditCardService.getAll(req.user.id, req.query);
    res.json(cards);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const update = async (req, res) => {
  try {
    const updated = await creditCardService.update(
      req.params.id,
      req.body,
    );
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const destroy = async (req, res) => {
  try {
    await creditCardService.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  create,
  getAll,
  getById,
  update,
  destroy,
};
