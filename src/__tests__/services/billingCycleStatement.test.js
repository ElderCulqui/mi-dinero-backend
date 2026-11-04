const mockPrisma = {
    billingCycle: {
        findUnique: jest.fn(),
        update: jest.fn(),
    },
    account: { update: jest.fn() },
    $transaction: jest.fn(async (fn) => fn(mockPrisma)),
};

jest.mock("../../config/db", () => ({
    getClient: () => mockPrisma,
}));

const service = require("../../services/billingCycleService");

const cycle = {
    id: 12,
    userId: 1,
    creditCardId: 4,
    periodStart: new Date("2026-10-11T00:00:00.000Z"),
    periodEnd: new Date("2026-11-10T23:59:59.999Z"),
    dueDate: new Date("2026-12-07T00:00:00.000Z"),
    bankAmount: null,
    totalBalanceMinor: null,
    totalBalanceUsdMinor: null,
    creditCard: {
        bankCurrency: "PEN",
        accounts: [
            { id: 22, currency: "PEN" },
            { id: 23, currency: "USD" },
        ],
    },
};

describe("billingCycleService.updateStatement", () => {
    beforeEach(() => jest.clearAllMocks());

    it("guarda el estado y actualiza el saldo de las cuentas al cierre", async () => {
        mockPrisma.billingCycle.findUnique.mockResolvedValue(cycle);
        mockPrisma.billingCycle.update.mockImplementation(
            async ({ data }) => ({ ...cycle, ...data }),
        );
        mockPrisma.account.update.mockImplementation(
            async ({ data }) => ({ ...data }),
        );

        const result = await service.updateStatement(12, {
            bankAmount: "10000",
            totalBalanceMinor: "20000",
            totalBalanceUsdMinor: "1000",
            lineUsedMinor: "50000",
            status: "cerrado",
            updateAccountBalance: true,
        });

        expect(result.bankAmount).toBe(10000n);
        expect(result.lineUsedMinor).toBe(50000n);
        expect(result.status).toBe("cerrado");
        expect(mockPrisma.account.update).toHaveBeenCalledWith({
            where: { id: 22 },
            data: {
                openingBalanceMinor: 20000n,
                openingBalanceDate: new Date("2026-11-11T00:00:00.000Z"),
            },
        });
        expect(mockPrisma.account.update).toHaveBeenCalledWith({
            where: { id: 23 },
            data: {
                openingBalanceMinor: 1000n,
                openingBalanceDate: new Date("2026-11-11T00:00:00.000Z"),
            },
        });
    });

    it("exige el saldo total si se actualiza la cuenta", async () => {
        mockPrisma.billingCycle.findUnique.mockResolvedValue(cycle);
        mockPrisma.billingCycle.update.mockResolvedValue(cycle);

        await expect(
            service.updateStatement(12, {
                bankAmount: "10000",
                updateAccountBalance: true,
            }),
        ).rejects.toMatchObject({ status: 400 });
    });
});
