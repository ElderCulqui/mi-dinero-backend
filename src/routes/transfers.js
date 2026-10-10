const { Router } = require("express");
const { body } = require("express-validator");
const controller = require("../controllers/transferController");
const authenticateToken = require("../middlewares/auth");
const validateRequest = require("../middlewares/validateRequest");
const {
  requireOwnership,
  paramIntId,
  existsActiveOwnedByUser,
} = require("../middlewares/validators");
const { isInDateWindow } = require("@/helpers/dateValidators");

const router = Router();

const rules = [
  existsActiveOwnedByUser("account", "body", "fromAccountId", "Cuenta origen"),
  existsActiveOwnedByUser("account", "body", "toAccountId", "Cuenta destino"),
  body("fromAmount").isFloat({ min: 0.01 }).withMessage("fromAmount numérico > 0"),
  body("toAmount").optional().isFloat({ min: 0.01 }),
  body("rate").optional().isFloat({ min: 0 }),
  body("date").isISO8601().withMessage("date ISO8601"),
  isInDateWindow("body", "date"),
  body("description").optional({ nullable: true }).isString(),
];

router.post("/", authenticateToken, rules, validateRequest, controller.create);
router.get("/", authenticateToken, controller.getAll);
router.get(
  "/:id",
  authenticateToken,
  paramIntId(),
  validateRequest,
  requireOwnership("transfer", { notFoundMsg: "Transfer not found" }),
  controller.getById
);
router.put(
  "/:id",
  authenticateToken,
  paramIntId(),
  rules,
  validateRequest,
  requireOwnership("transfer", { notFoundMsg: "Transfer not found" }),
  controller.update
);
router.delete(
  "/:id",
  authenticateToken,
  paramIntId(),
  validateRequest,
  requireOwnership("transfer", { notFoundMsg: "Transfer not found" }),
  controller.destroy
);

module.exports = router;