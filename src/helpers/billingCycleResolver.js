const db = require("@/config/db");
const prisma = db.getClient();

const resolveByAccountAndDate = async (accountId, date) => {
    const account = await prisma.account.findFirst({
        where: { id: Number(accountId), deletedAt: null },
        select: { creditCardId: true },
    });
    if (!account || !account.creditCardId) return null;

    const target = new Date(date);
    return prisma.billingCycle.findFirst({
        where: {
            creditCardId: account.creditCardId,
            deletedAt: null,
            periodStart: { lte: target },
            periodEnd: { gte: target },
        },
        orderBy: { periodStart: "desc" },
    });
};

module.exports = { resolveByAccountAndDate }