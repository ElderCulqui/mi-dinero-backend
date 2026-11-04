const mockPrisma = {
    billingCycle: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
    },
    transaction: {
        findMany: jest.fn(),
    },
    installment: {
        findMany: jest.fn(),
    },
    exchangeRate: {
        findFirst: jest.fn(),
    },
};

jest.mock("../../config/db", () => ({
    getClient: () => mockPrisma,
}));

const billingCycleService = require("../../services/billingCycleService");

const cycle = {
    id: 12,
    creditCardId: 4,
    periodStart: new Date("2026-10-09T00:00:00.000Z"),
    periodEnd: new Date("2026-11-09T00:00:00.000Z"),
    dueDate: new Date("2026-12-07T00:00:00.000Z"),
    bankAmount: null,
    creditCard: { id: 4, bankCurrency: "PEN" },
};

const previousCycle = {
    id: 11,
    dueDate: new Date("2026-11-05T00:00:00.000Z"),
};

describe("billingCycleService.getSummary", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockPrisma.billingCycle.findUnique.mockResolvedValue(cycle);
        mockPrisma.transaction.findMany.mockResolvedValue([]);
        mockPrisma.installment.findMany.mockResolvedValue([]);
    });

    it("atribuye las cuotas desde el vencimiento del ciclo anterior", async () => {
        mockPrisma.billingCycle.findFirst.mockResolvedValue(previousCycle);

        await billingCycleService.getSummary(12);

        expect(mockPrisma.billingCycle.findFirst).toHaveBeenCalledWith({
            where: { creditCardId: 4, dueDate: { lt: cycle.dueDate } },
            orderBy: { dueDate: "desc" },
        });
        expect(mockPrisma.installment.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    dueDate: {
                        gt: previousCycle.dueDate,
                        lte: cycle.dueDate,
                    },
                }),
            }),
        );
    });

    it("sin ciclo anterior no pone limite inferior", async () => {
        mockPrisma.billingCycle.findFirst.mockResolvedValue(null);

        await billingCycleService.getSummary(12);

        expect(mockPrisma.installment.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    dueDate: { lte: cycle.dueDate },
                }),
            }),
        );
    });
});
