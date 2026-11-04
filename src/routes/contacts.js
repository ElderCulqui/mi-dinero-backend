const { Router } = require("express");
const { body, query } = require("express-validator");
const controller = require("@/controllers/contactController");
const debtController = require("@/controllers/contactDebtController");
const authenticateToken = require("@/middlewares/auth");
const validateRequest = require("@/middlewares/validateRequest");
const { requireOwnership, paramIntId } = require("@/middlewares/validators");

const router = Router();

const rules = [
    body("name").isString().notEmpty().withMessage("Nombre es requerido"),
    body("note").optional({ nullable: true }).isString(),
];

const debtRules = [
    body("direction").isIn(["por_cobrar", "por_pagar"]),
    body("description").isString().isLength({ min: 1, max: 255 }),
    body("amountMinor")
        .isString()
        .matches(/^[1-9]\d*$/)
        .withMessage("amountMinor debe ser una cadena entera positiva"),
    body("currency").optional().isIn(["PEN", "USD"]),
    body("date").optional().isISO8601(),
    body("dueDate").optional({ nullable: true }).isISO8601(),
];

const sharesQueryRules = [
    query("page")
        .optional()
        .isInt({ min: 1 })
        .withMessage("page debe ser un entero mayor o igual a 1"),
    query("pageSize")
        .optional()
        .isInt({ min: 1, max: 50 })
        .withMessage("pageSize debe estar entre 1 y 50"),
    query("status").optional().isIn(["pendiente", "cobrado"]),
];

router.post("/", authenticateToken, rules, validateRequest, controller.create);
router.get("/", authenticateToken, controller.getAll);
router.get(
    "/:id/debts/summary",
    authenticateToken,
    paramIntId(),
    validateRequest,
    requireOwnership("contact", { notFoundMsg: "Contact not found" }),
    debtController.getSummary
);
router.get(
    "/:id/debts",
    authenticateToken,
    paramIntId(),
    validateRequest,
    requireOwnership("contact", { notFoundMsg: "Contact not found" }),
    debtController.getByContact
);
router.post(
    "/:id/debts",
    authenticateToken,
    paramIntId(),
    debtRules,
    validateRequest,
    requireOwnership("contact", { notFoundMsg: "Contact not found" }),
    debtController.create
);
router.get(
    "/:id/summary",
    authenticateToken,
    paramIntId(),
    validateRequest,
    requireOwnership("contact", { notFoundMsg: "Contact not found" }),
    controller.getSummary
);
router.get(
    "/:id/shares",
    authenticateToken,
    paramIntId(),
    sharesQueryRules,
    validateRequest,
    requireOwnership("contact", { notFoundMsg: "Contact not found" }),
    controller.getShares
);
router.get(
    "/:id",
    authenticateToken,
    paramIntId(),
    validateRequest,
    requireOwnership("contact", { notFoundMsg: "Contact not found" }),
    controller.getById
);
router.put(
  "/:id",
  authenticateToken,
  paramIntId(),
  rules,
  validateRequest,
  requireOwnership("contact", { notFoundMsg: "Contact not found" }),
  controller.update
);
router.delete(
  "/:id",
  authenticateToken,
  paramIntId(),
  validateRequest,
  requireOwnership("contact", { notFoundMsg: "Contact not found" }),
  controller.destroy
);

module.exports = router;