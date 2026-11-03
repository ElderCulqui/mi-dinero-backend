const { getRateByDate } = require("../services/exchangeRateService");
const { multiplyMinorByRate, divideMinorByRate } = require("./money");

async function convertToBase(amountMinor, currency, date) {
    if (currency === "PEN") return BigInt(amountMinor);
    const exchangeRate = await getRateByDate(currency, "PEN", date, "sell");
    if (!exchangeRate) throw new Error(`No hay tipo de cambio ${currency}->PEN para la fecha`);

    return multiplyMinorByRate(amountMinor, exchangeRate.rate);
}

async function convertFromBase(amountBaseMinor, targetCurrency, date) {
    if (targetCurrency === "PEN") return BigInt(amountBaseMinor);
    const direct = await getRateByDate("PEN", targetCurrency, date, "sell");
    if (direct) return multiplyMinorByRate(amountBaseMinor, direct.rate);
    const inverse = await getRateByDate(targetCurrency, "PEN", date, "sell");
    if (!inverse) throw new Error(`No hay tipo de cambio PEN->${targetCurrency} para la fecha`);

    return divideMinorByRate(amountBaseMinor, inverse.rate);
}

module.exports = {
    convertToBase,
    convertFromBase,
};
