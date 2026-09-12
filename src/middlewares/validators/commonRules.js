const { body, param } = require("express-validator");

const paramIntId = (paramName = "id", msg = "id inválido") => [
    param(paramName).isInt().withMessage(msg)
];

const positiveInt = (source, field, label) => {
    const v = source === "param" ? param(field) : body(field);
    return v.isInt({ min: 1 }).withMessage(`${label || field} debe ser entero positivo`);
}

const nonNegativeNumeric = (source, field, label) => {
    const v = source === "param" ? param(field) : body(field);
    return v.isFloat({ min: 0 }).withMessage(`${label || field} debe ser numérico ≥ 0`);
};

module.exports = { paramIntId, positiveInt, nonNegativeNumeric };

