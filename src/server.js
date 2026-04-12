require("module-alias/register");

const app = require("@/app");
require("@/jobs/exchangeRateJob");

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor ejecutandose en http://localhost:${PORT}`);
});
