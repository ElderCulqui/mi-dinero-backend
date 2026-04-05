const express = require("express");
const routes = require("./routes");
const cors = require("cors");
const LoggerMiddleware = require("./middlewares/logger");
const errorHandler = require("./middlewares/errorHandler");
const db = require("./config/db");
const app = express();

const corsOptions = {
  origin: function (origin, callback) {
    // console.log("CORS origin:", origin, process.env.FRONTEND_URL);
    callback(null, true);
    // if (origin === process.env.FRONTEND_URL) {
    //   callback(null, true);
    // } else {
    //   callback(new Error("Error de cors"));
    // }
  },
};

app.use(cors(corsOptions));
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
