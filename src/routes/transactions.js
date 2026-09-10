const { Router } = require("express");
const { body, query } = require("express-validator");
const controller = require("../controllers/transactionController");
const authenticateToken = require("../middlewares/auth");
const validateRequest = require("../middlewares/validateRequest");
const {
  existsActiveOwnedByUser,
  requireOwnership,
  paramIntId,
} = require("../middlewares/validators");
const { isInDateWindow } = require("@/helpers/dateValidators");

const router = Router();

const createRules = [
  existsActiveOwnedByUser("account", "body", "accountId", "Account"),
  body("type").isIn(["ingreso", "egreso"]),
  body("amount").isFloat({ min: 0 }).withMessage("amount numérico ≥ 0"),
  body("date").isISO8601(),
  isInDateWindow("body", "date"),
  body("categoryId").optional().isInt(),
  body("description").optional().isString(),
  body("billingCycleId").optional().isInt(),
];

const listQueryRules = [
  query("type").optional().isIn(["ingreso", "egreso"]),
  query("accountId").optional().isInt(),
  query("categoryId").optional().isInt(),
  query("source").optional().isIn(["manual", "loan", "installment", "reimbursement", "transfer"]),
  query("from").optional().isISO8601(),
  query("to").optional().isISO8601(),
];

router.post("/", authenticateToken, createRules, validateRequest, controller.create);
router.get("/", authenticateToken, listQueryRules, validateRequest, controller.getAll);
router.get(
  "/:id", 
  authenticateToken, 
  paramIntId(),
  validateRequest,
  requireOwnership("transaction", { notFoundMsg: "Transaction not found" }),
  controller.getById
);
router.delete(
  "/:id", 
  authenticateToken, 
  paramIntId(),
  validateRequest,
  requireOwnership("transaction", { notFoundMsg: "Transaction not found" }),
  controller.destroy
);

module.exports = router