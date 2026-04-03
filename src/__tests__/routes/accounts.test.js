// Bypass JWT authentication for all route tests
jest.mock("../../middlewares/auth", () => (req, res, next) => {
  req.user = { id: 1 };
  next();
});

// Mock Prisma — used directly in the route for the userId custom validator
jest.mock("../../config/db", () => ({
  getClient: jest.fn().mockReturnValue({
    user: { findUnique: jest.fn() },
    account: { findFirst: jest.fn(), create: jest.fn(), findUnique: jest.fn() },
  }),
}));

// Mock the service layer so tests don't hit the database
jest.mock("../../services/accountService");

const request = require("supertest");
const express = require("express");
const accountsRouter = require("../../routes/accounts");
const accountService = require("../../services/accountService");
const db = require("../../config/db");

const app = express();
app.use(express.json());
app.use("/accounts", accountsRouter);

const prisma = db.getClient();

describe("Accounts routes", () => {
  describe("POST /accounts", () => {
    beforeEach(() => {
      // Default: userId exists in DB
      prisma.user.findUnique.mockResolvedValue({ id: 1, name: "Test User" });
    });

    it("should return 400 if name is missing", async () => {
      const res = await request(app)
        .post("/accounts")
        .send({ userId: 1, type: "efectivo" });

      expect(res.status).toBe(400);
    });

    it("should return 400 if userId is missing", async () => {
      const res = await request(app)
        .post("/accounts")
        .send({ name: "Cash", type: "efectivo" });

      expect(res.status).toBe(400);
    });

    it("should return 400 if userId is not a number", async () => {
      const res = await request(app)
        .post("/accounts")
        .send({ name: "Cash", userId: "abc", type: "efectivo" });

      expect(res.status).toBe(400);
    });

    it("should return 400 if userId does not exist in the database", async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post("/accounts")
        .send({ name: "Cash", userId: 999, type: "efectivo" });

      expect(res.status).toBe(400);
    });

    it("should return 400 if type is invalid", async () => {
      const res = await request(app)
        .post("/accounts")
        .send({ name: "Cash", userId: 1, type: "invalid_type" });

      expect(res.status).toBe(400);
    });

    it("should return 400 if creditLimit is missing for tarjeta_credito", async () => {
      const res = await request(app)
        .post("/accounts")
        .send({ name: "Card", userId: 1, type: "tarjeta_credito" });

      expect(res.status).toBe(400);
    });

    it("should return 201 with the created account when all data is valid", async () => {
      const created = { id: 1, name: "Mi Cuenta", userId: 1, type: "efectivo" };
      accountService.createAccount.mockResolvedValue(created);

      const res = await request(app)
        .post("/accounts")
        .send({ name: "Mi Cuenta", userId: 1, type: "efectivo" });

      expect(res.status).toBe(201);
      expect(res.body).toEqual(created);
    });

    it("should return 201 for tarjeta_credito with valid creditLimit", async () => {
      const created = { id: 2, name: "Card", userId: 1, type: "tarjeta_credito", creditLimit: 5000 };
      accountService.createAccount.mockResolvedValue(created);

      const res = await request(app)
        .post("/accounts")
        .send({ name: "Card", userId: 1, type: "tarjeta_credito", creditLimit: 5000 });

      expect(res.status).toBe(201);
      expect(res.body).toEqual(created);
    });
  });

  describe("GET /accounts/:id", () => {
    it("should return 200 with the account", async () => {
      const account = { id: 1, name: "Cash" };
      accountService.getAccountById.mockResolvedValue(account);

      const res = await request(app).get("/accounts/1");

      expect(res.status).toBe(200);
      expect(res.body).toEqual(account);
    });

    it("should return 404 if account is not found", async () => {
      accountService.getAccountById.mockResolvedValue(null);

      const res = await request(app).get("/accounts/99");

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: "Account not found" });
    });
  });

  describe("GET /accounts", () => {
    it("should return 200 with a paginated list of accounts", async () => {
      const result = {
        data: [{ id: 1, name: "Cash" }],
        pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
      };
      accountService.getAccounts.mockResolvedValue(result);

      const res = await request(app).get("/accounts");

      expect(res.status).toBe(200);
      expect(res.body).toEqual(result);
    });
  });
});
