const { Router } = require("express");
const { body, validationResult } = require("express-validator");
const accountController = require("../controllers/accountController");
const authenticateToken = require("../middlewares/auth");

const router = Router();

const accountValidationRules = [
  body("name").notEmpty().withMessage("Name is required"),
  body("balance")
    .isFloat({ min: 0 })
    .withMessage("Balance must be a non-negative number"),
];

router.post("/", authenticateToken, accountController.createAccount);
// router.get('/:id', authenticateToken, accountController.getAccount);
// router.put('/:id', authenticateToken, accountController.updateAccount);
// router.delete('/:id', authenticateToken, accountController.deleteAccount);

module.exports = router;
