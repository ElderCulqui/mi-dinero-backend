require("dotenv").config();

if (process.env.NODE_ENV === "production" && process.env.ALLOW_SEED !== "1") {
    throw new Error("Seed bloqueado con NODE_ENV=production (ALLOW_SEED=1 para forzar)");
}

const db = require("../src/config/db");
const { generateInstallmentSchedule } = require("../src/helpers/scheduleCalculator");
const prisma = db.getClient();

const CUTOFF = new Date("2026-11-03T00:00:00.000Z");
const CARD_NAME = "VISA BCP";
const CARD_LIMIT_MINOR = 1718100n;

const date = (value) => new Date(`${value}T00:00:00.000Z`);

const log = (...args) => console.log("[seed]", ...args);

const getUserId = async () => {
    const user = await prisma.user.findFirst({ orderBy: { id: "asc" } });
    if (!user) throw new Error("No hay usuarios en la base; registra uno primero");
    return user.id;
};

const upsertCategory = async (userId, name, type, color) => {
    const existing = await prisma.category.findFirst({
        where: { userId, name, type },
    });
    if (existing) return existing;
    return prisma.category.create({ data: { userId, name, type, color } });
};

const upsertAccount = async (userId, payload) => {
    const existing = await prisma.account.findFirst({
        where: { userId, name: payload.name, type: payload.type },
    });
    if (existing) return existing;
    return prisma.account.create({ data: { ...payload, userId } });
};

const upsertContact = async (userId, name) => {
    const existing = await prisma.contact.findFirst({
        where: { userId, name },
    });
    if (existing) return existing;
    return prisma.contact.create({ data: { userId, name } });
};

const upsertCycle = async (userId, cardId, cycle) => {
    const existing = await prisma.billingCycle.findFirst({
        where: { userId, creditCardId: cardId, periodStart: cycle.periodStart },
    });
    if (existing) return existing;
    return prisma.billingCycle.create({
        data: { ...cycle, userId, creditCardId: cardId },
    });
};

const upsertPlan = async (userId, cardId, categoryId, plan) => {
    const existing = await prisma.installmentPlan.findFirst({
        where: { userId, description: plan.description },
    });
    if (existing) return existing;

    const schedule = generateInstallmentSchedule({
        firstDueDate: plan.firstDueDate,
        installments: plan.installments,
        totalAmount: plan.totalAmount,
    });

    return prisma.installmentPlan.create({
        data: {
            userId,
            creditCardId: cardId,
            categoryId,
            description: plan.description,
            currency: "PEN",
            totalAmount: plan.totalAmount,
            installments: plan.installments,
            amountPerInstallment: plan.amountPerInstallment,
            startDate: plan.startDate,
            firstDueDate: plan.firstDueDate,
            installments_: { create: schedule },
        },
    });
};

const upsertDebt = async (userId, contactId, payload) => {
    const existing = await prisma.contactDebt.findFirst({
        where: {
            userId,
            contactId,
            description: payload.description,
            direction: payload.direction,
        },
    });
    if (existing) return existing;
    return prisma.contactDebt.create({
        data: { ...payload, userId, contactId },
    });
};

const main = async () => {
    const userId = await getUserId();
    log(`usuario ${userId}`);

    const card = await prisma.creditCard.findFirst({
        where: { userId, name: CARD_NAME },
    });
    const savedCard = card
        ? card
        : await prisma.creditCard.create({
              data: {
                  userId,
                  name: CARD_NAME,
                  brand: "Visa",
                  bankCurrency: "PEN",
                  timezone: "America/Lima",
                  isActive: true,
              },
          });

    const cardPen = await upsertAccount(userId, {
        name: "Tarjeta BCP Soles",
        type: "tarjeta_credito",
        currency: "PEN",
        creditCardId: savedCard.id,
        creditLimit: CARD_LIMIT_MINOR,
        openingBalanceMinor: 0n,
        openingBalanceDate: CUTOFF,
    });
    const cardUsd = await upsertAccount(userId, {
        name: "Tarjeta BCP USD",
        type: "tarjeta_credito",
        currency: "USD",
        creditCardId: savedCard.id,
        creditLimit: null,
        openingBalanceMinor: 0n,
        openingBalanceDate: CUTOFF,
    });
    await upsertAccount(userId, {
        name: "Cuenta BCP Soles",
        type: "cuenta_bancaria",
        currency: "PEN",
        creditCardId: null,
        creditLimit: null,
        openingBalanceMinor: 0n,
        openingBalanceDate: CUTOFF,
    });
    await upsertAccount(userId, {
        name: "Efectivo",
        type: "efectivo",
        currency: "PEN",
        creditCardId: null,
        creditLimit: null,
        openingBalanceMinor: 0n,
        openingBalanceDate: CUTOFF,
    });

    const expenseCategories = [
        ["Vivienda y servicios", "#0ea5e9"],
        ["Telefonía", "#6366f1"],
        ["Seguros y financiero", "#8b5cf6"],
        ["Supermercado", "#22c55e"],
        ["Farmacia y salud", "#ef4444"],
        ["Combustible y transporte", "#f59e0b"],
        ["Suscripciones", "#14b8a6"],
        ["Hogar y equipamiento", "#a855f7"],
        ["Ropa y calzado", "#ec4899"],
        ["Restaurantes y ocio", "#f97316"],
        ["Préstamos y deudas", "#64748b"],
        ["Trámites", "#84cc16"],
        ["Mascota", "#eab308"],
        ["Tecnología", "#3b82f6"],
        ["Educación", "#06b6d4"],
        ["Otros", "#94a3b8"],
    ];
    const incomeCategories = [
        ["Sueldo", "#16a34a"],
        ["Soporte Aco", "#0d9488"],
        ["Adelanto", "#0284c7"],
        ["Otros ingresos", "#65a30d"],
    ];

    const categories = new Map();
    for (const [name, color] of expenseCategories) {
        categories.set(name, await upsertCategory(userId, name, "egreso", color));
    }
    for (const [name, color] of incomeCategories) {
        categories.set(name, await upsertCategory(userId, name, "ingreso", color));
    }

    const contacts = new Map();
    for (const name of ["Liam", "Rubby", "Sixto"]) {
        contacts.set(name, await upsertContact(userId, name));
    }

    const cycles = [
        ["2025-12-10", "2026-01-09", "2026-02-05"],
        ["2026-01-10", "2026-02-10", "2026-03-05"],
        ["2026-02-11", "2026-03-10", "2026-04-07"],
        ["2026-03-11", "2026-04-10", "2026-05-05"],
        ["2026-04-11", "2026-05-08", "2026-06-08"],
        ["2026-05-09", "2026-06-10", "2026-07-06"],
        ["2026-06-11", "2026-07-10", "2026-08-05"],
        ["2026-07-11", "2026-08-10", "2026-09-07"],
        ["2026-08-11", "2026-09-10", "2026-10-05"],
        ["2026-09-11", "2026-10-11", "2026-11-05"],
        ["2026-10-12", "2026-11-10", "2026-12-07"],
        ["2026-11-11", "2026-12-10", "2027-01-05"],
    ];

    for (const [start, end, due] of cycles) {
        const periodEnd = date(end);
        await upsertCycle(userId, savedCard.id, {
            periodStart: date(start),
            periodEnd,
            dueDate: date(due),
            status: periodEnd < CUTOFF ? "cerrado" : "abierto",
        });
    }

    const plans = [
        {
            description: "Celular Samsung",
            installments: 10,
            amountPerInstallment: 11689n,
            totalAmount: 116890n,
            startDate: date("2026-03-08"),
            category: "Tecnología",
        },
        {
            description: "Repostero",
            installments: 2,
            amountPerInstallment: 12494n,
            totalAmount: 24988n,
            startDate: date("2026-03-13"),
            category: "Hogar y equipamiento",
        },
        {
            description: "Laptop Sixto",
            installments: 5,
            amountPerInstallment: 13246n,
            totalAmount: 66230n,
            startDate: date("2026-03-23"),
            category: "Tecnología",
        },
        {
            description: "Zapatillas Elder (PASE CUOTAS BM)",
            installments: 9,
            amountPerInstallment: 5138n,
            totalAmount: 46242n,
            startDate: date("2026-07-30"),
            category: "Ropa y calzado",
        },
        {
            description: "Ripley (PASE CUOTAS BM)",
            installments: 9,
            amountPerInstallment: 5613n,
            totalAmount: 50517n,
            startDate: date("2026-07-30"),
            category: "Ropa y calzado",
        },
        {
            description: "PCYA Empresaria",
            installments: 11,
            amountPerInstallment: 17075n,
            totalAmount: 187825n,
            startDate: date("2026-09-15"),
            category: "Tecnología",
        },
    ];

    for (const plan of plans) {
        await upsertPlan(
            userId,
            savedCard.id,
            categories.get(plan.category).id,
            { ...plan, firstDueDate: date("2026-12-05") },
        );
    }

    await upsertDebt(userId, contacts.get("Liam").id, {
        direction: "por_pagar",
        description: "Deuda pendiente",
        amountMinor: 160000n,
        currency: "PEN",
        date: CUTOFF,
        status: "pendiente",
    });
    await upsertDebt(userId, contacts.get("Rubby").id, {
        direction: "por_pagar",
        description: "Deuda pendiente",
        amountMinor: 98000n,
        currency: "PEN",
        date: CUTOFF,
        status: "pendiente",
    });

    const prime = await prisma.recurringExpense.findFirst({
        where: { userId, name: "Prime" },
    });
    if (!prime) {
        await prisma.recurringExpense.create({
            data: {
                userId,
                accountId: cardPen.id,
                categoryId: categories.get("Suscripciones").id,
                name: "Prime",
                amountMinor: 2590n,
                currency: "PEN",
                dayOfMonth: 23,
                isActive: true,
            },
        });
    }

    const summary = {
        card: savedCard.id,
        accounts: [cardPen.id, cardUsd.id],
        categories: categories.size,
        contacts: contacts.size,
        cycles: cycles.length,
        plans: plans.length,
        debts: 2,
        recurring: "Prime",
    };
    log(JSON.stringify(summary, null, 2));
};

main()
    .catch((error) => {
        console.error("[seed] error", error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await db.disconnect();
    });
