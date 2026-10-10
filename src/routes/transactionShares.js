const { Router } = require("express");
const { body } = require("express-validator");
const controller = require("../controllers/transactionShareController");
const authenticateToken = require("../middlewares/auth");
const validateRequest = require("../middlewares/validateRequest");
const {
  requireOwnership,
  paramIntId,
  existsActiveOwnedByUser,
} = require("../middlewares/validators");
const { isInDateWindow } = require("@/helpers/dateValidators");

const router = Router();

const collectRules = [
  existsActiveOwnedByUser("account", "body", "accountId", "Account"),
  body("settlementAmount")
    .isFloat({ min: 0.01 })
    .withMessage("settlementAmount numérico > 0"),
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
  requireOwnership("transactionShare", { notFoundMsg: "TransactionShare not found" }),
  controller.markCollected
);

module.exports = router;