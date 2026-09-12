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
  body("bankAmount").optional().isFloat({ min: 0 }).withMessage("bankAmount numérico ≥ 0"),
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
  body("bankAmount").optional({ nullable: true }).isFloat({ min: 0 }),
  body("status").optional().isIn(["abierto", "cerrado", "pagado"]),
  isInDateWindow("body", "periodStart"),
  isInDateWindow("body", "periodEnd"),
  isInDateWindow("body", "dueDate"),
  dateAfter("body", "periodEnd", "periodStart", { allowEqual: false, label: "periodEnd" }),
  dateAfter("body", "dueDate", "periodEnd", { allowEqual: true }),
  maxDaysApart("body", "periodEnd", "periodStart", 31),
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