const { parseMinor } = require("./money");

const round2 = (n) => Math.round(Number(n) * 100) / 100;

const addMonths = (date, months) => {
    const d = new Date(date);
    const day = d.getUTCDate();
    d.setUTCMonth(d.getUTCMonth() + months);

    if (d.getUTCDate() < day) d.setUTCDate(0);
    return d;
}

const recalculateStatus = (amount, paidAmount) => {
    const a = parseMinor(amount);
    const p = parseMinor(paidAmount);
    if (p <= 0n) return "pendiente";
    if (p >= a) return "pagado";
    return "parcial";
};

const splitMinor = (totalAmount, count) => {
    const total = parseMinor(totalAmount);
    const n = BigInt(count);
    const base = total / n;
    const remainder = total - base * n;

    return { base, remainder };
};

const generateLoanSchedule = ({ startDate, totalAmount, termMonths }) => {
    const n = Number(termMonths);
    if (!Number.isInteger(n) || n < 1) {
        throw Object.assign(new Error("termMonths debe ser >= 1"), { status: 400 });
    }

    const total = parseMinor(totalAmount);
    if (total <= 0n) {
        throw Object.assign(new Error("totalAmount debe ser > 0"), { status: 400 });
    }

    const { base, remainder } = splitMinor(total, n);
    const schedule = [];

    for (let i = 1; i <= n; i++) {
        schedule.push({
            number: i,
            dueDate: addMonths(startDate, i - 1),
            amount: i === n ? base + remainder : base,
        });
    }

    return schedule;
};

const generateInstallmentSchedule = ({
    firstDueDate,
    installments,
    totalAmount,
}) => {
    const n = Number(installments);
    if (!Number.isInteger(n) || n < 1) {
        throw Object.assign(new Error("installments debe ser >= 1"), { status: 400 });
    }

    const total = parseMinor(totalAmount);
    if (total <= 0n) {
        throw Object.assign(new Error("totalAmount debe ser > 0"), { status: 400 });
    }

    const { base, remainder } = splitMinor(total, n);
    const schedule = [];

    for (let i = 1; i <= n; i++) {
        schedule.push({
            number: i,
            dueDate: addMonths(firstDueDate, i - 1),
            amount: i === n ? base + remainder : base,
        });
    }

    return schedule;
};

module.exports = {
    generateLoanSchedule,
    generateInstallmentSchedule,
    recalculateStatus,
    addMonths,
    round2,
};
