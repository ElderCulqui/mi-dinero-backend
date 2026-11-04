require("module-alias/register");

const app = require("@/app");
require("@/jobs/exchangeRateJob");
require("@/jobs/recurringJob");

const PORT = process.env.PORT || 3000;

const dbName = (() => {
  try {
    return new URL(process.env.DATABASE_URL).pathname.replace(/^\//, "");
  } catch {
    return "desconocida";
  }
})();

console.log(`Entorno: ${process.env.NODE_ENV || "development"} | Base: ${dbName} | Puerto: ${PORT}`);

app.listen(PORT, () => {
  console.log(`Servidor ejecutandose en http://localhost:${PORT}`);
});
