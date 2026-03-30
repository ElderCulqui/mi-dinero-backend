const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

class DatabaseConnection {
  constructor() {
    if (DatabaseConnection.instance) {
      return DatabaseConnection.instance;
    }

    const connectionString = `${process.env.DATABASE_URL}`;
    const adapter = new PrismaPg({ connectionString });

    this.prisma = new PrismaClient({
      adapter,
      log:
        process.env.NODE_ENV === "development"
          ? ["query", "error", "warn"]
          : ["error"],
    });

    DatabaseConnection.instance = this;
  }

  getClient() {
    return this.prisma;
  }

  async disconnect() {
    await this.prisma.$disconnect();
  }

  async connect() {
    await this.prisma.$connect();
  }
}

const databaseConnection = new DatabaseConnection();
Object.freeze(databaseConnection);

module.exports = databaseConnection;
