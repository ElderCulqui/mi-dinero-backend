const db = require("@/config/db");
const prisma = db.getClient();
const { generateInstallmentSchedule, recalculateStatus, round2 } = require("@/helpers/scheduleCalculator");
const { resolveByAccountAndDate } = require("@/helpers/billingCycleResolver");
const { convertToBase } = require("@/helpers/currencyHelper");
const { parseMinor } = require("@/helpers/money");

const includeInstallments = {
    installments_: { orderBy: { number: "asc" } },
    creditCard: { select: { id: true, name: true, bankCurrency: true } },
    category: { select: { id: true, name: true } },
};

const resolveCardAndAccount = async (userId, cardId, currency = null) => {
    const card = await prisma.creditCard.findFirst({
        where: { id: Number(cardId), userId},
    });
    if (!card) {
        const err = new Error("La tarjeta no existe o no te pertenece");
        err.status = 400;
        throw err;
    }

    const accountCurrency = currency || card.bankCurrency;
    if (!accountCurrency) {
        const err = new Error("La tarjeta no tiene bankCurrency definido");
        err.status = 400;
        throw err;
    }

    const account = await prisma.account.findFirst({
        where: { creditCardId: card.id, currency: accountCurrency, deletedAt: null },
    });
    if (!account) {
        const err = new Error(`La tarjeta no tiene cuenta en ${accountCurrency}`);
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
    const planCurrency = data.currency || null;
    const { card, account } = await resolveCardAndAccount(
        userId,
        data.creditCardId,
        planCurrency,
    );
    await validateCategory(userId, data.categoryId);

    const totalAmount = parseMinor(data.totalAmount);
    const count = Number(data.installments);
    const schedule = generateInstallmentSchedule({
        firstDueDate: new Date(data.firstDueDate),
        installments: data.installments,
        totalAmount,
    });
    const amountPerInstallment = totalAmount / BigInt(count);
    const purchaseDate = new Date(data.startDate);
    const amountBase = await convertToBase(
        totalAmount,
        account.currency,
        purchaseDate,
    );
    const billingCycle = await resolveByAccountAndDate(account.id, purchaseDate);

    return prisma.$transaction(async (tx) => {
        const purchaseTransaction = await tx.transaction.create({
            data: {
                userId,
                accountId: account.id,
                categoryId: data.categoryId ? Number(data.categoryId) : null,
                type: "egreso",
                amount: totalAmount,
                amountBase,
                date: purchaseDate,
                description: `Compra en cuotas: ${data.description}`,
                source: "manual",
                billingCycleId: billingCycle ? billingCycle.id : null,
            },
        });

        const plan = await tx.installmentPlan.create({
            data: {
                userId,
                creditCardId: card.id,
                categoryId: data.categoryId ? Number(data.categoryId) : null,
                description: data.description,
                currency: account.currency,
                totalAmount,
                installments: count,
                amountPerInstallment,
                startDate: purchaseDate,
                firstDueDate: new Date(data.firstDueDate),
                installments_: { create: schedule },
            },
            include: includeInstallments,
        });

        return { ...plan, purchaseTransaction };
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
  const hasPaid = plan.installments_.some((i) => i.paidAmount > 0n);
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
  const total = plan.totalAmount;
  const paid = plan.installments_.reduce((s, i) => s + i.paidAmount, 0n);
  return {
    planId: plan.id,
    totalAmount: total,
    paidAmount: paid,
    pendingAmount: total - paid,
    progress: total > 0n ? round2((Number(paid) / Number(total)) * 100) : 0,
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
  const amount = parseMinor(data.amount);
  if (amount <= 0n) {
    const err = new Error("Monto debe ser > 0");
    err.status = 400;
    throw err;
  }
  const remaining = installment.amount - installment.paidAmount;
  if (amount > remaining) {
    const err = new Error(`Monto excede lo pendiente (${remaining} centavos)`);
    err.status = 400;
    throw err;
  }

  const { account: cardAccount } = await resolveCardAndAccount(
    userId,
    plan.creditCardId,
    plan.currency,
  );

  const sourceAccount = await prisma.account.findUnique({
    where: { id: Number(data.accountId) },
  });
  if (!sourceAccount) {
    const err = new Error("La cuenta de pago no existe o fue eliminada");
    err.status = 400;
    throw err;
  }
  if (sourceAccount.userId !== userId) {
    const err = new Error("No autorizado");
    err.status = 403;
    throw err;
  }
  if (sourceAccount.type === "tarjeta_credito") {
    const err = new Error("Selecciona una cuenta de banco o efectivo para pagar");
    err.status = 400;
    throw err;
  }
  if (sourceAccount.currency !== plan.currency) {
    const err = new Error(`La cuenta de pago debe estar en ${plan.currency}`);
    err.status = 400;
    throw err;
  }

  const date = data.date ? new Date(data.date) : new Date();
  const description =
    data.description ??
    `Pago cuota ${plan.description} - ${installment.number}/${plan.installments}`;
  const amountBase = await convertToBase(amount, sourceAccount.currency, date);

  return prisma.$transaction(async (tx) => {
    const fromTransaction = await tx.transaction.create({
      data: {
        userId,
        accountId: sourceAccount.id,
        categoryId: null,
        type: "egreso",
        amount,
        amountBase,
        date,
        description,
        source: "transfer",
        billingCycleId: null,
      },
    });

    const toTransaction = await tx.transaction.create({
      data: {
        userId,
        accountId: cardAccount.id,
        categoryId: null,
        type: "ingreso",
        amount,
        amountBase,
        date,
        description,
        source: "transfer",
        billingCycleId: null,
      },
    });

    const transfer = await tx.transfer.create({
      data: {
        userId,
        fromAccountId: sourceAccount.id,
        toAccountId: cardAccount.id,
        fromAmount: amount,
        toAmount: amount,
        fromCurrency: sourceAccount.currency,
        toCurrency: cardAccount.currency,
        rate: 1,
        date,
        description,
        fromTxnId: fromTransaction.id,
        toTxnId: toTransaction.id,
      },
    });

    const newPaid = installment.paidAmount + amount;
    const newStatus = recalculateStatus(installment.amount, newPaid);
    const updatedInstallment = await tx.installment.update({
      where: { id: installment.id },
      data: {
        paidAmount: newPaid,
        paidDate: newStatus === "pagado" ? date : null,
        status: newStatus,
      },
    });

    const installments = await tx.installment.findMany({
      where: { installmentPlanId: plan.id, deletedAt: null },
      select: { amount: true, paidAmount: true },
    });
    const allPaid =
      installments.length > 0 &&
      installments.every((item) => item.paidAmount >= item.amount);

    if (allPaid) {
      await tx.installmentPlan.update({
        where: { id: plan.id },
        data: { status: "pagado" },
      });
    }

    return {
      transfer,
      transaction: toTransaction,
      fromTransaction,
      installment: updatedInstallment,
    };
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




