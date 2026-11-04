const db = require("@/config/db");
const prisma = db.getClient();

const monthRange = (month) => {
    const now = new Date();
    let year = now.getUTCFullYear();
    let monthIndex = now.getUTCMonth();

    if (month) {
        const match = /^(\d{4})-(\d{2})$/.exec(month);
        if (!match) {
            throw Object.assign(new Error("month debe tener el formato YYYY-MM"), {
                status: 400,
            });
        }
        year = Number(match[1]);
        monthIndex = Number(match[2]) - 1;
        if (monthIndex < 0 || monthIndex > 11) {
            throw Object.assign(new Error("month inválido"), { status: 400 });
        }
    }

    return {
        from: new Date(Date.UTC(year, monthIndex, 1)),
        to: new Date(Date.UTC(year, monthIndex + 1, 1)),
        key: `${year}-${String(monthIndex + 1).padStart(2, "0")}`,
    };
};

exports.getMonthlySummary = async (userId, month) => {
    const { from, to, key } = monthRange(month);

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
