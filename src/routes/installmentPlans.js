const { Router } = require("express");
const { body } = require("express-validator");
const authenticateToken = require("@/middlewares/auth");
const validate = require("@/middlewares/validateRequest");
const { paramIntId } = require("@/middlewares/validators/commonRules");
const { existsActiveOwnedByUser } = require("@/middlewares/validators");
const ctrl = require("@/controllers/installmentPlanController");

const router = Router();
router.use(authenticateToken);

router.get("/", ctrl.getAll);

router.post(
  "/",
  [
    existsActiveOwnedByUser("creditCard", "body", "creditCardId", "CreditCard"),
    body("description").isString().isLength({ min: 1, max: 255 }),
    body("currency").optional({ nullable: true }).isIn(["PEN", "USD"]),
    body("totalAmount").isFloat({ gt: 0 }).toFloat(),
    body("installments").isInt({ gt: 0, lt: 1000 }),
    body("startDate").isISO8601(),
    body("firstDueDate").isISO8601(),
    existsActiveOwnedByUser("category", "body", "categoryId", "Category").optional({ nullable: true, checkFalsy: true }),
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
    body("description").optional({ nullable: true }).isString().isLength({ min: 1, max: 255 }),
    existsActiveOwnedByUser("category", "body", "categoryId", "Category").optional({ nullable: true, checkFalsy: true }),
  ],
  validate,
  ctrl.update
);

router.delete("/:id", [paramIntId("id")], validate, ctrl.remove);

router.post(
  "/:id/installments/:installmentId/pay",
  [
    paramIntId("id"),
    paramIntId("installmentId"),
    body("amount").isFloat({ gt: 0 }).toFloat(),
    body("date").optional({ nullable: true }).isISO8601(),
    existsActiveOwnedByUser("category", "body", "categoryId", "Category").optional({ nullable: true, checkFalsy: true }),
    body("description").optional({ nullable: true }).isString().isLength({ max: 500 }),
  ],
  validate,
  ctrl.payInstallment
);

module.exports = router;