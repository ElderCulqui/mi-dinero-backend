const categoryService = require("@/services/categoryService");

const create = async (req, res) => {
  try {
    const data = { ...req.body, userId: req.user.id };
    const category = await categoryService.create(data);
    res.status(201).json(category);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getById = async (req, res) => res.json(req.ownedResource);

const getAll = async (req, res) => {
  try {
    const categories = await categoryService.getAll(req.user.id);
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const update = async (req, res) => {
  try {
    const updatedCategory = await categoryService.update(
      req.params.id,
      req.body,
    );
    res.json(updatedCategory);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const destroy = async (req, res) => {
  try {
    await categoryService.delete(req.params.id);
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
