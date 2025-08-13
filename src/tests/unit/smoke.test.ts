// Minimal "it runs" test for Vitest
import { describe, it, expect } from "vitest";

describe("smoke test", () => {
  it("should assert true is true", () => {
    expect(true).toBe(true);
  });

  it("should have jest-dom matchers registered", () => {
    // Create a div and append to document.body
    const div = document.createElement("div");
    document.body.appendChild(div);
    // jest-dom matcher from setup file
    expect(document.body).toBeInTheDocument();
  });
});
