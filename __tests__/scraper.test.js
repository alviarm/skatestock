const { runAllScrapers } = require("../src/scrapers");

// Mock the file system to avoid actually writing files during tests
jest.mock("fs", () => ({
  ...jest.requireActual("fs"),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
  existsSync: jest.fn(() => true),
}));

// Mock axios to avoid making actual HTTP requests
jest.mock("axios", () => ({
  get: jest.fn(),
}));

describe("Scrapers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should run all scrapers without throwing errors", async () => {
    // Mock successful responses
    require("axios").get.mockResolvedValue({ data: {} });

    const results = await runAllScrapers();

    // Should have results for all scrapers
    expect(results).toHaveLength(5);

    // All scrapers should have been attempted
    expect(results.every((result) => result.name)).toBe(true);
  });

  test("should handle scraper errors gracefully", async () => {
    // Mock a failed response
    require("axios").get.mockRejectedValue(new Error("Network error"));

    const results = await runAllScrapers();

    // All scrapers should have failed
    expect(results.every((result) => result.success === false)).toBe(true);
  });
});
