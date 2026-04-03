jest.mock("../../services/accountService");

const accountController = require("../../controllers/accountController");
const accountService = require("../../services/accountService");

const mockReq = (body = {}, params = {}) => ({ body, params });
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("accountController", () => {
  describe("createAccount", () => {
    it("should return 201 with the created account", async () => {
      const account = { id: 1, name: "Cash", type: "efectivo" };
      accountService.createAccount.mockResolvedValue(account);

      const req = mockReq({ name: "Cash", type: "efectivo" });
      const res = mockRes();

      await accountController.createAccount(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(account);
    });

    it("should return 400 with error message if service throws", async () => {
      accountService.createAccount.mockRejectedValue(
        new Error("La cuenta con el mismo nombre y tipo ya existe"),
      );

      const req = mockReq({ name: "Savings", type: "cuenta_bancaria" });
      const res = mockRes();

      await accountController.createAccount(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "La cuenta con el mismo nombre y tipo ya existe",
      });
    });
  });

  describe("getAccount", () => {
    it("should return 200 with the account", async () => {
      const account = { id: 1, name: "Cash" };
      accountService.getAccountById.mockResolvedValue(account);

      const req = mockReq({}, { id: "1" });
      const res = mockRes();

      await accountController.getAccount(req, res);

      expect(res.json).toHaveBeenCalledWith(account);
    });

    it("should return 404 if account is not found", async () => {
      accountService.getAccountById.mockResolvedValue(null);

      const req = mockReq({}, { id: "99" });
      const res = mockRes();

      await accountController.getAccount(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "Account not found" });
    });

    it("should return 500 on unexpected error", async () => {
      accountService.getAccountById.mockRejectedValue(new Error("DB error"));

      const req = mockReq({}, { id: "1" });
      const res = mockRes();

      await accountController.getAccount(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "DB error" });
    });
  });

  describe("getAccounts", () => {
    it("should return 200 with the accounts list", async () => {
      const accounts = { data: [{ id: 1 }], pagination: { page: 1 } };
      accountService.getAccounts.mockResolvedValue(accounts);

      const req = mockReq();
      const res = mockRes();

      await accountController.getAccounts(req, res);

      expect(res.json).toHaveBeenCalledWith(accounts);
    });

    it("should return 500 on unexpected error", async () => {
      accountService.getAccounts.mockRejectedValue(new Error("DB error"));

      const req = mockReq();
      const res = mockRes();

      await accountController.getAccounts(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "DB error" });
    });
  });
});
