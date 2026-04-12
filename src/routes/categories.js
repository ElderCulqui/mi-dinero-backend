const { Router } = require("express");
const { body } = require("express-validator");
const categoryController = require("../controllers/categoryController");
const authenticateToken = require("../middlewares/auth");
const validateRequest = require("../middlewares/validateRequest");

const router = Router();

const categoryValidationRules = [
  body("name").notEmpty().withMessage("Name is required"),
  body("type")
    .notEmpty()
    .isIn(["ingreso", "egreso"])
    .withMessage("Type must be either ingreso or egreso"),
  body("color")
    .optional()
    .isHexColor()
    .withMessage("Color must be a valid hex code"),
  body("icon")
    .optional()
    .isString()
    .withMessage("Icon must be a string representing the icon name"),
];

router.post(
  "/",
  authenticateToken,
  categoryValidationRules,
  validateRequest,
  categoryController.createCategory,
);

router.put(
  "/:id",
  authenticateToken,
  categoryValidationRules,
  validateRequest,
  categoryController.updateCategory,
);

router.get("/:id", authenticateToken, categoryController.getCategory);
router.get("/", authenticateToken, categoryController.getCategories);
router.delete("/:id", authenticateToken, categoryController.deleteCategory);

module.exports = router;
