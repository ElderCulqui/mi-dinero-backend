const { Router } = require("express");
const authRoutes = require("./auth");
const accountRoutes = require("./accounts");

const router = Router();

router.use("/auth", authRoutes);
router.use("/accounts", accountRoutes);

module.exports = router;
