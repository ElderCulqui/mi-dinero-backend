const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { normalizeTimeZone } = require("@/helpers/timezone");
const prisma = db.getClient();

const register = async (email, password, name, timezone) => {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error("Email ya registrado");

  const hashedPassword = await bcrypt.hash(password, 10);
  const normalizedTimezone = normalizeTimeZone(timezone);
  const newUser = await prisma.user.create({
    data: { email, password: hashedPassword, name, timezone: normalizedTimezone },
  });

  return {
    id: newUser.id,
    email: newUser.email,
    name: newUser.name,
    timezone: newUser.timezone,
  };
};

const login = async (email, password, timezone) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error("Invalid email or password");

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) throw new Error("Invalid email or password");

  const normalizedTimezone = normalizeTimeZone(timezone);
  const timezoneChanged =
    timezone !== undefined && normalizedTimezone !== user.timezone;

  if (timezoneChanged) {
    await prisma.user.update({
      where: { id: user.id },
      data: { timezone: normalizedTimezone },
    });
    user.timezone = normalizedTimezone;
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: "2h" },
  );

  return {
    token: token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      timezone: user.timezone,
    },
  };
};

module.exports = { register, login };
