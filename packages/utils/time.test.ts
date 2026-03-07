import {
  formatMsToDurationCompat,
  formatMsToLocal,
  formatMsToRelative,
  formatMsToUTC,
  goBackInTime,
  Hour,
  isValidDate,
  Minute,
  msleep,
  Second,
  setDateFormat,
  setTimeFormat,
} from "./time";

describe("time", () => {
  test.each([
    [0, "0:00"],
    [2500, "0:02"],
    [Minute * 3, "3:00"],
    [Hour + Minute * 3, "63:00"],
    [Hour + Minute * 3 + Second, "63:01"],
  ])("should support formatting durations", (input, expected) => {
    expect(formatMsToDurationCompat(input)).toBe(expected);
  });

  it("should sleep for the specified duration", async () => {
    const start = Date.now();
    await msleep(100);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(90);
  });

  it("should format timestamp to local date time", () => {
    setDateFormat("DD/MM/YYYY");
    setTimeFormat("HH:mm");

    const timestamp = new Date("2024-03-15T10:30:00").getTime();
    const result = formatMsToLocal(timestamp);
    expect(result).toMatch(/15\/03\/2024 \d{2}:\d{2}/);
  });

  it("should support custom format", () => {
    const timestamp = new Date("2024-03-15T10:30:00").getTime();
    const result = formatMsToLocal(timestamp, "YYYY-MM-DD");
    expect(result).toBe("2024-03-15");
  });

  it("should format recent timestamps as relative time", () => {
    const oneHourAgo = Date.now() - Hour;
    const result = formatMsToRelative(oneHourAgo);
    expect(result).toMatch(/hour/i);
  });

  it("should format old timestamps as absolute date", () => {
    const threeDaysAgo = Date.now() - 3 * 24 * Hour;
    const result = formatMsToRelative(threeDaysAgo);
    expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });

  it("should handle invalid dates", () => {
    const result = formatMsToRelative(NaN);
    expect(result).toBe("Invalid date");
  });

  it("should format timestamp to UTC", () => {
    const timestamp = new Date("2024-03-15T10:30:00Z").getTime();
    const result = formatMsToUTC(timestamp, "YYYY-MM-DD HH:mm");
    expect(result).toBe("2024-03-15 10:30");
  });

  it("should return true for valid dates", () => {
    expect(isValidDate("2024-03-15")).toBe(true);
    expect(isValidDate("2024-03-15T10:30:00")).toBe(true);
  });

  it("should return false for invalid dates", () => {
    expect(isValidDate("invalid")).toBe(false);
    expect(isValidDate("2024-13-45")).toBe(false);
  });

  it("should subtract days from a date", () => {
    const startDate = new Date("2024-03-15T10:30:00").getTime();
    const result = goBackInTime(startDate, 5, "day");
    expect(result.format("YYYY-MM-DD")).toBe("2024-03-10");
  });

  it("should subtract months from a date", () => {
    const startDate = new Date("2024-03-15T10:30:00").getTime();
    const result = goBackInTime(startDate, 2, "month");
    expect(result.format("YYYY-MM-DD")).toBe("2024-01-15");
  });

  it("should subtract years from a date", () => {
    const startDate = new Date("2024-03-15T10:30:00").getTime();
    const result = goBackInTime(startDate, 1, "year");
    expect(result.format("YYYY-MM-DD")).toBe("2023-03-15");
  });
});
