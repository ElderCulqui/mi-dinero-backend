jest.mock("@/config/db", () => ({
  getClient: jest.fn().mockReturnValue({
    category: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
    },
  }),
}));

const categoryService = require("@/services/categoryService");
const db = require("@/config/db");

const prisma = db.getClient();

describe("categoryService", () => {
  describe("createCategory", () => {
    1;
    it("should create and return the category", async () => {
      const newCategory = { id: 1, name: "Food", type: "egreso", userId: 1 };
      prisma.category.findFirst.mockResolvedValue(null);
      prisma.category.create.mockResolvedValue(newCategory);

      const result = await categoryService.createCategory({
        name: "Food",
        type: "egreso",
        userId: 1,
      });

      expect(result).toEqual(newCategory);
      expect(prisma.category.create).toHaveBeenCalledWith({
        data: { name: "Food", type: "egreso", userId: 1 },
      });
    });

    it("should throw if a category with the same name and type already exists for the user", async () => {
      prisma.category.findFirst.mockResolvedValue({
        id: 1,
        name: "Food",
        type: "egreso",
        userId: 1,
      });

      await expect(
        categoryService.createCategory({
          name: "Food",
          type: "egreso",
          userId: 1,
        }),
      ).rejects.toThrow(
        "La categoría con el mismo nombre y tipo ya existe para este usuario",
      );

      expect(prisma.category.findFirst).toHaveBeenCalledWith({
        where: { name: "Food", type: "egreso", userId: 1 },
      });
    });

    it("should create the category if the same name and type exists for another user", async () => {
      const newCategory = { id: 2, name: "Food", type: "egreso", userId: 1 };
      prisma.category.findFirst.mockResolvedValue(null);
      prisma.category.create.mockResolvedValue(newCategory);

      const result = await categoryService.createCategory({
        name: "Food",
        type: "egreso",
        userId: 1,
      });

      expect(result).toEqual(newCategory);
      expect(prisma.category.findFirst).toHaveBeenCalledWith({
        where: { name: "Food", type: "egreso", userId: 1 },
      });
      expect(prisma.category.create).toHaveBeenCalledWith({
        data: { name: "Food", type: "egreso", userId: 1 },
      });
    });
  });

  describe("getCategoryById", () => {
    it("should return the category for the given id", async () => {
      const category = { id: 1, name: "Food", type: "egreso", userId: 1 };
      prisma.category.findUnique.mockResolvedValue(category);

      const result = await categoryService.getCategoryById("1");

      expect(result).toEqual(category);
      expect(prisma.category.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it("should return null if category is not found", async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      const result = await categoryService.getCategoryById("99");

      expect(result).toBeNull();
    });
  });

  describe("getCategories", () => {
    it("should return a list of categories", async () => {
      const data = [
        { id: 1, name: "Food", type: "egreso", userId: 1 },
        { id: 2, name: "Salary", type: "ingreso", userId: 1 },
      ];
      prisma.category.findMany.mockResolvedValue(data);

      const result = await categoryService.getCategories();

      expect(result).toEqual(data);
      expect(prisma.category.findMany).toHaveBeenCalled();
    });

    it("should return an empty list if no categories are found for the user", async () => {
      prisma.category.findMany.mockResolvedValue([]);

      const result = await categoryService.getCategories();

      expect(result).toEqual([]);
      expect(prisma.category.findMany).toHaveBeenCalled();
    });
  });

  describe("updateCategory", () => {
    it("should update and return the category", async () => {
      const updatedCategory = {
        id: 1,
        name: "Groceries",
        type: "egreso",
        userId: 1,
      };
      prisma.category.update.mockResolvedValue(updatedCategory);

      const result = await categoryService.updateCategory("1", {
        name: "Groceries",
        type: "egreso",
        userId: 1,
      });

      expect(result).toEqual(updatedCategory);
      expect(prisma.category.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { name: "Groceries", type: "egreso", userId: 1 },
      });
    });

    it("should throw if the category to update does not exist", async () => {
      prisma.category.update.mockRejectedValue({ code: "P2025" });

      await expect(
        categoryService.updateCategory("99", {
          name: "Nonexistent Category",
          type: "egreso",
          userId: 1,
        }),
      ).rejects.toThrow("Category not found");

      expect(prisma.category.update).toHaveBeenCalledWith({
        where: { id: 99 },
        data: { name: "Nonexistent Category", type: "egreso", userId: 1 },
      });
    });
  });

  describe("deleteCategory", () => {
    it("should delete the category", async () => {
      prisma.category.delete.mockResolvedValue({ id: 1 });

      await categoryService.deleteCategory("1");

      expect(prisma.category.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it("should throw an error if deletion fails", async () => {
      const error = new Error("Category not found");
      error.code = "P2025";
      prisma.category.delete.mockRejectedValue(error);

      await expect(categoryService.deleteCategory("1")).rejects.toThrow(
        "Category not found",
      );

      expect(prisma.category.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });
  });
});
