const { Router } = require("express");
const { body } = require("express-validator");
const controller = require("../controllers/creditCardController");
const authenticateToken = require("../middlewares/auth");
const validateRequest = require("../middlewares/validateRequest");
const { requireOwnership, paramIntId } = require("../middlewares/validators")

const router = Router();

const rules = [
  body("name").isString().withMessage("Name requerido"),
  body("brand").optional().isString(),
  body("bankCurrency").optional().isIn(["PEN", "USD"]).withMessage("Currency must be PEN or USD"),
  body("isActive").optional().isBoolean(),
  body("description").optional().isString(),
];

router.post(
    "/", 
    authenticateToken, 
    rules, 
    validateRequest, 
    controller.create
);
router.get("/", authenticateToken, controller.getAll);
router.get(
  "/:id", 
  authenticateToken,
  paramIntId(),
  validateRequest,
  requireOwnership("creditCard", { notFoundMsg: "CreditCard not found" }),   
  controller.getById
);
router.put(
  "/:id",
  authenticateToken,
  paramIntId(),
  rules,
  validateRequest,
  requireOwnership("creditCard", { notFoundMsg: "CreditCard not found" }),
  controller.update,
);

router.delete(
  "/:id", 
  authenticateToken, 
  paramIntId(),
  validateRequest,
  requireOwnership("creditCard", { notFoundMsg: "CreditCard not found" }),
  controller.destroy
);

module.exports = router