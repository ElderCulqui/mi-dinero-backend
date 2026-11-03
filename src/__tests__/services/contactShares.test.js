const mockPrisma = {
    transactionShare: {
        findMany: jest.fn(),
        count: jest.fn(),
    },
};

jest.mock("../../config/db", () => ({
    getClient: () => mockPrisma,
}));

const contactService = require("../../services/contactService");

describe("contactService shares", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("pagina los repartos del contacto con su transacción original", async () => {
        mockPrisma.transactionShare.findMany.mockResolvedValue([{ id: 6 }]);
        mockPrisma.transactionShare.count.mockResolvedValue(12);

        const result = await contactService.getShares(3, {
            page: "2",
            pageSize: "5",
            status: "pendiente",
        });

        expect(mockPrisma.transactionShare.findMany).toHaveBeenCalledWith({
            skip: 5,
            take: 5,
            where: {
                contactId: 3,
                status: "pendiente",
                transaction: { deletedAt: null },
            },
            orderBy: [{ transaction: { date: "desc" } }, { id: "desc" }],
            include: expect.objectContaining({
                transaction: expect.objectContaining({
                    select: expect.objectContaining({
                        date: true,
                        description: true,
                        account: expect.any(Object),
                    }),
                }),
            }),
        });
        expect(mockPrisma.transactionShare.count).toHaveBeenCalledWith({
            where: {
                contactId: 3,
                status: "pendiente",
                transaction: { deletedAt: null },
                deletedAt: null,
            },
        });
        expect(result).toEqual({
            data: [{ id: 6 }],
            pagination: {
                page: 2,
                pageSize: 5,
                total: 12,
                totalPages: 3,
                hasNextPage: true,
                hasPreviousPage: true,
            },
        });
    });

    it("usa la primera página y 10 filas cuando no se envían parámetros", async () => {
        mockPrisma.transactionShare.findMany.mockResolvedValue([]);
        mockPrisma.transactionShare.count.mockResolvedValue(0);

        await contactService.getShares("3");

        expect(mockPrisma.transactionShare.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                skip: 0,
                take: 10,
                where: {
                    contactId: 3,
                    transaction: { deletedAt: null },
                },
            }),
        );
    });

    it("agrupa pendientes y cobrados por la divisa de la transacción", async () => {
        mockPrisma.transactionShare.findMany.mockResolvedValue([
            {
                amount: 1000n,
                status: "pendiente",
                transaction: { account: { currency: "PEN" } },
            },
            {
                amount: 500n,
                status: "pendiente",
                transaction: { account: { currency: "PEN" } },
            },
            {
                amount: 900n,
                status: "pendiente",
                transaction: { account: { currency: "USD" } },
            },
            {
                amount: 2000n,
                status: "cobrado",
                transaction: { account: { currency: "PEN" } },
            },
        ]);

        const result = await contactService.getSharesSummary(3);

        expect(mockPrisma.transactionShare.findMany).toHaveBeenCalledWith({
            where: {
                contactId: 3,
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
        expect(result).toEqual({
            pending: [
                { currency: "PEN", amountMinor: 1500n, count: 2 },
                { currency: "USD", amountMinor: 900n, count: 1 },
            ],
            collected: [{ currency: "PEN", amountMinor: 2000n, count: 1 }],
        });
    });

    it("devuelve listas vacías cuando el contacto no tiene repartos", async () => {
        mockPrisma.transactionShare.findMany.mockResolvedValue([]);

        await expect(contactService.getSharesSummary(9)).resolves.toEqual({
            pending: [],
            collected: [],
        });
    });
});
