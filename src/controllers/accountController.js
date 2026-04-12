const accountService = require("@/services/accountService");

const createAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    const data = { ...req.body, userId };
    const account = await accountService.createAccount(data);
    res.status(201).json(account);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getAccount = async (req, res) => {
  try {
    const account = await accountService.getAccountById(req.params.id);
    if (!account) {
      return res.status(404).json({ error: "Account not found" });
    }
    res.json(account);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getAccounts = async (req, res) => {
  try {
    const userId = req.user.id;
    const accounts = await accountService.getAccounts(userId);
    res.json(accounts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateAccount = async (req, res) => {
  try {
    const updatedAccount = await accountService.updateAccount(
      req.params.id,
      req.body,
    );
    res.json(updatedAccount);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const deleteAccount = async (req, res) => {
  try {
    await accountService.deleteAccount(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createAccount,
  getAccount,
  getAccounts,
  updateAccount,
  deleteAccount,
};
