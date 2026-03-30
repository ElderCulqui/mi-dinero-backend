const { Router } = require("express");
const authController = require("../controllers/authController");
const authenticateToken = require("../middlewares/auth");

const router = Router();

router.post("/login", authController.login);
router.post("/register", authController.register);

router.get("/protected", authenticateToken, (req, res) => {
  res.json({ message: "This is a protected route" });
});

module.exports = router;
