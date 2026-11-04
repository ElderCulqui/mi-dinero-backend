const { Router } = require("express");
const { query } = require("express-validator");
const controller = require("@/controllers/reportController");
const authenticateToken = require("@/middlewares/auth");
const validateRequest = require("@/middlewares/validateRequest");

const router = Router();

router.get(
    "/monthly-summary",
    authenticateToken,
    query("month")
        .optional()
        .matches(/^\d{4}-\d{2}$/)
        .withMessage("month debe tener el formato YYYY-MM"),
    validateRequest,
    controller.getMonthlySummary,
);

module.exports = router;
