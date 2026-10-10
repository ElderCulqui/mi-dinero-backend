const service = require("@/services/transactionShareService");

const split = async (req, res) => {
  try {
    const shares = await service.split(req.params.id, req.user.id, req.body.shares);
    res.status(201).json(shares);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getByTransaction = async (req, res) => {
  try {
    const shares = await service.getByTransaction(req.params.id);
    res.json(shares);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const markCollected = async (req, res) => {
  try {
    const share = await service.markCollected(req.params.id, req.body);
    res.json(share);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = { 
    split, 
    getByTransaction, 
    markCollected 
};