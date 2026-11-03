const { computeAccountBalances } = require("@/helpers/accountBalance");

describe("computeAccountBalances", () => {
    it("calcula el saldo de una cuenta bancaria", () => {
        const result = computeAccountBalances(
            {
                type: "cuenta_bancaria",
                openingBalanceMinor: 10000n,
                creditLimit: null,
            },
            { income: 2500n, expense: 1000n },
        );

        expect(result).toEqual({
            currentBalanceMinor: 11500n,
            debtMinor: null,
            availableCreditMinor: null,
        });
    });

    it("resta los egresos de una cuenta de efectivo con saldo inicial negativo", () => {
        const result = computeAccountBalances(
            { type: "efectivo", openingBalanceMinor: -500n, creditLimit: null },
            { income: 0n, expense: 250n },
        );

        expect(result.currentBalanceMinor).toBe(-750n);
    });

    it("calcula deuda y crédito disponible de una tarjeta", () => {
        const result = computeAccountBalances(
            {
                type: "tarjeta_credito",
                openingBalanceMinor: 50000n,
                creditLimit: 100000n,
            },
            { income: 1000n, expense: 3000n },
        );

        expect(result).toEqual({
            currentBalanceMinor: 52000n,
            debtMinor: 52000n,
            availableCreditMinor: 48000n,
        });
    });

    it("permite crédito disponible negativo cuando la deuda supera el límite", () => {
        const result = computeAccountBalances(
            {
                type: "tarjeta_credito",
                openingBalanceMinor: 120000n,
                creditLimit: 100000n,
            },
            { income: 0n, expense: 0n },
        );

        expect(result.availableCreditMinor).toBe(-20000n);
    });

    it("no calcula crédito disponible si la tarjeta no tiene límite", () => {
        const result = computeAccountBalances(
            {
                type: "tarjeta_credito",
                openingBalanceMinor: 5000n,
                creditLimit: null,
            },
            { income: 0n, expense: 0n },
        );

        expect(result.availableCreditMinor).toBeNull();
    });

    it("acepta importes serializados como cadena", () => {
        const result = computeAccountBalances(
            {
                type: "cuenta_bancaria",
                openingBalanceMinor: "1234",
                creditLimit: null,
            },
            { income: "100", expense: "34" },
        );

        expect(result.currentBalanceMinor).toBe(1300n);
    });
});
