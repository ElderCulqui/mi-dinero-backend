const exchangeRateService = require("@/services/exchangeRateService");

const syncManually = async (req, res) => {
  try {
    const { buy, sell } = await exchangeRateService.fetchFromBCRP();
    await exchangeRateService.saveExchangeRate("USD", "PEN", buy, "SUNAT");
    res.json({ message: "Exchange rate synced successfully", buy, sell });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Error syncing exchange rate: " + error.message });
  }
};

const getLatestRate = async (req, res) => {
  try {
    const { base, target } = req.query;
    const rate = await exchangeRateService.getLatestExchangeRate(base, target);
    if (!rate) {
      return res.status(404).json({ error: "No exchange rate found" });
    }
    res.json(rate);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Error fetching latest exchange rate: " + error.message });
  }
};

module.exports = {
  syncManually,
  getLatestRate,
};
