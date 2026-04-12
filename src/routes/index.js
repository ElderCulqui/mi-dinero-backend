const { Router } = require("express");
const authRoutes = require("./auth");
const accountRoutes = require("./accounts");
const categoryRoutes = require("./categories");
const exchangeRateRoutes = require("./exchangeRate");

const router = Router();

router.use("/auth", authRoutes);
router.use("/accounts", accountRoutes);
router.use("/categories", categoryRoutes);
router.use("/exchange-rates", exchangeRateRoutes);

module.exports = router;
