const { Router } = require("express");
const authRoutes = require("./auth");
const accountRoutes = require("./accounts");
const categoryRoutes = require("./categories");
const exchangeRateRoutes = require("./exchangeRate");
const transactionRoutes = require("./transactions");
const billingCyclesRoutes = require("./billingCycles");
const creditCardsRoutes = require("./creditCards");
const contactsRoutes = require("./contacts");
const transactionSharesRoutes = require("./transactionShares");
const transfersRoutes = require("./transfers");

const router = Router();

router.use("/auth", authRoutes);
router.use("/accounts", accountRoutes);
router.use("/categories", categoryRoutes);
router.use("/exchange-rates", exchangeRateRoutes);
router.use("/transactions", transactionRoutes);
router.use("/billing-cycles", billingCyclesRoutes);
router.use("/credit-cards", creditCardsRoutes);
router.use("/contacts", contactsRoutes);
router.use("/transaction-shares", transactionSharesRoutes);
router.use("/transfers", transfersRoutes);

module.exports = router;
