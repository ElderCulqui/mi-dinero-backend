const db = require("@/config/db");
const { paginate } = require("@/helpers/paginationHelper");
const prisma = db.getClient();

const shareRelations = {
    transaction: {
        select: {
            id: true,
            date: true,
            description: true,
            amount: true,
            type: true,
            status: true,
            account: {
                select: {
                    id: true,
                    name: true,
                    currency: true,
                },
            },
            category: {
                select: {
                    id: true,
                    name: true,
                    color: true,
                    type: true,
                },
            },
        },
    },
};

const summarizeByCurrency = (shares, status) => {
    const totals = new Map();

    for (const share of shares) {
        if (share.status !== status) continue;

        const currency = share.transaction.account.currency;
        const current = totals.get(currency) ?? {
            currency,
            amountMinor: 0n,
            count: 0,
        };

        current.amountMinor += share.amount;
        current.count += 1;
        totals.set(currency, current);
    }

    return [...totals.values()].sort((a, b) =>
        a.currency.localeCompare(b.currency),
    );
};

exports.create = async (data) => {
    const conflict = await prisma.contact.findFirst({
        where: { name: data.name, userId: data.userId },
    })
    if (conflict) throw new Error("Ya existe un contacto con el mismo nombre");

    return prisma.contact.create({
        data: { ...data, userId: parseInt(data.userId) },
    });
};

exports.getById = async (id) =>
    prisma.contact.findUnique({ where: { id: parseInt(id) } });

exports.getShares = async (contactId, { status, page, pageSize } = {}) => {
    const where = {
        contactId: parseInt(contactId),
        transaction: { deletedAt: null },
    };
    if (status) where.status = status;

    return paginate("transactionShare", Number(page) || 1, Number(pageSize) || 10, {
        where,
        orderBy: [{ transaction: { date: "desc" } }, { id: "desc" }],
        include: shareRelations,
    });
};

exports.getSharesSummary = async (contactId) => {
    const shares = await prisma.transactionShare.findMany({
        where: {
            contactId: parseInt(contactId),
            transaction: { deletedAt: null },
        },
        select: {
            amount: true,
            status: true,
            transaction: {
                select: {
                    account: {
                        select: { currency: true },
                    },
                },
            },
        },
    });

    return {
        pending: summarizeByCurrency(shares, "pendiente"),
        collected: summarizeByCurrency(shares, "cobrado"),
    };
};

exports.getAll = async (userId) => 
    prisma.contact.findMany({ where: { userId: parseInt(userId) } });

exports.update = async(id, data) => {
    try {
        return await prisma.contact.update({ where: { id: parseInt(id) }, data });
    } catch (error) {
        if (error.code === "P2025") throw new Error("Contact not found");
        throw error;
    }
}

exports.delete = async(id) => {
    try {
        return await prisma.contact.delete({ where: { id: parseInt(id) } });
    } catch (error) {
        if (error.code === "P2025") throw new Error("Contact not found");
        throw error;
    }
}