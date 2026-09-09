const { Router } = require("express");
const { body } = require("express-validator");
const transactionController = require("../controllers/transactionController");
const authenticateToken = require("../middlewares/auth");
const validateRequest = require("../middlewares/validateRequest");

const router = Router();

const transactionRules = [
  body("accountId").isInt().withMessage("accountId requerido"),
  body("type").isIn(["ingreso", "egreso"]).withMessage("type: ingreso|egreso"),
  body("amount").isNumeric().withMessage("amount numérico"),
  body("date").isISO8601().withMessage("date ISO8601"),
  body("categoryId").optional().isInt(),
  body("description").optional().isString(),
];

router.post("/", authenticateToken, transactionRules, validateRequest, transactionController.createTransaction);
router.get("/:id", authenticateToken, transactionController.getTransaction);
router.get("/", authenticateToken, transactionController.getTransactions);
router.delete("/:id", authenticateToken, transactionController.deleteTransaction);

module.exports = router