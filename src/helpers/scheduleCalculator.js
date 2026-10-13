const round2 = (n) => Math.round(Number(n) * 100) / 100;

const addMonths = (date, months) => {
    const d = new Date(date);
    const day = d.getUTCDate();
    d.setUTCMonth(d.getUTCMonth() + months);

    if (d.getUTCDate() < day) d.setUTCDate(0);
    return d;
}

const recalculateStatus = (amount, paidAmount) => {
    const a = Number(amount);
    const p = Number(paidAmount);
    if (p <= 0) return "pendiente";
    if (p >= a) return "pagado";
    return "parcial";
};

const generateLoanSchedule = ({ startDate, totalAmount, termMonths }) => {
    const n = Number(termMonths);
    if (n < 1) throw Object.assign(new Error("termMonths debe ser >= 1"), { status: 400 });
    const total = Number(totalAmount);
    if (!Number.isFinite(total) || total <= 0) {
        throw Object.assign(new Error("totalAmount debe ser > 0"), { status: 400 });
    }
    const base = round2(total / n);
    const schedule = [];
    for (let i = 1; i <= n; i++) {
        const amount = i === n ? round2(total - base * (n -1)) : base;
        schedule.push({
            number: i,
            dueDate: addMonths(startDate, i - 1),
            amount,
        });
    }
    return schedule;
};

const generateInstallmentSchedule = ({
    firstDueDate,
    installments,
    amountPerInstallment,
    totalAmount
}) => {
    const n = Number(installments);
    if (n < 1) throw Object.assign(new Error("installments debe ser >= 1"), { status: 400});
    const base = round2(Number(amountPerInstallment));
    const total = round2(Number(totalAmount));
    const last = round2(total - base * (n - 1));
    const schedule = [];
    
    for (let i = 1; i <= n; i++) {
        const amount = i === n ? last : base;
        schedule.push({
            number: i,
            dueDate: addMonths(firstDueDate, i - 1),
            amount
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
}