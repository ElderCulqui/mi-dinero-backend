const { Router } = require("express");
const { body } = require("express-validator");
const controller = require("../controllers/accountController");
const authenticateToken = require("../middlewares/auth");
const validateRequest = require("../middlewares/validateRequest");
const { requireOwnership, paramIntId, existsActiveOwnedByUser } = require("../middlewares/validators");

const router = Router();

const rules = [
  existsActiveOwnedByUser("creditCard", "body", "creditCardId", "CreditCard")
    .optional({ nullable: true, checkFalsy: true }),
  body("creditCardId")
    .if(body("type").equals("tarjeta_credito"))
    .notEmpty()
    .withMessage("creditCardId es requerido para cuentas tarjeta_credito"),
  body("name").notEmpty().withMessage("Name is required"),
  body("type")
    .notEmpty()
    .isIn(["efectivo", "cuenta_bancaria", "tarjeta_credito"])
    .withMessage("Type must be one of: efectivo, cuenta_bancaria, tarjeta_credito"),
  body("creditLimit")
    .if(body("type").equals("tarjeta_credito"))
    .notEmpty()
    .withMessage("Credit limit required for credit card accounts")
    .isFloat({ min: 0 }),
  body("isDefault").optional().isBoolean(),
  body("currency").optional().isIn(["PEN", "USD"]),
];

router.post(
  "/",
  authenticateToken,
  rules,
  validateRequest,
  controller.create,
);
router.get("/", authenticateToken, controller.getAll);

router.get(
  "/:id", 
  authenticateToken, 
  paramIntId(),
  validateRequest,
  requireOwnership("account", { notFoundMsg: "Account not found" }),
  controller.getById
);

router.put(
  "/:id",
  authenticateToken,
  paramIntId(),
  rules,
  validateRequest,
  requireOwnership("account", { notFoundMsg: "Account not found" }),
  controller.update,
);

router.delete(
  "/:id", 
  authenticateToken, 
  paramIntId(),
  validateRequest,
  requireOwnership("account", { notFoundMsg: "Account not found" }),
  controller.destroy
);

module.exports = router;
