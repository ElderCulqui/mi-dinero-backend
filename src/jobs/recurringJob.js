const cron = require("node-cron");
const recurringExpenseService = require("@/services/recurringExpenseService");

const run = async () => {
    try {
        const created = await recurringExpenseService.processDue();
        if (created.length > 0) {
            console.log(`Recurring expenses created: ${created.length}`);
        }
    } catch (error) {
        console.error("Error processing recurring expenses:", error);
    }
};

cron.schedule("5 0 * * *", run);

run();

module.exports = { run };
