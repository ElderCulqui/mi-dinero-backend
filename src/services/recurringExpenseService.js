const db = require("@/config/db");
const { convertToBase } = require("@/helpers/currencyHelper");
const { parseMinor } = require("@/helpers/money");
const { resolveByAccountAndDate } = require("@/helpers/billingCycleResolver");
const prisma = db.getClient();

const parseAccountId = (value) => {
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0) {
        throw Object.assign(new Error("accountId inválido"), { status: 400 });
    }
    return id;
};

const resolveAccount = async (userId, accountId) => {
    const account = await prisma.account.findFirst({
        where: { id: parseAccountId(accountId), userId },
    });
    if (!account) {
        throw Object.assign(
            new Error("La cuenta no existe o no te pertenece"),
            { status: 400 },
        );
    }
    return account;
};

const resolveCategory = async (userId, categoryId) => {
    if (categoryId === undefined || categoryId === null || categoryId === "") {
        return null;
    }
    const category = await prisma.category.findFirst({
        where: { id: Number(categoryId), userId },
    });
    if (!category) {
        throw Object.assign(
            new Error("La categoría no existe o no te pertenece"),
            { status: 400 },
        );
    }
    return category;
};

const buildData = async (userId, data) => {
    const account = await resolveAccount(userId, data.accountId);
    const category = await resolveCategory(userId, data.categoryId);
    const dayOfMonth = Number(data.dayOfMonth);

    if (!Number.isInteger(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 28) {
        throw Object.assign(
            new Error("dayOfMonth debe ser un entero entre 1 y 28"),
            { status: 400 },
        );
    }

    return {
        accountId: account.id,
        categoryId: category ? category.id : null,
        name: data.name,
        amountMinor: parseMinor(data.amountMinor),
        currency: account.currency,
        dayOfMonth,
        isActive: data.isActive === undefined ? true : Boolean(data.isActive),
    };
};

exports.create = async (userId, data) => {
    const payload = await buildData(userId, data);
    return prisma.recurringExpense.create({
        data: { ...payload, userId },
        include: { account: true, category: true },
    });
};

exports.getAll = async (userId) =>
    prisma.recurringExpense.findMany({
        where: { userId },
        include: { account: true, category: true },
        orderBy: { name: "asc" },
    });

exports.getById = async (userId, id) => {
    const recurring = await prisma.recurringExpense.findFirst({
        where: { id: Number(id), userId },
        include: { account: true, category: true },
    });
    if (!recurring) {
        throw Object.assign(new Error("Recurrente no encontrado"), {
            status: 404,
        });
    }
    return recurring;
};

exports.update = async (userId, id, data) => {
    const current = await exports.getById(userId, id);
    const merged = {
        accountId: data.accountId ?? current.accountId,
        categoryId:
            data.categoryId === undefined ? current.categoryId : data.categoryId,
        name: data.name ?? current.name,
        amountMinor:
            data.amountMinor === undefined
                ? current.amountMinor.toString()
                : data.amountMinor,
        dayOfMonth: data.dayOfMonth ?? current.dayOfMonth,
        isActive: data.isActive ?? current.isActive,
    };
    const payload = await buildData(userId, merged);

    return prisma.recurringExpense.update({
        where: { id: current.id },
        data: payload,
        include: { account: true, category: true },
    });
};

exports.remove = async (userId, id) => {
    const recurring = await exports.getById(userId, id);
    return prisma.recurringExpense.delete({ where: { id: recurring.id } });
};

const monthKey = (date) =>
    `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;

exports.processDue = async () => {
    const now = new Date();
    const currentMonth = monthKey(now);
    const today = now.getUTCDate();

    const items = await prisma.recurringExpense.findMany({
        where: { isActive: true },
    });
    const created = [];

    for (const item of items) {
        if (item.lastRunMonth === currentMonth) continue;
        if (today < item.dayOfMonth) continue;

        const account = await prisma.account.findUnique({
            where: { id: item.accountId },
        });
        if (!account || account.deletedAt) continue;

        const date = new Date(
            Date.UTC(
                now.getUTCFullYear(),
                now.getUTCMonth(),
                item.dayOfMonth,
                12,
                0,
                0,
                0,
            ),
        );
        const amountBase = await convertToBase(
            item.amountMinor,
            item.currency,
            date,
        );

        let billingCycleId = null;
        if (account.type === "tarjeta_credito" && account.creditCardId) {
            const cycle = await resolveByAccountAndDate(account.id, date);
            billingCycleId = cycle ? cycle.id : null;
        }

        const [, transaction] = await prisma.$transaction([
            prisma.recurringExpense.update({
                where: { id: item.id },
                data: { lastRunMonth: currentMonth },
            }),
            prisma.transaction.create({
                data: {
                    userId: item.userId,
                    accountId: item.accountId,
                    categoryId: item.categoryId,
                    type: "egreso",
                    amount: item.amountMinor,
                    amountBase,
                    date,
                    description: `Recurrente: ${item.name}`,
                    source: "manual",
                    billingCycleId,
                },
            }),
        ]);

        created.push(transaction);
    }

    return created;
};

exports.monthKey = monthKey;
