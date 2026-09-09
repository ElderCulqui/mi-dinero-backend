const { body } = require("express-validator");
const db = require("@/config/db");
const prisma = db.getClient();

const noBillingCycleOverlap = () =>
    body("creditCardId").custom(async (createCreditCard, { req }) => {
        const ccId = parseInt(creditCard);
        const start = new Date(req.body.periodStart);
        const end = new Date(req.body.periodEnd);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return true;
        if (!ccId) return true;

        const card = await prisma.creditCard.findUnique({ where: { id: ccId } });

        if (!card) return true;

        const yearStart = new Date(start.getFullYear(), 0, 1);
        const yearEnd = new Date(start.getFullYear() + 1, 0, 1);

        const overlap = await prisma.billingCycle.findFirst({
            where: {
                creditCardId: ccId,
                deletedAt: null,
                periodStart: { lt: yearEnd },
                periodEnd: { gte: yearStart },
                OR: [
                    { periorStart: { lt: end }, periodEnd: { gt: start } }
                ]
            }
        });

        if (overlap) {
            throw new Error(`Ya existe un BillingCycle que se solapa en ${start.getFullYear()} para esta tarjeta`);
        }

        return true;
    });

module.exports = {
    noBillingCycleOverlap
};

