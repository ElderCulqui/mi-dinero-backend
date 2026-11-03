const db = require("@/config/db");
const prisma = db.getClient();
const { generateLoanSchedule, recalculateStatus, round2 } = require("@/helpers/scheduleCalculator");
const { convertToBase } = require("@/helpers/currencyHelper");
const { parseMinor } = require("@/helpers/money");

const includePayments = {
    payments: { orderBy: { number: "asc" } },
    account: { select: { id: true, name: true, currency: true } },
    category: { select: { id: true, name: true } },
};

const validateAccount = async (userId, accountId) => {
    const acc = await prisma.account.findFirst({
        where: { id: Number(accountId), userId },
    });
    if (!acc) {
        const err = new Error("La cuenta no existe o no pertenece");
        err.status = 400;
        throw err;
    }
    return acc;
};

const validateCategory = async (userId, categoryId) => {
    if (!categoryId) return;
    const c = await prisma.category.findFirst({
        where: { id: Number(categoryId), userId },
    });
    if (!c) {
        const err = new Error("La categoría no existe o no te pertenece");
        err.status = 400;
        throw err;
    }
};

const create = async (userId, data) => {
    const account = data.accountId ? await validateAccount(userId, data.accountId) : null;
    await validateCategory(userId, data.categoryId);

    const schedule = generateLoanSchedule({
        startDate: new Date(data.startDate),
        totalAmount: data.totalAmount,
        termMonths: data.termMonths,
    });

    return prisma.loan.create({
        data: {
            userId,
            name: data.name,
            currency: data.currency ?? account?.currency ?? "PEN",
            principal: parseMinor(data.principal),
            totalAmount: parseMinor(data.totalAmount),
            interestRate: data.interestRate ?? null,
            termMonths: Number(data.termMonths),
            startDate: new Date(data.startDate),
            accountId: account?.id ?? null,
            categoryId: data.categoryId ? Number(data.categoryId) : null,
            description: data.description ?? null,
            payments: { create: schedule },
        },
        include: includePayments,
    });
};

const getAll = async (userId) =>
    prisma.loan.findMany({
        where: { userId, deletedAt: null },
        orderBy: { startDate: "desc" },
        include: includePayments,
    });

const getById = async (userId, id) => {
    const loan = await prisma.loan.findFirst({
        where: { id: Number(id), userId, deletedAt: null },
        include: includePayments,
    });

    if (!loan) {
        const err = new Error("Préstamo no encontrado");
        err.status = 404;
        throw err;
    }

    return loan;
};

const update = async (userId, id, data) => {
    const loan = await getById(userId, id);
    const hasPaid = loan.payments.some((p) => p.paidAmount > 0n);
    if (hasPaid) {
        const err = new Error("Con pagos realizados no se puede modificar el préstamo");
        err.status = 400;
        throw err;
    }
    return prisma.loan.update({
        where: { id: loan.id },
        data: {
            name: data.name ?? loan.name,
            description: data.description ?? loan.description,
            accountId: data.accountId ? Number(data.accountId) : loan.accountId,
            categoryId: data.categoryId ? Number(data.categoryId) : loan.categoryId,
        },
        include: includePayments,        
    });
};

const remove = async (userId, id) => {
    const loan = await getById(userId, id);
    const now = new Date();
    await prisma.$transaction([
        prisma.loan.update({ where: {id: loan.id}, data: { deletedAt: now } }),
        prisma.loanPayment.updateMany({
            where: { loanId: loan.id, deletedAt: null},
            data: { deletedAt: now },
        }),
    ]);
};

const getSummary = async (userId, id) => {
    const loan = await getById(userId, id);
    const total = loan.totalAmount;
    const paid = loan.payments.reduce((s, p) => s + p.paidAmount, 0n);
    return {
        loanId: loan.id,
        totalAmount: total,
        paidAmount: paid,
        pendingAmount: total - paid,
        progress: total > 0n ? round2((Number(paid) / Number(total)) * 100) : 0,
        status: loan.status,
        installmentsCount: loan.payments.length,
        paidInstallments: loan.payments.filter((p) => p.status === "pagado").length,
    };
};

const payPayment = async (userId, loanId, paymentId, data) => {
    const loan = await getById(userId, loanId);
    const payment = loan.payments.find((p) => p.id === Number(paymentId));
    if (!payment) {
        const err = new Error("Cuota no encontrada");
        err.status = 404;
        throw err;
    }
    
    const amount = parseMinor(data.amount);
    if (amount <= 0n) {
        const err = new Error("Monto debe ser > 0");
        err.status = 400;
        throw err;
    }

    const remaining = payment.amount - payment.paidAmount;
    if (amount > remaining) {
        const err = new Error(`Monto excede lo pendiente (${remaining} centavos)`);
        err.status = 400;
        throw err;
    }

    const targetAccount = data.accountId
        ? await validateAccount(userId, data.accountId)
        : loan.accountId ? await validateAccount(userId, loan.accountId) : null;

    if (!targetAccount) {
        const err = new Error("El préstamo no tiene cuenta asociada y no se especificó accountId");
        err.status = 400;
        throw err;
    }
    await validateCategory(userId, data.categoryId);

    const date = data.date ? new Date(data.date) : new Date();
    const description = data.description ?? `Pago préstamo ${loan.name} - Couta ${payment.number}/${loan.termMonths}`;

    return prisma.$transaction(async (tx) => {
        const transaction = await tx.transaction.create({
            data: {
                userId,
                accountId: targetAccount.id,
                categoryId: data.categoryId ? Number(data.categoryId) : loan.categoryId ?? null,
                type: "egreso",
                amount,
                amountBase: await convertToBase(amount, targetAccount.currency, date),
                date,
                description,
                source: "loan",
                loanPaymentId: payment.id,
            },
        });
        const newPaid = payment.paidAmount + amount;
        const newStatus = recalculateStatus(payment.amount, newPaid);
        const updatePayment = await tx.loanPayment.update({
            where: { id: payment.id },
            data: {
                paidAmount: newPaid,
                paidDate: newStatus === "pagado" ? date : null,
                status: newStatus,
            },
        });
        
        return { transaction, payment: updatePayment};
    });
};

module.exports = {
    create,
    getAll,
    getById,
    update,
    remove,
    getSummary,
    payPayment,
};

