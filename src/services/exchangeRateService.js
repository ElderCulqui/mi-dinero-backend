const axios = require("axios");
const db = require("@/config/db");

const prisma = db.getClient();

exports.fetchFromBCRP = async () => {
  try {
    const urlBCRP =
      "https://estadisticas.bcrp.gob.pe/estadisticas/series/api/PD04637PD/json";
    const response = await axios.get(urlBCRP);

    const latestData = response.data.periods[response.data.periods.length - 1];
    const rate = parseFloat(latestData.values[0]);

    return {
      buy: rate * 0.998, // Aproximación compra
      sell: rate * 1.002, // Aproximación venta
    };
  } catch (error) {
    throw new Error("Error fetching exchange rate from BCRP: " + error.message);
  }
};

exports.fetchFromSunat = async () => {
  try {
    const urlSunat = "https://api.apis.net.pe/v1/tipo-cambio-sunat";
    const response = await axios.get(urlSunat);
    const latestData = response.data;
    // console.log("Latest exchange rate from SUNAT:", latestData);

    return {
      buy: parseFloat(latestData.compra),
      sell: parseFloat(latestData.venta),
    };
  } catch (error) {
    throw new Error("Error fetching exchange rate from SUNAT: " + error);
  }
};

exports.saveExchangeRate = async (
  baseCurrency,
  targetCurrency,
  rate,
  source,
) => {
  const existingRate = await prisma.exchangeRate.findFirst({
    where: {
      baseCurrency,
      targetCurrency,
      source,
      date: {
        gte: new Date(new Date().setHours(0, 0, 0, 0)),
        lt: new Date(new Date().setHours(24, 0, 0, 0)),
      },
    },
  });

  if (existingRate) {
    return prisma.exchangeRate.update({
      where: { id: existingRate.id },
      data: { rate, date: new Date() },
    });
  }

  return prisma.exchangeRate.create({
    data: {
      baseCurrency: baseCurrency,
      targetCurrency: targetCurrency,
      source: source,
      rate: rate,
      date: new Date(),
    },
  });
};

exports.getLatestExchangeRate = async (baseCurrency, targetCurrency) => {
  return prisma.exchangeRate.findFirst({
    where: {
      baseCurrency,
      targetCurrency,
    },
    orderBy: {
      date: "desc",
    },
  });
};

exports.getRateByDate = async (baseCurrency, targetCurrency, date) => {
  return prisma.exchangeRate.findFirst({
    where: {
      baseCurrency,
      targetCurrency,
      date: {
        gte: new Date(new Date(date).setHours(0, 0, 0, 0)),
        lt: new Date(new Date(date).setHours(24, 0, 0, 0)),
      },
    },
    orderBy: {
      date: "desc",
    },
  });
};
