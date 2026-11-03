function parseMinor(value) {
    if (typeof value === "bigint") return value;

    if (typeof value === "number" && Number.isSafeInteger(value)) {
        return BigInt(value);
    }

    if (typeof value !== "string" || !/^-?\d+$/.test(value)) {
        throw Object.assign(
            new Error("El importe debe ser una cadena entera en unidades menores"),
            { status: 400 },
        );
    }

    return BigInt(value);
}

function rateFraction(rate) {
    const text = String(rate);
    const match = /^(\d+)(?:\.(\d+))?$/.exec(text);

    if (!match) {
        const numeric = Number(rate);
        if (!Number.isFinite(numeric) || numeric < 0) {
            throw new Error("Tipo de cambio inválido");
        }

        return rateFraction(
            numeric.toFixed(10).replace(/0+$/, "").replace(/\.$/, ""),
        );
    }

    const fraction = match[2] ?? "";

    return {
        numerator: BigInt(match[1] + fraction),
        denominator: 10n ** BigInt(fraction.length),
    };
}

function roundHalfUp(numerator, denominator) {
    if (denominator === 0n) {
        throw Object.assign(new Error("Tipo de cambio inválido"), { status: 400 });
    }

    const sign = numerator < 0n ? -1n : 1n;
    const absolute = numerator < 0n ? -numerator : numerator;
    return sign * ((absolute + denominator / 2n) / denominator);
}

function multiplyMinorByRate(amountMinor, rate) {
    const { numerator, denominator } = rateFraction(rate);
    return roundHalfUp(parseMinor(amountMinor) * numerator, denominator);
}

function divideMinorByRate(amountMinor, rate) {
    const { numerator, denominator } = rateFraction(rate);
    return roundHalfUp(parseMinor(amountMinor) * denominator, numerator);
}

module.exports = {
    parseMinor,
    multiplyMinorByRate,
    divideMinorByRate,
    roundHalfUp,
};
