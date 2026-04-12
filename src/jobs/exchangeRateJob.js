const cron = require("node-cron");
const exchangeRateService = require("@/services/exchangeRateService");

cron.schedule("0 6 * * *", async () => {
  try {
    const { buy, sell } = await exchangeRateService.fetchFromSunat();
    await exchangeRateService.saveExchangeRate("USD", "PEN", buy, "SUNAT");
    console.log(`Exchange rate saved: USD to PEN - Buy: ${buy}, Sell: ${sell}`);
  } catch (error) {
    console.error("Error fetching or saving exchange rate:", error);
  }
});
