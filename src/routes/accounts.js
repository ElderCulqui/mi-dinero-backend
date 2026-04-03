const { Router } = require("express");
const { body } = require("express-validator");
const accountController = require("../controllers/accountController");
const authenticateToken = require("../middlewares/auth");
const validateRequest = require("../middlewares/validateRequest");
const db = require("../config/db");
const prisma = db.getClient();

const router = Router();

const accountValidationRules = [
  body("name").notEmpty().withMessage("Name is required"),
  body("userId")
    .notEmpty()
    .withMessage("User ID is required")
    .isNumeric()
    .withMessage("User ID must be a number")
    .custom(async (userId) => {
      const user = await prisma.user.findUnique({
        where: { id: parseInt(userId) },
      });

      if (!user) {
        throw new Error("User ID does not exist");
      }
      return true;
    }),
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
];

router.post(
  "/",
  authenticateToken,
  accountValidationRules,
  validateRequest,
  accountController.createAccount,
);

router.get("/:id", authenticateToken, accountController.getAccount);
router.get("/", authenticateToken, accountController.getAccounts);
// router.put('/:id', authenticateToken, accountController.updateAccount);
// router.delete('/:id', authenticateToken, accountController.deleteAccount);

module.exports = router;
