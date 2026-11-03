const { Router } = require("express");
const { body, query } = require("express-validator");
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
  body("fromAmount")
      .isString()
      .matches(/^[1-9]\d*$/)
      .withMessage("fromAmount numérico > 0"),
  body("toAmount")
      .optional({ nullable: true })
      .isString()
      .matches(/^[1-9]\d*$/),
  body("rate").optional({ nullable: true }).isFloat({ min: 0 }),
  body("date").isISO8601().withMessage("date ISO8601"),
  isInDateWindow("body", "date"),
  body("description").optional({ nullable: true }).isString(),
];

const listQueryRules = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("page debe ser un entero mayor o igual a 1"),
  query("pageSize")
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage("pageSize debe estar entre 1 y 50"),
];

router.post("/", authenticateToken, rules, validateRequest, controller.create);
router.get("/", authenticateToken, listQueryRules, validateRequest, controller.getAll);
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