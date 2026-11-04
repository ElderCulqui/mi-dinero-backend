const { Router } = require("express");
const { body } = require("express-validator");
const controller = require("@/controllers/recurringExpenseController");
const authenticateToken = require("@/middlewares/auth");
const validateRequest = require("@/middlewares/validateRequest");
const {
    requireOwnership,
    paramIntId,
} = require("@/middlewares/validators");

const router = Router();

const createRules = [
    body("accountId").isInt({ min: 1 }).withMessage("accountId es requerido"),
    body("categoryId").optional({ nullable: true }).isInt({ min: 1 }),
    body("name").isString().isLength({ min: 1, max: 100 }),
    body("amountMinor")
        .isString()
        .matches(/^[1-9]\d*$/)
        .withMessage("amountMinor debe ser una cadena entera positiva"),
    body("dayOfMonth").isInt({ min: 1, max: 28 }),
    body("isActive").optional().isBoolean(),
];

const updateRules = [
    body("accountId").optional().isInt({ min: 1 }),
    body("categoryId").optional({ nullable: true }).isInt({ min: 1 }),
    body("name").optional().isString().isLength({ min: 1, max: 100 }),
    body("amountMinor")
        .optional()
        .isString()
        .matches(/^[1-9]\d*$/)
        .withMessage("amountMinor debe ser una cadena entera positiva"),
    body("dayOfMonth").optional().isInt({ min: 1, max: 28 }),
    body("isActive").optional().isBoolean(),
];

router.get("/", authenticateToken, controller.getAll);

router.post(
    "/",
    authenticateToken,
    createRules,
    validateRequest,
    controller.create,
);

router.get(
    "/:id",
    authenticateToken,
    paramIntId(),
    validateRequest,
    requireOwnership("recurringExpense", {
        notFoundMsg: "RecurringExpense not found",
    }),
    controller.getById,
);

router.put(
    "/:id",
    authenticateToken,
    paramIntId(),
    updateRules,
    validateRequest,
    requireOwnership("recurringExpense", {
        notFoundMsg: "RecurringExpense not found",
    }),
    controller.update,
);

router.delete(
    "/:id",
    authenticateToken,
    paramIntId(),
    validateRequest,
    requireOwnership("recurringExpense", {
        notFoundMsg: "RecurringExpense not found",
    }),
    controller.remove,
);

module.exports = router;
