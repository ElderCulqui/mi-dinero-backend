const db = require("@/config/db");
const { convertToBase } = require("@/helpers/currencyHelper");
const prisma = db.getClient();

const toInt = (v) =>
    v === undefined || v === null || v === "" ? undefined : parseInt(v);

exports.split = async (transactionId, userId, shares) => {
    const txnId = parseInt(transactionId);
    const txn = await prisma.transaction.findUnique({ where: { id: txnId} });
    if (!txn) throw new Error("Transaction not found");
    if (txn.userId !== userId) throw new Error("No autorizado");
    if (txn.type !== "egreso")
        throw new Error("Solo se pueden repartir transacciones de egreso");

    if (!Array.isArray(shares) || shares.length === 0)
        throw new Error("Debes enviar al menos un share");

    const parsed = shares.map((s) => ({
        contactId: toInt(s.contactId),
        amount: Number(s.amount)
    }));

    if (new Set(parsed.map((s) => s.contactId)).size !== parsed.length)
        throw new Error("No se puede repetir un contacto en el reparto");
    if (parsed.some((s) => !(s.amount > 0)))
        throw new Error("Cada share debe tener un monto > 0");

    const contactIds = parsed.map((s) => s.contactId);
    const contacts = await prisma.contact.findMany({
        where: { id: { in: contactIds }, userId },
    });
    if (contacts.length !== contactIds.length)
        throw new Error("Algún contacto no existe o no pertenece al usuario");
    
    const sum = parsed.reduce((acc, s) => acc + s.amount, 0);
    if (sum > txn.amount + 1e-9)
        throw new Error("La suma de los shares no puede superar el monto de la transacción");

    const now = new Date();
    const ops = [
        prisma.transactionShare.updateMany({
            where: { transactionId: txnId, deletedAt: null, status: "pendiente" },
            data: { deletedAt: now },
        }),
        ...parsed.map((s) => 
            prisma.transactionShare.create({
                data: {
                    transactionId: txnId,
                    contactId: s.contactId,
                    amount: s.amount,
                    status: "pendiente",
                },
            })
        ),
    ];

    const result = await prisma.$transaction(ops);
    return result.slice(1);
}

exports.getByTransaction = async (transactionId) => 
    prisma.transactionShare.findMany({
        where: { transactionId: parseInt(transactionId) },
        include: { contact: true },
        orderBy: { id: "asc" },
    });

exports.markCollected = async (shareId, data) => {
    const id = parseInt(shareId);
    const share = await prisma.transactionShare.findUnique({ where: { id } });
    if (!share) throw new Error("TransactionShare not found");
    if (share.status === "cobrado") throw new Error("El share ya fue cobrado");

    const parent = await prisma.transaction.findUnique({
        where: { id: share.transactionId },
    });
    if (!parent) throw new Error("Transaction not found");
    const userId = parent.userId;

    const accountId = toInt(data.accountId);
    const account = await prisma.account.findUnique({ where: { id: accountId } });
    if (!account) throw new Error("Account no existe o fue eliminada");
    if (account.userId !== userId) throw new Error("No autorizado");

    const settlementCurrency = data.settlementCurrency || account.currency;
    const settlementAmount = Number(data.settlementAmount);
    const hasRate = 
        data.settlementRate !== undefined &&
        data.settlementRate !== null &&
        data.settlementRate !== "";
    const settlementRate = hasRate ? Number(data.settlementRate) : null;
    const date = data.date ? new Date(data.date) : new Date();
    const amountBase = await convertToBase(settlementAmount, account.currency, date);

    return prisma.$transaction(async (tx) => {
        const txn = await tx.transaction.create({
            data: {
                userId,
                accountId: account.id,
                categoryId:
                    data.categoryId !== undefined ? toInt(data.categoryId) ?? null : null,
                type: "ingreso",
                amount: settlementAmount,
                amountBase,
                description: data.description || "Cobro de share",
                date,
                source: "reimbursement",
            },
        });

        return tx.transactionShare.update({
            where: { id },
            data: {
                status: "cobrado",
                paidDate: date,
                settlementRate,
                settlementCurrency,
                settlementAmount,
                reimbursementTxnId: txn.id,
            },
            include: { contact: true, reimbursementTxn: true},
        });
    });
};