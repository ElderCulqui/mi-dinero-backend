const db = require("../config/db");
const prisma = db.getClient();

exports.createAccount = async (data) => {
  const conflict = await prisma.account.findFirst({
    where: {
      date: data.date,
      timeBlockId: data.timeBlockId,
    },
  });
  if (conflict) {
    throw new Error("El horario yua esta ocupado");
  }

  return prisma.appointment.create({ data });
};
