jest.mock("../../config/db", () => ({
  getClient: jest.fn().mockReturnValue({
    account: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  }),
}));

jest.mock("../../helpers/paginationHelper", () => ({
  paginate: jest.fn(),
}));

const accountService = require("../../services/accountService");
const db = require("../../config/db");
const { paginate } = require("../../helpers/paginationHelper");

const prisma = db.getClient();

describe("accountService", () => {
  describe("createAccount", () => {
    it("should throw if an account with the same name and type already exists", async () => {
      prisma.account.findFirst.mockResolvedValue({
        id: 1,
        name: "Savings",
        type: "cuenta_bancaria",
      });

      await expect(
        accountService.createAccount({
          name: "Savings",
          type: "cuenta_bancaria",
        }),
      ).rejects.toThrow("La cuenta con el mismo nombre y tipo ya existe");

      expect(prisma.account.findFirst).toHaveBeenCalledWith({
        where: { name: "Savings", type: "cuenta_bancaria" },
      });
    });

    it("should create and return the account when no conflict exists", async () => {
      const newAccount = { id: 2, name: "Cash", type: "efectivo" };
      prisma.account.findFirst.mockResolvedValue(null);
      prisma.account.create.mockResolvedValue(newAccount);

      const result = await accountService.createAccount({
        name: "Cash",
        type: "efectivo",
      });

      expect(result).toEqual(newAccount);
      expect(prisma.account.create).toHaveBeenCalledWith({
        data: { name: "Cash", type: "efectivo" },
      });
    });
  });

  describe("getAccountById", () => {
    it("should return the account for the given id", async () => {
      const account = { id: 1, name: "Savings" };
      prisma.account.findUnique.mockResolvedValue(account);

      const result = await accountService.getAccountById("1");

      expect(result).toEqual(account);
      expect(prisma.account.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it("should return null if account is not found", async () => {
      prisma.account.findUnique.mockResolvedValue(null);

      const result = await accountService.getAccountById("99");

      expect(result).toBeNull();
    });
  });

  describe("getAccounts", () => {
    it("should return paginated accounts", async () => {
      const paginatedResult = {
        data: [{ id: 1 }, { id: 2 }],
        pagination: { page: 1, pageSize: 10, total: 2, totalPages: 1 },
      };
      paginate.mockResolvedValue(paginatedResult);

      const result = await accountService.getAccounts();

      expect(result).toEqual(paginatedResult);
      expect(paginate).toHaveBeenCalledWith("account");
    });
  });

  describe.only("updateAccount", () => {
    it("should update and return the account", async () => {
      const updatedAccount = { id: 1, name: "Updated Savings" };
      prisma.account.update.mockResolvedValue(updatedAccount);

      const result = await accountService.updateAccount("1", {
        name: "Updated Savings",
      });

      expect(result).toEqual(updatedAccount);
      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { name: "Updated Savings" },
      });
    });

    it("should throw an error if the account does not exist", async () => {
      const prismaError = new Error("Record to update not found.");
      prismaError.code = "P2025";

      prisma.account.update.mockRejectedValue(prismaError);

      await expect(
        accountService.updateAccount("99", { name: "Nonexistent Account" }),
      ).rejects.toThrow("Record to update not found.");

      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: 99 },
        data: { name: "Nonexistent Account" },
      });
    });
  });
});
