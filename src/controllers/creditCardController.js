const creditCardService = require("@/services/creditCardService");

const createCreditCard = async (req, res) => {
  try {
    const userId = req.user.id;
    const data = { ...req.body, userId };
    const creditCard = await creditCardService.createCreditCard(data);
    res.status(201).json(creditCard);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getCreditCard = async (req, res) => {
  try {
    const creditCard = await creditCardService.getCreditCardById(req.params.id);
    if (!creditCard) {
      return res.status(404).json({ error: "CreditCard not found" });
    }
    res.json(creditCard);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getCreditCards = async (req, res) => {
  try {
    const userId = req.user.id;
    const creditCards = await creditCardService.getCreditCards(userId);
    res.json(creditCards);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateCreditCard = async (req, res) => {
  try {
    const updatedCreditCard = await creditCardService.updateCreditCard(
      req.params.id,
      req.body,
    );
    res.json(updatedCreditCard);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const deleteCreditCard = async (req, res) => {
  try {
    await creditCardService.deleteCreditCard(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createCreditCard,
  getCreditCard,
  getCreditCards,
  updateCreditCard,
  deleteCreditCard,
};
