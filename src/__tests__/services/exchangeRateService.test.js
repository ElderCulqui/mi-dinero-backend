const mockPrisma = {
    exchangeRate: {
        findFirst: jest.fn(),
    },
};

jest.mock("../../config/db", () => ({
    getClient: () => mockPrisma,
}));

const exchangeRateService = require("../../services/exchangeRateService");

const requestedDay = new Date("2026-10-15T00:00:00.000Z");

describe("exchangeRateService.getRateForDate", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, "warn").mockImplementation(() => {});
    });

    afterEach(() => {
        console.warn.mockRestore();
    });

    it("devuelve el tipo de cambio exacto del día", async () => {
        const exact = {
            id: 3,
            rate: 3.44,
            date: new Date("2026-10-15T00:00:00.000Z"),
        };
        mockPrisma.exchangeRate.findFirst.mockResolvedValueOnce(exact);

        const result = await exchangeRateService.getRateForDate(
            "USD",
            "PEN",
            "2026-10-15T12:00:00.000Z",
        );

        expect(result).toEqual({ ...exact, fallback: false });
        expect(mockPrisma.exchangeRate.findFirst).toHaveBeenCalledTimes(1);
        expect(mockPrisma.exchangeRate.findFirst).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    baseCurrency: "USD",
                    targetCurrency: "PEN",
                    side: "sell",
                    date: {
                        gte: requestedDay,
                        lt: new Date("2026-10-16T00:00:00.000Z"),
                    },
                },
            }),
        );
    });

    it("usa el tipo de cambio anterior más reciente cuando falta el del día", async () => {
        const previous = {
            id: 2,
            rate: 3.43,
            date: new Date("2026-10-10T00:00:00.000Z"),
        };
        mockPrisma.exchangeRate.findFirst
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(previous);

        const result = await exchangeRateService.getRateForDate(
            "USD",
            "PEN",
            "2026-10-15",
        );

        expect(result).toEqual({ ...previous, fallback: true });
        expect(mockPrisma.exchangeRate.findFirst).toHaveBeenNthCalledWith(2, {
            where: {
                baseCurrency: "USD",
                targetCurrency: "PEN",
                side: "sell",
                date: { lte: requestedDay },
            },
            orderBy: { date: "desc" },
        });
    });

    it("usa el primero posterior cuando la fecha es anterior a todo el histórico", async () => {
        const next = {
            id: 1,
            rate: 3.41,
            date: new Date("2026-11-02T00:00:00.000Z"),
        };
        mockPrisma.exchangeRate.findFirst
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(next);

        const result = await exchangeRateService.getRateForDate(
            "USD",
            "PEN",
            "2026-10-01",
        );

        expect(result).toEqual({ ...next, fallback: true });
        expect(mockPrisma.exchangeRate.findFirst).toHaveBeenNthCalledWith(3, {
            where: {
                baseCurrency: "USD",
                targetCurrency: "PEN",
                side: "sell",
                date: { gt: new Date("2026-10-01T00:00:00.000Z") },
            },
            orderBy: { date: "asc" },
        });
    });

    it("devuelve null cuando no hay ningún tipo de cambio registrado", async () => {
        mockPrisma.exchangeRate.findFirst.mockResolvedValue(null);

        const result = await exchangeRateService.getRateForDate(
            "USD",
            "PEN",
            "2026-10-15",
        );

        expect(result).toBeNull();
        expect(mockPrisma.exchangeRate.findFirst).toHaveBeenCalledTimes(3);
    });
});
