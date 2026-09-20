const { body, param, query } = require("express-validator");
const db = require("@/config/db");
const prisma = db.getClient();

const locations = { body, param, query }

const noBillingCycleOverlap = ({
    location = "body",
    field = "creditCardId",
} = {}) => {
    const validador  = locations[location];

    if (!validador) {
        throw new Error(`Ubicación de validación invalida: ${location}`)
    }

    return validador(field).custom(async (creditCardId, { req }) => {
        const ccId = parseInt(creditCardId);
        const start = new Date(req.body.periodStart);
        const end = new Date(req.body.periodEnd);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return true;
        if (!ccId) return true;

        const card = await prisma.creditCard.findUnique({ where: { id: ccId } });

        if (!card) return true;

        const overlap = await prisma.billingCycle.findFirst({
            where: {
                creditCardId: ccId,
                deletedAt: null,
                periodStart: { lt: end },
                periodEnd: { gt: start },
            }
        });

        if (overlap) {
            throw new Error(`Ya existe un BillingCycle que se solapa en ${start.getFullYear()} para esta tarjeta`);
        }

        return true;
    });
};

module.exports = {
    noBillingCycleOverlap
};

