const db = require("../config/db");
const { getRateByDate } = require("../services/exchangeRateService");

const prisma = db.getClient();

exports.convertToBase = async (amount, currency, date) => {
    if (currency === "PEN") return amount;
    const exchangeRate = await getRateByDate(currency, "PEN", date);
    if (!exchangeRate) throw new Error(`No hay tipo de cambio ${currency}->PEN para la fecha`);

    return amount * exchangeRate.rate;
}