const {
  validateProduct,
  normalizeProduct,
  deduplicateProducts,
} = require("../src/utils/dataValidation");

describe("Data Validation Utilities", () => {
  describe("validateProduct", () => {
    test("should validate required fields", () => {
      const product = {};
      const validated = validateProduct(product);

      expect(validated.title).toBe("Unknown Product");
      expect(validated.link).toBe("#");
      expect(validated.image).toBe("/placeholder-image.jpg");
    });

    test("should preserve valid fields", () => {
      const product = {
        title: "Test Product",
        link: "https://example.com",
        image: "https://example.com/image.jpg",
        productId: "12345",
        productType: "Shoes",
      };

      const validated = validateProduct(product);

      expect(validated.title).toBe("Test Product");
      expect(validated.link).toBe("https://example.com");
      expect(validated.image).toBe("https://example.com/image.jpg");
      expect(validated.productId).toBe("12345");
      expect(validated.productType).toBe("Shoes");
    });

    test("should format prices correctly", () => {
      const product = {
        salePrice: "29.99",
        originalPrice: "39.99",
      };

      const validated = validateProduct(product);

      expect(validated.salePrice).toBe("$29.99");
      expect(validated.originalPrice).toBe("$39.99");
    });
  });

  describe("normalizeProduct", () => {
    test("should normalize product types", () => {
      const product = { productType: "t-shirts" };
      const normalized = normalizeProduct(product, "TestShop");

      expect(normalized.productType).toBe("T-Shirts");
      expect(normalized.shop).toBe("TestShop");
    });

    test("should handle unknown product types", () => {
      const product = { productType: "unknown-type" };
      const normalized = normalizeProduct(product, "TestShop");

      expect(normalized.productType).toBe("unknown-type"); // Should remain unchanged
    });
  });

  describe("deduplicateProducts", () => {
    test("should remove duplicate products", () => {
      const products = [
        { title: "Test Product", salePrice: "$29.99" },
        { title: "Test Product", salePrice: "$29.99" }, // Duplicate
        { title: "Another Product", salePrice: "$39.99" },
      ];

      const deduplicated = deduplicateProducts(products);

      expect(deduplicated).toHaveLength(2);
      expect(deduplicated[0].title).toBe("Test Product");
      expect(deduplicated[1].title).toBe("Another Product");
    });
  });
});
