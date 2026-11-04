const axios = require("axios");
const db = require("@/config/db");

const prisma = db.getClient();

const DAY_MS = 24 * 60 * 60 * 1000;

const utcDayStart = (value) => {
  const parsed = new Date(value);
  return new Date(
    Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()),
  );
};

const toDateOnly = (value) => utcDayStart(value).toISOString().slice(0, 10);

const warnFallback = (baseCurrency, targetCurrency, side, requested, used) => {
  console.warn(
    `[exchangeRate] Sin tipo de cambio ${baseCurrency}->${targetCurrency} (${side}) para ${toDateOnly(requested)}; usando ${toDateOnly(used.date)} = ${used.rate}`,
  );
};

exports.fetchFromSunat = async () => {
  try {
    const urlSunat = "https://api.apis.net.pe/v1/tipo-cambio-sunat";
    const response = await axios.get(urlSunat);
    const latestData = response.data;

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
  const startOfDay = utcDayStart(new Date());

  const existingRate = await prisma.exchangeRate.findFirst({
    where: {
      baseCurrency,
      targetCurrency,
      source,
      side,
      date: {
        gte: startOfDay,
        lt: new Date(startOfDay.getTime() + DAY_MS),
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
  const day = utcDayStart(date);

  return prisma.exchangeRate.findFirst({
    where: {
      baseCurrency,
      targetCurrency,
      side,
      date: {
        gte: day,
        lt: new Date(day.getTime() + DAY_MS),
      },
    },
    orderBy: {
      date: "desc",
    },
  });
};

exports.getRateForDate = async (baseCurrency, targetCurrency, date, side = "sell") => {
  const exact = await exports.getRateByDate(baseCurrency, targetCurrency, date, side);
  if (exact) return { ...exact, fallback: false };

  const day = utcDayStart(date);

  const previous = await prisma.exchangeRate.findFirst({
    where: {
      baseCurrency,
      targetCurrency,
      side,
      date: { lte: day },
    },
    orderBy: { date: "desc" },
  });

  if (previous) {
    warnFallback(baseCurrency, targetCurrency, side, date, previous);
    return { ...previous, fallback: true };
  }

  const next = await prisma.exchangeRate.findFirst({
    where: {
      baseCurrency,
      targetCurrency,
      side,
      date: { gt: day },
    },
    orderBy: { date: "asc" },
  });

  if (next) {
    warnFallback(baseCurrency, targetCurrency, side, date, next);
    return { ...next, fallback: true };
  }

  return null;
};
