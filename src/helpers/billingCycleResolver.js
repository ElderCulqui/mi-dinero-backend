const db = require("@/config/db");
const { DEFAULT_TIMEZONE, localDateOf, toDateOnly } = require("@/helpers/timezone");
const prisma = db.getClient();

const resolveByAccountAndDate = async (accountId, date) => {
    const account = await prisma.account.findFirst({
        where: { id: Number(accountId), deletedAt: null },
        select: {
            creditCardId: true,
            creditCard: { select: { timezone: true } },
        },
    });
    if (!account || !account.creditCardId) return null;

    const timeZone = account.creditCard?.timezone || DEFAULT_TIMEZONE;
    const localDate = localDateOf(new Date(date), timeZone);

    const cycles = await prisma.billingCycle.findMany({
        where: { creditCardId: account.creditCardId, deletedAt: null },
        orderBy: { periodStart: "desc" },
    });

    return (
        cycles.find((cycle) => {
            const start = toDateOnly(cycle.periodStart);
            const end = toDateOnly(cycle.periodEnd);
            return localDate >= start && localDate <= end;
        }) || null
    );
};

module.exports = { resolveByAccountAndDate };
