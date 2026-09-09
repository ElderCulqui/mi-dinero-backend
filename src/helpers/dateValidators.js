const { body, param } = require("express-validator");

const FIVE_YEARS_MS = 5 * 365 * 24 * 60 * 60 * 1000;

const now = () => new Date();
const plus = (ms) => new Date(Date.now() + ms);
const minus = (ms) => new Date(Date.now() - ms);

const isInDateWindow = (source, field, { yearsAhead = 5, yearsAgo = 5 } = {}) => {
    const v = source === "param" ? param(field) : body(field);
    
    return v.custom((value) => {
        const d = new Date(value);
        if (isNaN(d.getTime())) return true;

        const max = plus(yearsAhead * 365 * 24 * 60 * 60 * 1000);
        const min = minus(yearsAgo * 365 * 24 * 60 * 60 * 1000);
        if (d > max) 
            throw new Error(`${field} está demasiado lejos en el futuro (max ${yearsAhead} años)`);
        
        if (d < min) 
            throw new Error(`${field} está demasiado lejos en el pasado (max ${yearsAgo} años)`);
        
        return true;
    });
}

const dateAfter = (source, field, otherField, { allowEqual = true, label } = {}) => {
    const v = source === "param" ? param(field) : body(field);

    return v.custom((value, { req }) => {
        const a = new Date(value);
        const otherRaw = source === "param" ? req.params[otherField] : req.body[otherField];
        if (!otherRaw) return true;
        const b = new Date(otherRaw);
        if (isNaN(b.getTime())) return true;
        if (isNaN(a.getTime())) return true;

        if (allowEqual ? a < b : a <= b) {
            const op = allowEqual ? ">=" : ">";
            throw new Error(`${label || field} debe ser ${op} ${otherField}`);
        }
        return true;
    });
}

const maxDaysApart = (source, fieldA, fieldB, maxDays) => {
    const v = source === "param" ? param(fieldA) : body(fieldA);
    return v.custom((value, { req }) => {
        const rawB = source === "param" ? req.params[fieldB] : req.body[fieldB];
        if (!rawB) return true;
        const a = new Date(value);
        const b = new Date(rawB);
        if (isNaN(a.getTime()) || isNaN(b.getTime())) return true;
        const diffDays = Math.abs(a - b) / (1000 * 60 * 60 *24);
        if (diffDays > maxDays) {
            throw new Error(`La diferencia entre ${fieldA} y ${fieldB} no puede superar ${maxDays} días`);
        }
        return true;
    })
}

module.exports = {
    isInDateWindow,
    dateAfter,
    maxDaysApart,
    FIVE_YEARS_MS
}