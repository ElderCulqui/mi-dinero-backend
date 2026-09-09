const transactionService = require("@/services/transactionService");

const createTransaction = async (req, res) => {
  try {
    const userId = req.user.id;
    const data = { ...req.body, userId };
    const transaction = await transactionService.createTransaction(data);
    res.status(201).json(transaction);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getTransaction = async (req, res) => {
  try {
    const transaction = await transactionService.getTransactionById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }
    res.json(transaction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getTransactions = async (req, res) => {
  try {
    const userId = req.user.id;
    const transactions = await transactionService.getTransactions(userId);
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


const deleteTransaction = async (req, res) => {
  try {
    await transactionService.deleteTransaction(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createTransaction,
  getTransaction,
  getTransactions,
  deleteTransaction,
};
