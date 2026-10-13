const { Router } = require("express");
const { body } = require("express-validator");
const authenticateToken = require("@/middlewares/auth");
const validate = require("@/middlewares/validateRequest");
const { paramIntId } = require("@/middlewares/validators/commonRules");
const {
  existsActiveOwnedByUser
} = require("@/middlewares/validators");
const ctrl = require("@/controllers/loanController");

const router = Router();
router.use(authenticateToken);

router.get("/", ctrl.getAll);

router.post(
  "/",
  [
    body("name").isString().isLength({ min: 1, max: 100 }),
    body("currency").optional({ nullable: true }).isIn(["PEN", "USD"]),
    body("principal").isFloat({ gt: 0 }).toFloat(),
    body("totalAmount").isFloat({ gt: 0 }).toFloat(),
    body("interestRate").optional({ nullable: true }).isFloat({ min: 0, max: 9.9999 }).toFloat(),
    body("termMonths").isInt({ gt: 0, lt: 1000 }),
    body("startDate").isISO8601().withMessage("startDate debe ser fecha ISO válida"),
    existsActiveOwnedByUser("account", "body", "accountId", "Account"),
    existsActiveOwnedByUser("category", "body", "categoryId", "Category").optional({ nullable: true, checkFalsy: true }),
    body("description").optional({ nullable: true }).isString().isLength({ max: 500 }),
  ],
  validate,
  ctrl.create
);

router.get("/:id", [paramIntId("id")], validate, ctrl.getById);
router.get("/:id/summary", [paramIntId("id")], validate, ctrl.getSummary);

router.put(
  "/:id",
  [
    paramIntId("id"),
    body("name").optional({ nullable: true }).isString().isLength({ min: 1, max: 100 }),
    body("description").optional({ nullable: true }).isString().isLength({ max: 500 }),
    existsActiveOwnedByUser("account", "body", "accountId", "Account").optional({ nullable: true, checkFalsy: true }),
    existsActiveOwnedByUser("category", "body", "categoryId", "Category").optional({ nullable: true, checkFalsy: true }),
  ],
  validate,
  ctrl.update
);

router.delete("/:id", [paramIntId("id")], validate, ctrl.remove);

router.post(
  "/:id/payments/:paymentId/pay",
  [
    paramIntId("id"),
    paramIntId("paymentId"),
    body("amount").isFloat({ gt: 0 }).toFloat(),
    body("date").optional({ nullable: true }).isISO8601(),
    existsActiveOwnedByUser("account", "body", "accountId", "Account").optional({ nullable: true, checkFalsy: true }),
    existsActiveOwnedByUser("category", "body", "categoryId", "Category").optional({ nullable: true, checkFalsy: true }),
    body("description").optional({ nullable: true }).isString().isLength({ max: 500 }),
  ],
  validate,
  ctrl.payPayment
);

module.exports = router;