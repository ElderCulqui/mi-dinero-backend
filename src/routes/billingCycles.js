const { Router } = require("express");
const { body } = require("express-validator");
const controller = require("../controllers/billingCycleController");
const authenticateToken = require("../middlewares/auth");
const validateRequest = require("../middlewares/validateRequest");
const { 
  existsActiveOwnedByUser,
  requireOwnership,
  paramIntId
} = require("../middlewares/validators");
const {
  isInDateWindow,
  dateAfter,
  maxDaysApart
} = require("@/helpers/dateValidators");
const { noBillingCycleOverlap } = require("../middlewares/validators/domainValidators");

const router = Router();

const createRules = [
  existsActiveOwnedByUser("creditCard", "body", "creditCardId", "CreditCard"),
  body("periodStart").isISO8601().withMessage("periodStart ISO8601"),
  body("periodEnd").isISO8601().withMessage("periodEnd ISO8601"),
  body("dueDate").isISO8601().withMessage("dueDate ISO8601"),
  body("bankAmount")
    .optional({ nullable: true })
    .isString()
    .matches(/^(0|[1-9]\d*)$/)
    .withMessage("bankAmount debe ser una cadena entera en unidades menores"),
  isInDateWindow("body", "periodStart"),
  isInDateWindow("body", "periodEnd"),
  isInDateWindow("body", "dueDate"),
  dateAfter("body", "periodEnd", "periodStart", { allowEqual: false, label: "periodEnd" }),
  dateAfter("body", "dueDate", "periodEnd", { allowEqual: true }),
  maxDaysApart("body", "periodEnd", "periodStart", 31),
  noBillingCycleOverlap(),
];

const updateRules = [
  body("periodStart").optional().isISO8601(),
  body("periodEnd").optional().isISO8601(),
  body("dueDate").optional().isISO8601(),
  body("bankAmount")
    .optional({ nullable: true })
    .isString()
    .matches(/^(0|[1-9]\d*)$/)
    .withMessage("bankAmount debe ser una cadena entera en unidades menores"),
  body("status").optional().isIn(["abierto", "cerrado", "pagado"]),
  isInDateWindow("body", "periodStart"),
  isInDateWindow("body", "periodEnd"),
  isInDateWindow("body", "dueDate"),
  dateAfter("body", "periodEnd", "periodStart", { allowEqual: false, label: "periodEnd" }),
  dateAfter("body", "dueDate", "periodEnd", { allowEqual: true }),
  maxDaysApart("body", "periodEnd", "periodStart", 31),
];

const statementMinorRule = (field) =>
  body(field)
    .optional({ nullable: true })
    .isString()
    .matches(/^(0|[1-9]\d*)$/)
    .withMessage(`${field} debe ser una cadena entera en unidades menores`);

const statementRules = [
  statementMinorRule("bankAmount"),
  statementMinorRule("bankAmountUsd"),
  statementMinorRule("minimumPaymentMinor"),
  statementMinorRule("minimumPaymentUsdMinor"),
  statementMinorRule("totalBalanceMinor"),
  statementMinorRule("totalBalanceUsdMinor"),
  statementMinorRule("lineUsedMinor"),
  statementMinorRule("paidAmountMinor"),
  statementMinorRule("paidAmountUsdMinor"),
  body("paidDate").optional({ nullable: true }).isISO8601(),
  body("status").optional().isIn(["abierto", "cerrado", "pagado"]),
  body("updateAccountBalance").optional().isBoolean(),
];

router.post(
  "/", 
  authenticateToken, 
  createRules, 
  validateRequest, 
  controller.create
);

router.get(
  "/:id/summary",
  authenticateToken,
  paramIntId(),
  validateRequest,
  requireOwnership("billingCycle", { notFoundMsg: "BillingCycle not found" }),
  controller.getSummary
);

router.put(
  "/:id/statement",
  authenticateToken,
  paramIntId(),
  statementRules,
  validateRequest,
  requireOwnership("billingCycle", { notFoundMsg: "BillingCycle not found" }),
  controller.updateStatement
);

router.put(
  "/:id",
  authenticateToken,
  paramIntId(),
  updateRules,
  validateRequest,
  requireOwnership("billingCycle", { notFoundMsg: "BillingCycle not found" }),
  controller.update
);

router.get(
  "/:id", 
  authenticateToken, 
  paramIntId(), 
  validateRequest,
  requireOwnership("billingCycle", { notFoundMsg: "BillingCycle not found" }),
  controller.getById
);

router.get("/", authenticateToken, controller.getAll);

router.delete(
  "/:id", 
  authenticateToken, 
  paramIntId(),
  validateRequest,
  requireOwnership("billingCycle", { notFoundMsg: "BillingCycle not found" }),
  controller.destroy
);

module.exports = router