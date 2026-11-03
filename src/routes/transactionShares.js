const { Router } = require("express");
const { body } = require("express-validator");
const controller = require("../controllers/transactionShareController");
const authenticateToken = require("../middlewares/auth");
const validateRequest = require("../middlewares/validateRequest");
const {
  paramIntId,
  existsActiveOwnedByUser,
} = require("../middlewares/validators");
const { isInDateWindow } = require("@/helpers/dateValidators");

const router = Router();

const collectRules = [
  existsActiveOwnedByUser("account", "body", "accountId", "Account"),
  body("settlementAmount")
    .isString()
    .matches(/^[1-9]\d*$/)
    .withMessage("settlementAmount debe ser una cadena entera positiva en unidades menores"),
  body("settlementCurrency").optional().isIn(["PEN", "USD"]),
  body("settlementRate").optional().isFloat({ min: 0 }),
  body("date").optional().isISO8601(),
  isInDateWindow("body", "date"),
  body("categoryId").optional({ nullable: true }).isInt(),
  body("description").optional({ nullable: true }).isString(),
];

router.patch(
  "/:id/cobrar",
  authenticateToken,
  paramIntId(),
  collectRules,
  validateRequest,
  // TransactionShare no tiene userId: markCollected valida la propiedad
  // a través de la transacción padre y de la cuenta destino.
  controller.markCollected
);

module.exports = router;