const axios = require("axios");
const db = require("@/config/db");

const prisma = db.getClient();

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
  side = "sell",
) => {
  const existingRate = await prisma.exchangeRate.findFirst({
    where: {
      baseCurrency,
      targetCurrency,
      source,
      side,
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
      baseCurrency,
      targetCurrency,
      source,
      rate,
      side,
      date: new Date(),
    },
  });
};

exports.getLatestExchangeRate = async (baseCurrency, targetCurrency, side = "sell") => {
  return prisma.exchangeRate.findFirst({
    where: {
      baseCurrency,
      targetCurrency,
      side,
    },
    orderBy: {
      date: "desc",
    },
  });
};

exports.getRateByDate = async (baseCurrency, targetCurrency, date, side = "sell") => {
  return prisma.exchangeRate.findFirst({
    where: {
      baseCurrency,
      targetCurrency,
      side,
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
