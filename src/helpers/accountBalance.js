const { parseMinor } = require("./money");

function toMinorOrZero(value) {
    return value === null || value === undefined ? 0n : parseMinor(value);
}

function computeAccountBalances(account, totals = {}) {
    const opening = toMinorOrZero(account.openingBalanceMinor);
    const income = toMinorOrZero(totals.income);
    const expense = toMinorOrZero(totals.expense);

    if (account.type === "tarjeta_credito") {
        const debt = opening + expense - income;
        const limit =
            account.creditLimit === null || account.creditLimit === undefined
                ? null
                : parseMinor(account.creditLimit);

        return {
            currentBalanceMinor: debt,
            debtMinor: debt,
            availableCreditMinor: limit === null ? null : limit - debt,
        };
    }

    return {
        currentBalanceMinor: opening + income - expense,
        debtMinor: null,
        availableCreditMinor: null,
    };
}

module.exports = { computeAccountBalances };
