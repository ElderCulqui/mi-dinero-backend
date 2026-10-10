const { getRateByDate } = require("../services/exchangeRateService");

async function convertToBase(amount, currency, date) {
    if (currency === "PEN") return amount;
    const exchangeRate = await getRateByDate(currency, "PEN", date, "sell");
    if (!exchangeRate) throw new Error(`No hay tipo de cambio ${currency}->PEN para la fecha`);

    return amount * exchangeRate.rate;
}

async function convertFromBase(amountBase, targetCurrency, date) {
    if (targetCurrency === "PEN") return amountBase;
    const direct = await getRateByDate("PEN", targetCurrency, date, "sell");
    if (direct) return amountBase * direct.rate;
    const inverse = await getRateByDate(targetCurrency, "PEN", date, "sell");
    if (!inverse) throw new Error(`No hay tipo de cambio PEN->${targetCurrency} para la fecha`);

    return amountBase / inverse.rate;
}

module.exports = {
    convertToBase, 
    convertFromBase
}