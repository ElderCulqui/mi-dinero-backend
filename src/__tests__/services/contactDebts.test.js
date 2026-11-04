const mockPrisma = {
    contact: { findFirst: jest.fn() },
    contactDebt: { findMany: jest.fn() },
};

jest.mock("../../config/db", () => ({
    getClient: () => mockPrisma,
}));

const service = require("../../services/contactDebtService");

describe("contactDebtService.getSummary", () => {
    beforeEach(() => jest.clearAllMocks());

    it("agrupa pendientes por dirección y divisa", async () => {
        mockPrisma.contact.findFirst.mockResolvedValue({ id: 9 });
        mockPrisma.contactDebt.findMany.mockResolvedValue([
            { direction: "por_pagar", currency: "PEN", amountMinor: 160000n },
            { direction: "por_pagar", currency: "PEN", amountMinor: 98000n },
            { direction: "por_pagar", currency: "USD", amountMinor: 5000n },
            { direction: "por_cobrar", currency: "PEN", amountMinor: 10000n },
        ]);

        const result = await service.getSummary(1, 9);

        expect(mockPrisma.contactDebt.findMany).toHaveBeenCalledWith({
            where: { contactId: 9, userId: 1, status: "pendiente" },
            select: {
                direction: true,
                currency: true,
                amountMinor: true,
            },
        });
        expect(result).toEqual({
            por_pagar: [
                { currency: "PEN", amountMinor: 258000n, count: 2 },
                { currency: "USD", amountMinor: 5000n, count: 1 },
            ],
            por_cobrar: [{ currency: "PEN", amountMinor: 10000n, count: 1 }],
        });
    });

    it("devuelve listas vacías si el contacto no tiene deudas", async () => {
        mockPrisma.contact.findFirst.mockResolvedValue({ id: 9 });
        mockPrisma.contactDebt.findMany.mockResolvedValue([]);

        await expect(service.getSummary(1, 9)).resolves.toEqual({
            por_pagar: [],
            por_cobrar: [],
        });
    });
});
