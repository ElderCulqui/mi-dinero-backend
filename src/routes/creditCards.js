const { Router } = require("express");
const { body } = require("express-validator");
const creditCardController = require("../controllers/creditCardController");
const authenticateToken = require("../middlewares/auth");
const validateRequest = require("../middlewares/validateRequest");

const router = Router();

const rules = [
  body("name").isString().withMessage("Name requerido"),
  body("brand").optional().isString(),
  body("bankCurrency").isIn(["PEN", "USD"]).withMessage("Currency must be PEN or USD"),
  body("isActive").optional().isBoolean(),
  body("description").optional().isString(),
];

router.post(
    "/", 
    authenticateToken, 
    rules, 
    validateRequest, 
    creditCardController.createCreditCard
);
router.put(
  "/:id",
  authenticateToken,
  rules,
  validateRequest,
  creditCardController.updateCreditCard,
);
router.get("/:id", authenticateToken, creditCardController.getCreditCard);
router.get("/", authenticateToken, creditCardController.getCreditCards);
router.delete("/:id", authenticateToken, creditCardController.deleteCreditCard);

module.exports = router