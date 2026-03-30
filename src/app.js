const express = require("express");
const routes = require("./routes");
const LoggerMiddleware = require("./middlewares/logger");
const errorHandler = require("./middlewares/errorHandler");
const db = require("./config/db");
const app = express();

app.use(express.json());
app.use(LoggerMiddleware);
app.use(errorHandler);

app.use("/api", routes);

app.get("/", (req, res) => {
  res.send("Hello World from MI DINERO API!");
});

process.on("SIGINT", async () => {
  await db.disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await db.disconnect();
  process.exit(0);
});

module.exports = app;
