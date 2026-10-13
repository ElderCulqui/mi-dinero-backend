const db = require("@/config/db");
const prisma = db.getClient();
const { generateInstallmentSchedule, recalculateStatus, round2 } = require("@/helpers/scheduleCalculator");
const { resolveByAccountAndDate } = require("@/helpers/billingCycleResolver");
const { convertToBase } = require("@/helpers/currencyHelper");

const includeInstallments = {
    installments_: { orderBy: { number: "asc" } },
    creditCard: { select: { id: true, name: true, bankCurrency: true } },
    category: { select: { id: true, name: true } },
};

const resolveCardAndAccount = async (userId, cardId) => {
    const card = await prisma.creditCard.findFirst({
        where: { id: Number(cardId), userId},
    });
    if (!card) {
        const err = new Error("La tarjeta no existe o no te pertenece");
        err.status = 400;
        throw err;
    }
    if (!card.bankCurrency) {
        const err = new Error("La tarjeta no tiene bankCurrency definido");
        err.status = 400;
        throw err;
    }

    const account = await prisma.account.findFirst({
        where: { creditCardId: card.id, currency: card.bankCurrency, deletedAt: null },
    });
    if (!account) {
        const err = new Error(`La tarjeta no tiene cuenta en ${card.bankCurrency}`);
        err.status = 400;
        throw err;
    }

    return { card, account };
}

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
    const { card } = await resolveCardAndAccount(userId, data.creditCardId);
    await validateCategory(userId, data.categoryId);

    const amountPerInstallment = round2(Number(data.totalAmount) / Number(data.installments));
    const schedule = generateInstallmentSchedule({
        firstDueDate: new Date(data.firstDueDate),
        installments: data.installments,
        amountPerInstallment,
        totalAmount: data.totalAmount,
    });

    return prisma.installmentPlan.create({
        data: {
            userId,
            creditCardId: card.id,
            categoryId: data.categoryId ? Number(data.categoryId) : null,
            description: data.description,
            currency: data.currency ?? card.bankCurrency,
            totalAmount: data.totalAmount,
            installments: Number(data.installments),
            amountPerInstallment,
            startDate: new Date(data.startDate),
            firstDueDate: new Date(data.firstDueDate),
            installments_: { create: schedule },
        },
        include: includeInstallments,
    });
};

const getAll = async (userId) =>
  prisma.installmentPlan.findMany({
    where: { userId },
    orderBy: { startDate: "desc" },
    include: includeInstallments,
  });

const getById = async (userId, id) => {
  const plan = await prisma.installmentPlan.findFirst({
    where: { id: Number(id), userId},
    include: { ...includeInstallments, creditCard: { include: { accounts: true } } },
  });
  if (!plan) {
    const err = new Error("Plan no encontrado");
    err.status = 404;
    throw err;
  }
  return plan;
};

const update = async (userId, id, data) => {
  const plan = await getById(userId, id);
  const hasPaid = plan.installments_.some((i) => Number(i.paidAmount) > 0);
  if (hasPaid) {
    const err = new Error("Con cuotas pagadas no se puede modificar el plan");
    err.status = 400;
    throw err;
  }
  return prisma.installmentPlan.update({
    where: { id: plan.id },
    data: {
      description: data.description ?? plan.description,
      categoryId: data.categoryId ? Number(data.categoryId) : plan.categoryId,
    },
    include: includeInstallments,
  });
};

const remove = async (userId, id) => {
  const plan = await getById(userId, id);
  const now = new Date();
  await prisma.$transaction([
    prisma.installmentPlan.update({ where: { id: plan.id }, data: { deletedAt: now } }),
    prisma.installment.updateMany({
      where: { installmentPlanId: plan.id, deletedAt: null },
      data: { deletedAt: now },
    }),
  ]);
};

const getSummary = async (userId, id) => {
  const plan = await getById(userId, id);
  const total = Number(plan.totalAmount);
  const paid = plan.installments_.reduce((s, i) => s + Number(i.paidAmount), 0);
  return {
    planId: plan.id,
    totalAmount: total,
    paidAmount: round2(paid),
    pendingAmount: round2(total - paid),
    progress: total > 0 ? round2((paid / total) * 100) : 0,
    status: plan.status,
    installmentsCount: plan.installments_.length,
    paidInstallments: plan.installments_.filter((i) => i.status === "pagado").length,
  };
};

const payInstallment = async (userId, planId, installmentId, data) => {
  const plan = await getById(userId, planId);
  const installment = plan.installments_.find((i) => i.id === Number(installmentId));
  if (!installment) {
    const err = new Error("Cuota no encontrada");
    err.status = 404;
    throw err;
  }
  const amount = Number(data.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    const err = new Error("Monto debe ser > 0");
    err.status = 400;
    throw err;
  }
  const remaining = Number(installment.amount) - Number(installment.paidAmount);
  if (amount > remaining + 0.0001) {
    const err = new Error(`Monto excede lo pendiente (${remaining.toFixed(2)})`);
    err.status = 400;
    throw err;
  }

  const { account } = await resolveCardAndAccount(userId, plan.creditCardId);
  await validateCategory(userId, data.categoryId);

  const date = data.date ? new Date(data.date) : new Date();
  const description =
    data.description ??
    `Cuota ${plan.description} - ${installment.number}/${plan.installments}`;

  const billingCycle = await resolveByAccountAndDate(account.id, date);

  return prisma.$transaction(async (tx) => {
    const transaction = await tx.transaction.create({
      data: {
        userId,
        accountId: account.id,
        categoryId: data.categoryId ? Number(data.categoryId) : plan.categoryId ?? null,
        type: "egreso",
        amount,
        currency: account.currency,
        amountBase: await convertToBase(amount, account.currency, date),
        date,
        description,
        source: "installment",
        billingCycleId: billingCycle ? billingCycle.id : null,
        installmentId: installment.id,
      },
    });
    const newPaid = round2(Number(installment.paidAmount) + amount);
    const newStatus = recalculateStatus(installment.amount, newPaid);
    const updated = await tx.installment.update({
      where: { id: installment.id },
      data: {
        paidAmount: newPaid,
        paidDate: newStatus === "pagado" ? date : null,
        status: newStatus,
      },
    });
    return { transaction, installment: updated };
  });
};

module.exports = { 
    create, 
    getAll, 
    getById, 
    update, 
    remove, 
    getSummary, 
    payInstallment 
};




