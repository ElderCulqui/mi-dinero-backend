const db = require("@/config/db");
const {
    normalizeTimeZone,
    monthRangeUtc,
} = require("@/helpers/timezone");
const prisma = db.getClient();

exports.getMonthlySummary = async (userId, month) => {
    const user = await prisma.user.findUnique({
        where: { id: parseInt(userId) },
        select: { timezone: true },
    });
    const timeZone = normalizeTimeZone(user?.timezone);
    const { from, to, key } = monthRangeUtc(month, timeZone);

    const transactions = await prisma.transaction.findMany({
        where: {
            userId: parseInt(userId),
            status: "ejecutado",
            source: { not: "transfer" },
            date: { gte: from, lt: to },
        },
        select: {
            type: true,
            amount: true,
            amountBase: true,
            account: { select: { currency: true } },
        },
    });

    let incomeBase = 0n;
    let expenseBase = 0n;
    const byCurrency = new Map();

    for (const transaction of transactions) {
        const currency = transaction.account.currency;
        const bucket = byCurrency.get(currency) ?? {
            currency,
            incomeMinor: 0n,
            expenseMinor: 0n,
        };

        if (transaction.type === "ingreso") {
            incomeBase += transaction.amountBase;
            bucket.incomeMinor += transaction.amount;
        } else {
            expenseBase += transaction.amountBase;
            bucket.expenseMinor += transaction.amount;
        }

        byCurrency.set(currency, bucket);
    }

    return {
        month: key,
        incomeBaseMinor: incomeBase,
        expenseBaseMinor: expenseBase,
        netBaseMinor: incomeBase - expenseBase,
        byCurrency: [...byCurrency.values()].sort((a, b) =>
            a.currency.localeCompare(b.currency),
        ),
        transactionCount: transactions.length,
    };
};
