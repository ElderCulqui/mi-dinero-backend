const { Router } = require("express");
const { body, query } = require("express-validator");
const ctrl = require("../controllers/exchangeRateController");
const authenticateToken = require("../middlewares/auth");
const validateRequest = require("../middlewares/validateRequest");

const router = Router();

const syncRules = [
  body("baseCurrency").optional().isIn(["PEN", "USD"]),
  body("targetCurrency").optional().isIn(["PEN", "USD"]),
  body("source").optional().isIn(["BCRP", "SUNAT"]),
];

const latestQueryRules = [
  query("baseCurrency").optional().isIn(["PEN", "USD"]),
  query("targetCurrency").optional().isIn(["PEN", "USD"]),
];

router.post("/sync", authenticateToken, syncRules, validateRequest, ctrl.syncManually);
router.get("/latest", authenticateToken, latestQueryRules, validateRequest, ctrl.getLatestRate);

module.exports = router;