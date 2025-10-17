import { GET } from "../src/app/api/scraped-data/route";

// Mock the file system
jest.mock("fs", () => ({
  ...jest.requireActual("fs"),
  existsSync: jest.fn(() => true),
  readFileSync: jest.fn(() => JSON.stringify([])),
}));

// Mock path
jest.mock("path", () => ({
  ...jest.requireActual("path"),
  join: jest.fn((...args) => args.join("/")),
}));

describe("API Route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should return products with pagination info", async () => {
    // Create a mock request
    const mockRequest = {
      url: "http://localhost:3000/api/scraped-data?page=1&limit=10",
    };

    // Mock URL constructor
    global.URL = jest.fn().mockImplementation((url) => ({
      searchParams: new Map(
        Object.entries({
          page: "1",
          limit: "10",
        })
      ),
    }));

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(data).toHaveProperty("products");
    expect(data).toHaveProperty("pagination");
    expect(data.pagination).toHaveProperty("currentPage", 1);
    expect(data.pagination).toHaveProperty("totalPages");
    expect(data.pagination).toHaveProperty("totalProducts");
  });

  test("should handle errors gracefully", async () => {
    // Mock readFileSync to throw an error
    require("fs").readFileSync.mockImplementation(() => {
      throw new Error("File read error");
    });

    const mockRequest = {
      url: "http://localhost:3000/api/scraped-data",
    };

    global.URL = jest.fn().mockImplementation((url) => ({
      searchParams: new Map(),
    }));

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toHaveProperty("message");
  });
});
