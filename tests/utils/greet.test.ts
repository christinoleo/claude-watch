import { describe, it, expect } from "vitest";
import { hello, farewell } from "../../src/utils/greet.js";

describe("hello", () => {
  it("returns greeting with name", () => {
    expect(hello("World")).toBe("Hello, World!");
  });

  it("handles empty string", () => {
    expect(hello("")).toBe("Hello, !");
  });

  it("handles special characters", () => {
    expect(hello("O'Brien")).toBe("Hello, O'Brien!");
    expect(hello("<script>")).toBe("Hello, <script>!");
  });
});

describe("farewell", () => {
  it("returns farewell with name", () => {
    expect(farewell("World")).toBe("Goodbye, World!");
  });

  it("handles empty string", () => {
    expect(farewell("")).toBe("Goodbye, !");
  });

  it("handles special characters", () => {
    expect(farewell("O'Brien")).toBe("Goodbye, O'Brien!");
    expect(farewell("<script>")).toBe("Goodbye, <script>!");
  });
});
