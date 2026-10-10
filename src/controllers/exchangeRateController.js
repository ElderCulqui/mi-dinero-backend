const exchangeRateService = require("@/services/exchangeRateService");

const syncManually = async (req, res) => {
  try {
    const { buy, sell } = await exchangeRateService.fetchFromSunat();
    await exchangeRateService.saveExchangeRate("USD", "PEN", buy, "SUNAT", "buy");
    const rate = await exchangeRateService.saveExchangeRate("USD", "PEN", sell, "SUNAT", "sell");
    res.json(rate);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Error syncing exchange rate: " + error.message });
  }
};

const getLatestRate = async (req, res) => {
  try {
    const { baseCurrency, targetCurrency, side } = req.query;
    const rate = await exchangeRateService.getLatestExchangeRate(baseCurrency, targetCurrency, side);
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
