const {
  generateLoanSchedule,
  generateInstallmentSchedule,
  recalculateStatus,
} = require("@/helpers/scheduleCalculator");

describe("scheduleCalculator", () => {
  it("splits a loan total exactly, leaving the remainder in the last installment", () => {
    const schedule = generateLoanSchedule({
      startDate: new Date("2026-01-01T00:00:00.000Z"),
      totalAmount: "10000",
      termMonths: 3,
    });

    expect(schedule.map((payment) => payment.amount)).toEqual([
      3333n,
      3333n,
      3334n,
    ]);
    expect(schedule.reduce((sum, payment) => sum + payment.amount, 0n)).toBe(
      10000n,
    );
  });

  it("splits an installment plan exactly", () => {
    const schedule = generateInstallmentSchedule({
      firstDueDate: new Date("2026-01-01T00:00:00.000Z"),
      installments: 3,
      totalAmount: "1",
    });

    expect(schedule.map((installment) => installment.amount)).toEqual([
      0n,
      0n,
      1n,
    ]);
  });

  it("recalculates the payment status without floating point tolerances", () => {
    expect(recalculateStatus(1000n, 0n)).toBe("pendiente");
    expect(recalculateStatus(1000n, 1n)).toBe("parcial");
    expect(recalculateStatus(1000n, 1000n)).toBe("pagado");
  });
});
