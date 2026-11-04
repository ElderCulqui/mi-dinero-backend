const { getRateForDate } = require("../services/exchangeRateService");
const { multiplyMinorByRate, divideMinorByRate } = require("./money");

function missingRateError(baseCurrency, targetCurrency) {
    return Object.assign(
        new Error(`No hay ningún tipo de cambio ${baseCurrency}->${targetCurrency} registrado`),
        { statusCode: 400 },
    );
}

async function convertToBase(amountMinor, currency, date) {
    if (currency === "PEN") return BigInt(amountMinor);
    const exchangeRate = await getRateForDate(currency, "PEN", date, "sell");
    if (!exchangeRate) throw missingRateError(currency, "PEN");

    return multiplyMinorByRate(amountMinor, exchangeRate.rate);
}

async function convertFromBase(amountBaseMinor, targetCurrency, date) {
    if (targetCurrency === "PEN") return BigInt(amountBaseMinor);
    const direct = await getRateForDate("PEN", targetCurrency, date, "sell");
    if (direct) return multiplyMinorByRate(amountBaseMinor, direct.rate);
    const inverse = await getRateForDate(targetCurrency, "PEN", date, "sell");
    if (!inverse) throw missingRateError("PEN", targetCurrency);

    return divideMinorByRate(amountBaseMinor, inverse.rate);
}

module.exports = {
    convertToBase,
    convertFromBase,
};
