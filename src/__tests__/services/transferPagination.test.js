const mockPrisma = {
    transfer: {
        findMany: jest.fn(),
        count: jest.fn(),
    },
};

jest.mock("../../config/db", () => ({
    getClient: () => mockPrisma,
}));

const transferService = require("../../services/transferService");

const listOptions = {
    where: { userId: 7 },
    orderBy: [{ date: "desc" }, { id: "desc" }],
    include: { fromAccount: true, toAccount: true },
};

describe("transferService.getAll", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("mantiene la respuesta en array cuando no se pide paginación", async () => {
        mockPrisma.transfer.findMany.mockResolvedValue([{ id: 1 }]);

        const result = await transferService.getAll(7);

        expect(result).toEqual([{ id: 1 }]);
        expect(mockPrisma.transfer.findMany).toHaveBeenCalledWith(listOptions);
        expect(mockPrisma.transfer.count).not.toHaveBeenCalled();
    });

    it("devuelve data y pagination cuando se pide una página", async () => {
        mockPrisma.transfer.findMany.mockResolvedValue([{ id: 6 }]);
        mockPrisma.transfer.count.mockResolvedValue(12);

        const result = await transferService.getAll(7, { page: 2, pageSize: 5 });

        expect(mockPrisma.transfer.findMany).toHaveBeenCalledWith({
            skip: 5,
            take: 5,
            ...listOptions,
        });
        expect(mockPrisma.transfer.count).toHaveBeenCalledWith({
            where: { userId: 7, deletedAt: null },
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

    it("convierte un userId en cadena antes de filtrar", async () => {
        mockPrisma.transfer.findMany.mockResolvedValue([]);
        mockPrisma.transfer.count.mockResolvedValue(0);

        await transferService.getAll("7", { page: 1, pageSize: 10 });

        expect(mockPrisma.transfer.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: { userId: 7 } }),
        );
    });
});
