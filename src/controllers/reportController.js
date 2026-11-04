const service = require("@/services/reportService");

const getMonthlySummary = async (req, res) => {
    try {
        const summary = await service.getMonthlySummary(
            req.user.id,
            req.query.month,
        );
        res.json(summary);
    } catch (error) {
        res.status(error.status || 500).json({ error: error.message });
    }
};

module.exports = { getMonthlySummary };
