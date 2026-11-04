const { Router } = require("express");
const { body } = require("express-validator");
const controller = require("@/controllers/contactDebtController");
const authenticateToken = require("@/middlewares/auth");
const validateRequest = require("@/middlewares/validateRequest");
const {
    requireOwnership,
    paramIntId,
} = require("@/middlewares/validators");

const router = Router();

const payRules = [
    body("accountId").isInt({ min: 1 }).withMessage("accountId es requerido"),
    body("date").optional({ nullable: true }).isISO8601(),
    body("categoryId").optional({ nullable: true }).isInt({ min: 1 }),
    body("description").optional({ nullable: true }).isString().isLength({ max: 255 }),
];

router.patch(
    "/:id/pay",
    authenticateToken,
    paramIntId(),
    payRules,
    validateRequest,
    requireOwnership("contactDebt", { notFoundMsg: "Deuda no encontrada" }),
    controller.markPaid,
);

router.delete(
    "/:id",
    authenticateToken,
    paramIntId(),
    validateRequest,
    requireOwnership("contactDebt", { notFoundMsg: "Deuda no encontrada" }),
    controller.remove,
);

module.exports = router;
