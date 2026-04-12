const { Router } = require("express");
const exchangeRateController = require("../controllers/exchangeRateController");
const authenticateToken = require("../middlewares/auth");

const router = Router();

router.post("/sync", authenticateToken, exchangeRateController.syncManually);
router.get("/latest", authenticateToken, exchangeRateController.getLatestRate);

module.exports = router;
