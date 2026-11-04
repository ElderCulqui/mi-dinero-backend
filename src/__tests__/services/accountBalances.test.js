const mockPrisma = {
  account: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
  transaction: {
    groupBy: jest.fn(),
  },
};

jest.mock("../../config/db", () => ({
  getClient: () => mockPrisma,
}));

const accountService = require("../../services/accountService");

const bankAccount = {
  id: 1,
  userId: 7,
  name: "Banco",
  type: "cuenta_bancaria",
  currency: "PEN",
  openingBalanceMinor: 10000n,
  openingBalanceDate: new Date("2026-11-03T00:00:00.000Z"),
  creditLimit: null,
};

describe("accountService balances", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.user.findUnique.mockResolvedValue({
      timezone: "America/Lima",
    });
  });

  it("calcula el saldo actual solo con movimientos desde la fecha de apertura", async () => {
    mockPrisma.account.findMany.mockResolvedValue([bankAccount]);
    mockPrisma.transaction.groupBy.mockResolvedValue([
      { type: "ingreso", _sum: { amount: 2500n } },
      { type: "egreso", _sum: { amount: 1000n } },
    ]);

    const [account] = await accountService.getAll(7);

    expect(account.currentBalanceMinor).toBe(11500n);
    expect(mockPrisma.transaction.groupBy).toHaveBeenCalledWith({
      by: ["type"],
      where: {
        accountId: 1,
        userId: 7,
        deletedAt: null,
        status: "ejecutado",
        date: { gte: new Date("2026-11-03T05:00:00.000Z") },
      },
      _sum: { amount: true },
    });
  });

  it("calcula deuda y crédito disponible en tarjetas", async () => {
    mockPrisma.account.findMany.mockResolvedValue([
      {
        ...bankAccount,
        id: 2,
        type: "tarjeta_credito",
        openingBalanceMinor: 50000n,
        creditLimit: 100000n,
      },
    ]);
    mockPrisma.transaction.groupBy.mockResolvedValue([
      { type: "egreso", _sum: { amount: 3000n } },
      { type: "ingreso", _sum: { amount: 1000n } },
    ]);

    const [account] = await accountService.getAll(7);

    expect(account.debtMinor).toBe(52000n);
    expect(account.currentBalanceMinor).toBe(52000n);
    expect(account.availableCreditMinor).toBe(48000n);
  });

  it("devuelve null si la cuenta no existe", async () => {
    mockPrisma.account.findUnique.mockResolvedValue(null);

    await expect(accountService.getById(99)).resolves.toBeNull();
    expect(mockPrisma.transaction.groupBy).not.toHaveBeenCalled();
  });
});
