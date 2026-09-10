const transactionService = require("@/services/transactionService");

const create = async (req, res) => {
  try {
    const data = { ...req.body, userId: req.user.id };
    const transaction = await transactionService.create(data);
    res.status(201).json(transaction);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getById = async (req, res) => res.json(req.ownedResource);

const getAll = async (req, res) => {
  try {
    const transactions = await transactionService.getAll(req.user.id, req.query);
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const destroy = async (req, res) => {
  try {
    await transactionService.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  create,
  getById,
  getAll,
  destroy
};
