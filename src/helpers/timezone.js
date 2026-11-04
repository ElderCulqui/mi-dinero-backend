const { DateTime } = require("luxon");

const DEFAULT_TIMEZONE = "America/Lima";

const normalizeTimeZone = (timeZone) => {
    if (!timeZone || typeof timeZone !== "string") return DEFAULT_TIMEZONE;
    try {
        return new Intl.DateTimeFormat("en-US", { timeZone }).resolvedOptions()
            .timeZone;
    } catch {
        return DEFAULT_TIMEZONE;
    }
};

const toDateOnly = (value) => {
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    return String(value).slice(0, 10);
};

const localDateOf = (instant, timeZone) => {
    const date = instant instanceof Date ? instant : new Date(instant);
    return DateTime.fromJSDate(date, {
        zone: normalizeTimeZone(timeZone),
    }).toISODate();
};

const startOfDayUtc = (dateOnly, timeZone) =>
    DateTime.fromISO(toDateOnly(dateOnly), {
        zone: normalizeTimeZone(timeZone),
    })
        .startOf("day")
        .toUTC()
        .toJSDate();

const endOfDayUtc = (dateOnly, timeZone) =>
    DateTime.fromISO(toDateOnly(dateOnly), {
        zone: normalizeTimeZone(timeZone),
    })
        .endOf("day")
        .toUTC()
        .toJSDate();

const localNoonUtc = (dateOnly, timeZone) =>
    DateTime.fromISO(toDateOnly(dateOnly), {
        zone: normalizeTimeZone(timeZone),
    })
        .set({ hour: 12, minute: 0, second: 0, millisecond: 0 })
        .toUTC()
        .toJSDate();

const monthRangeUtc = (month, timeZone) => {
    const zone = normalizeTimeZone(timeZone);
    const base = month
        ? DateTime.fromFormat(month, "yyyy-MM", { zone })
        : DateTime.now().setZone(zone);

    if (!base.isValid) {
        throw Object.assign(
            new Error("month debe tener el formato YYYY-MM"),
            { status: 400 },
        );
    }

    return {
        from: base.startOf("month").toUTC().toJSDate(),
        to: base.plus({ months: 1 }).startOf("month").toUTC().toJSDate(),
        key: base.toFormat("yyyy-MM"),
    };
};

module.exports = {
    DEFAULT_TIMEZONE,
    normalizeTimeZone,
    toDateOnly,
    localDateOf,
    startOfDayUtc,
    endOfDayUtc,
    localNoonUtc,
    monthRangeUtc,
};
