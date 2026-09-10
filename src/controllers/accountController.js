const accountService = require("@/services/accountService");

const create = async (req, res) => {
  try {
    const data = { ...req.body, userId: req.user.id };
    const account = await accountService.create(data);
    res.status(201).json(account);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getById = async (req, res) => res.json(req.ownedResource);

const getAll = async (req, res) => {
  try {
    const accounts = await accountService.getAll(req.user.id);
    res.json(accounts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const update = async (req, res) => {
  try {
    const updatedAccount = await accountService.update(req.params.id,req.body);
    res.json(updatedAccount);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const destroy = async (req, res) => {
  try {
    await accountService.delete(req.params.id);
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
