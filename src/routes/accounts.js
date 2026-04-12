const { Router } = require("express");
const { body } = require("express-validator");
const accountController = require("../controllers/accountController");
const authenticateToken = require("../middlewares/auth");
const validateRequest = require("../middlewares/validateRequest");

const router = Router();

const accountValidationRules = [
  body("name").notEmpty().withMessage("Name is required"),
  body("type")
    .notEmpty()
    .isIn(["efectivo", "cuenta_bancaria", "tarjeta_credito"])
    .withMessage(
      "Type must be one of: efectivo, cuenta_bancaria, tarjeta_credito",
    ),
  body("creditLimit")
    .if(body("type").equals("tarjeta_credito"))
    .notEmpty()
    .withMessage("Credit limit is required for credit card accounts")
    .isNumeric(),
  body("isDefault")
    .optional()
    .isBoolean()
    .withMessage("isDefault must be a boolean"),
];

router.post(
  "/",
  authenticateToken,
  accountValidationRules,
  validateRequest,
  accountController.createAccount,
);

router.put(
  "/:id",
  authenticateToken,
  accountValidationRules,
  validateRequest,
  accountController.updateAccount,
);

router.get("/:id", authenticateToken, accountController.getAccount);
router.get("/", authenticateToken, accountController.getAccounts);
router.delete("/:id", authenticateToken, accountController.deleteAccount);

module.exports = router;
