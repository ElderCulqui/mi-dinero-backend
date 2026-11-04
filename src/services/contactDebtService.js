const db = require("@/config/db");
const { convertToBase } = require("@/helpers/currencyHelper");
const { parseMinor } = require("@/helpers/money");
const { resolveByAccountAndDate } = require("@/helpers/billingCycleResolver");
const prisma = db.getClient();

const includeRelations = {
    contact: { select: { id: true, name: true } },
    transaction: {
        select: {
            id: true,
            date: true,
            type: true,
            amount: true,
        },
    },
};

const getContact = async (userId, contactId) => {
    const contact = await prisma.contact.findFirst({
        where: { id: Number(contactId), userId },
    });
    if (!contact) {
        throw Object.assign(new Error("Contact not found"), { status: 404 });
    }
    return contact;
};

const groupByCurrency = (debts, direction) => {
    const totals = new Map();

    for (const debt of debts) {
        if (debt.direction !== direction) continue;

        const current = totals.get(debt.currency) ?? {
            currency: debt.currency,
            amountMinor: 0n,
            count: 0,
        };
        current.amountMinor += debt.amountMinor;
        current.count += 1;
        totals.set(debt.currency, current);
    }

    return [...totals.values()].sort((a, b) =>
        a.currency.localeCompare(b.currency),
    );
};

exports.getByContact = async (userId, contactId) => {
    await getContact(userId, contactId);
    return prisma.contactDebt.findMany({
        where: { contactId: Number(contactId), userId },
        include: includeRelations,
        orderBy: [{ status: "asc" }, { date: "desc" }, { id: "desc" }],
    });
};

exports.getSummary = async (userId, contactId) => {
    await getContact(userId, contactId);

    const debts = await prisma.contactDebt.findMany({
        where: {
            contactId: Number(contactId),
            userId,
            status: "pendiente",
        },
        select: {
            direction: true,
            currency: true,
            amountMinor: true,
        },
    });

    return {
        por_pagar: groupByCurrency(debts, "por_pagar"),
        por_cobrar: groupByCurrency(debts, "por_cobrar"),
    };
};

exports.create = async (userId, contactId, data) => {
    await getContact(userId, contactId);

    const direction = data.direction;
    if (!["por_cobrar", "por_pagar"].includes(direction)) {
        throw Object.assign(
            new Error("direction debe ser por_cobrar o por_pagar"),
            { status: 400 },
        );
    }

    const amountMinor = parseMinor(data.amountMinor);
    if (amountMinor <= 0n) {
        throw Object.assign(new Error("El monto debe ser mayor a 0"), {
            status: 400,
        });
    }

    return prisma.contactDebt.create({
        data: {
            userId,
            contactId: Number(contactId),
            direction,
            description: data.description,
            amountMinor,
            currency: data.currency || "PEN",
            date: data.date ? new Date(data.date) : new Date(),
            dueDate: data.dueDate ? new Date(data.dueDate) : null,
            status: "pendiente",
        },
        include: includeRelations,
    });
};

exports.markPaid = async (userId, id, data) => {
    const debt = await prisma.contactDebt.findFirst({
        where: { id: Number(id), userId },
        include: includeRelations,
    });
    if (!debt) {
        throw Object.assign(new Error("Deuda no encontrada"), { status: 404 });
    }
    if (debt.status === "pagado") {
        throw Object.assign(new Error("La deuda ya fue pagada"), {
            status: 400,
        });
    }

    const account = await prisma.account.findFirst({
        where: { id: Number(data.accountId), userId },
    });
    if (!account) {
        throw Object.assign(
            new Error("La cuenta no existe o no te pertenece"),
            { status: 400 },
        );
    }
    if (account.currency !== debt.currency) {
        throw Object.assign(
            new Error(`La cuenta debe estar en ${debt.currency}`),
            { status: 400 },
        );
    }

    let categoryId = null;
    if (data.categoryId) {
        const category = await prisma.category.findFirst({
            where: { id: Number(data.categoryId), userId },
        });
        if (!category) {
            throw Object.assign(
                new Error("La categoría no existe o no te pertenece"),
                { status: 400 },
            );
        }
        categoryId = category.id;
    }

    const date = data.date ? new Date(data.date) : new Date();
    const amountBase = await convertToBase(debt.amountMinor, debt.currency, date);
    const type = debt.direction === "por_pagar" ? "egreso" : "ingreso";
    const description =
        data.description || `Pago deuda: ${debt.description}`;

    let billingCycleId = null;
    if (account.type === "tarjeta_credito" && account.creditCardId) {
        const cycle = await resolveByAccountAndDate(account.id, date);
        billingCycleId = cycle ? cycle.id : null;
    }

    return prisma.$transaction(async (tx) => {
        const transaction = await tx.transaction.create({
            data: {
                userId,
                accountId: account.id,
                categoryId,
                type,
                amount: debt.amountMinor,
                amountBase,
                date,
                description,
                source: "manual",
                billingCycleId,
            },
        });

        return tx.contactDebt.update({
            where: { id: debt.id },
            data: {
                status: "pagado",
                paidDate: date,
                transactionId: transaction.id,
            },
            include: includeRelations,
        });
    });
};

exports.remove = async (userId, id) => {
    const debt = await prisma.contactDebt.findFirst({
        where: { id: Number(id), userId },
    });
    if (!debt) {
        throw Object.assign(new Error("Deuda no encontrada"), { status: 404 });
    }
    return prisma.contactDebt.delete({ where: { id: debt.id } });
};
