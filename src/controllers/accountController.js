const accountService = require("../services/accountService");

const createAccount = async (req, res) => {
  try {
    const account = await accountService.createAccount(req.body);
    res.status(201).json(account);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = { createAccount };
