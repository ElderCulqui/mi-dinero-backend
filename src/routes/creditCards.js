const { Router } = require("express");
const { body, query } = require("express-validator");
const controller = require("../controllers/creditCardController");
const billingCycleController = require("../controllers/billingCycleController");
const authenticateToken = require("../middlewares/auth");
const validateRequest = require("../middlewares/validateRequest");
const { requireOwnership, paramIntId, noBillingCycleOverlap } = require("../middlewares/validators");
const { isInDateWindow, dateAfter, maxDaysApart } = require("@/helpers/dateValidators");

const router = Router();

const rules = [
  body("name").isString().withMessage("Name requerido"),
  body("brand").optional().isString(),
  body("bankCurrency").optional().isIn(["PEN", "USD"]).withMessage("Currency must be PEN or USD"),
  body("isActive").optional().isBoolean(),
];

const createCycleRules = [
  // existsActiveOwnedByUser("creditCard", "body", "creditCardId", "CreditCard"),
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
  noBillingCycleOverlap({
    location: "param",
    field: "id"
  }),
];

const listQueryRules = [
  query("isActive").optional().isBoolean(),
  query("name").optional().isString(),
];

router.post(
    "/", 
    authenticateToken, 
    rules, 
    validateRequest, 
    controller.create
);
router.get(
  "/", 
  listQueryRules,
  validateRequest,
  authenticateToken, 
  controller.getAll
);
router.get(
  "/:id", 
  authenticateToken,
  paramIntId(),
  validateRequest,
  requireOwnership("creditCard", { 
    notFoundMsg: "CreditCard not found",
    include: {
      accounts: { where: { deletedAt: null } },
      billingCycles: {
        where: { deletedAt: null },
        orderBy: { periodStart: "desc" }
      },
    },
  }),   
  controller.getById
);
router.get(
  "/:id/billing-cycles",
  authenticateToken,
  paramIntId(),
  query("year").optional().isInt({ min: 2020, max: 2100 }),
  validateRequest,
  requireOwnership("creditCard", { notFoundMsg: "CreditCard not found" }),
  billingCycleController.getByCreditCard
)
router.post(
  "/:id/billing-cycles",
  authenticateToken,
  paramIntId(),
  createCycleRules,
  validateRequest,
  requireOwnership("creditCard", { notFoundMsg: "CreditCard not found" }),
  billingCycleController.createByCreditCard
)

router.put(
  "/:id",
  authenticateToken,
  paramIntId(),
  rules,
  validateRequest,
  requireOwnership("creditCard", { notFoundMsg: "CreditCard not found" }),
  controller.update,
);

router.delete(
  "/:id", 
  authenticateToken, 
  paramIntId(),
  validateRequest,
  requireOwnership("creditCard", { notFoundMsg: "CreditCard not found" }),
  controller.destroy
);

module.exports = router