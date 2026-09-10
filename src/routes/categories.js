const { Router } = require("express");
const { body } = require("express-validator");
const controller = require("../controllers/categoryController");
const authenticateToken = require("../middlewares/auth");
const validateRequest = require("../middlewares/validateRequest");
const { requireOwnership, paramIntId } = require("../middlewares/validators");

const router = Router();

const rules = [
  body("name").notEmpty().withMessage("Name is required"),
  body("type").notEmpty().isIn(["ingreso", "egreso"]).withMessage("type ingreso|egreso"),
  body("color").optional().isHexColor(),
  body("icon").optional().isString(),
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
  requireOwnership("category", { notFoundMsg: "Category not found" }),
  controller.getById
);

router.put(
  "/:id",
  authenticateToken,
  paramIntId(),
  rules,
  validateRequest,
  requireOwnership("category", { notFoundMsg: "Category not found" }),
  controller.update,
);

router.delete(
  "/:id", 
  authenticateToken, 
  paramIntId(),
  validateRequest,
  requireOwnership("category", { notFoundMsg: "Category not found" }),
  controller.destroy
);

module.exports = router;
