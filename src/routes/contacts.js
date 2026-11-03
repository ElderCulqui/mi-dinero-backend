const { Router } = require("express");
const { body, query } = require("express-validator");
const controller = require("@/controllers/contactController");
const authenticateToken = require("@/middlewares/auth");
const validateRequest = require("@/middlewares/validateRequest");
const { requireOwnership, paramIntId } = require("@/middlewares/validators");

const router = Router();

const rules = [
    body("name").isString().notEmpty().withMessage("Nombre es requerido"),
    body("note").optional({ nullable: true }).isString(),
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