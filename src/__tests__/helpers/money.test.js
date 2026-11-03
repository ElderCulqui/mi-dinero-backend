const {
  parseMinor,
  multiplyMinorByRate,
  divideMinorByRate,
} = require("@/helpers/money");

describe("money helpers", () => {
  it("parses integer strings as minor units", () => {
    expect(parseMinor("1")).toBe(1n);
    expect(parseMinor("1234")).toBe(1234n);
    expect(parseMinor("-1234")).toBe(-1234n);
  });

  it("rejects non-integer strings", () => {
    expect(() => parseMinor("12.34")).toThrow();
    expect(() => parseMinor("")).toThrow();
  });

  it("multiplies by a decimal exchange rate with half-up rounding", () => {
    expect(multiplyMinorByRate("1000", 3.437)).toBe(3437n);
    expect(multiplyMinorByRate("1", 0.5)).toBe(1n);
  });

  it("divides by a decimal exchange rate with half-up rounding", () => {
    expect(divideMinorByRate("3437", 3.437)).toBe(1000n);
    expect(divideMinorByRate("1", 2)).toBe(1n);
  });
});
