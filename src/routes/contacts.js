const { Router } = require("express");
const { body } = require("express-validator");
const controller = require("@/controllers/contactController");
const authenticateToken = require("@/middlewares/auth");
const validateRequest = require("@/middlewares/validateRequest");
const { requireOwnership, paramIntId } = require("@/middlewares/validators");

const router = Router();

const rules = [
    body("name").isString().notEmpty().withMessage("Nombre es requerido"),
    body("note").optional({ nullable: true }).isString(),
];

router.post("/", authenticateToken, rules, validateRequest, controller.create);
router.get("/", authenticateToken, controller.getAll);
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