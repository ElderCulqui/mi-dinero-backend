const { Router } = require("express");
const { body } = require("express-validator");
const controller = require("../controllers/authController");
const authenticateToken = require("../middlewares/auth");
const validateRequest = require("../middlewares/validateRequest");

const router = Router();

const registerRules = [
  body("email").isEmail().withMessage("email inválido").normalizeEmail(),
  body("password").isLength({ min: 8 }).withMessage("password ≥ 8 caracteres"),
  body("name").optional().isString().isLength({ min: 1, max: 100 }),
];

const loginRules = [
  body("email").isEmail().withMessage("email inválido").normalizeEmail(),
  body("password").notEmpty().withMessage("password requerido"),
];

router.post("/register", registerRules, validateRequest, controller.register);
router.post("/login", loginRules, validateRequest, controller.login);
router.get("/protected", authenticateToken, (req, res) => {
  res.json({ message: "proctected ok", user: req.user });
});

module.exports = router;
