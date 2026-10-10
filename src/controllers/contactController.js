const contactService = require("@/services/contactService");

const create = async (req, res) => {
  try {
    const data = { ...req.body, userId: req.user.id };
    const contact = await contactService.create(data);
    res.status(201).json(contact);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getById = async (req, res) => res.json(req.ownedResource);

const getAll = async (req, res) => {
  try {
    const contacts = await contactService.getAll(req.user.id);
    res.json(contacts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const update = async (req, res) => {
  try {
    const updatedContact = await contactService.update(
      req.params.id,
      req.body,
    );
    res.json(updatedContact);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const destroy = async (req, res) => {
  try {
    await contactService.delete(req.params.id);
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