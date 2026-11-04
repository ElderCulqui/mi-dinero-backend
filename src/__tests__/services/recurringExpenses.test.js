const mockPrisma = {
    account: { findFirst: jest.fn() },
    category: { findFirst: jest.fn() },
    recurringExpense: { create: jest.fn() },
};

jest.mock("../../config/db", () => ({
    getClient: () => mockPrisma,
}));

const service = require("../../services/recurringExpenseService");

describe("recurringExpenseService.create", () => {
    beforeEach(() => jest.clearAllMocks());

    it("deriva la divisa de la cuenta y normaliza el monto", async () => {
        mockPrisma.account.findFirst.mockResolvedValue({
            id: 22,
            currency: "PEN",
        });
        mockPrisma.category.findFirst.mockResolvedValue({ id: 7 });
        mockPrisma.recurringExpense.create.mockImplementation(async ({ data }) => ({
            id: 1,
            ...data,
        }));

        const result = await service.create(1, {
            accountId: 22,
            categoryId: 7,
            name: "Prime",
            amountMinor: "2590",
            dayOfMonth: 23,
        });

        expect(result.currency).toBe("PEN");
        expect(result.amountMinor).toBe(2590n);
        expect(mockPrisma.recurringExpense.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    userId: 1,
                    accountId: 22,
                    categoryId: 7,
                    name: "Prime",
                    amountMinor: 2590n,
                    currency: "PEN",
                    dayOfMonth: 23,
                    isActive: true,
                }),
            }),
        );
    });

    it("rechaza un día fuera del rango 1-28", async () => {
        mockPrisma.account.findFirst.mockResolvedValue({
            id: 22,
            currency: "PEN",
        });

        await expect(
            service.create(1, {
                accountId: 22,
                name: "Prime",
                amountMinor: "2590",
                dayOfMonth: 29,
            }),
        ).rejects.toMatchObject({ status: 400 });
    });
});
