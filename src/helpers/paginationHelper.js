const db = require("../config/db");
const prisma = db.getClient();

async function paginate(model, page = 1, pageSize = 10, options = {}) {
  const skip = (page - 1) * pageSize;

  const [data, total] = await Promise.all([
    prisma[model].findMany({
      skip,
      take: pageSize,
      ...options,
    }),
    prisma[model].count({
      where: options.where || {},
    }),
  ]);

  return {
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      hasNextPage: page * pageSize < total,
      hasPreviousPage: page > 1,
    },
  };
}

module.exports = { paginate };
