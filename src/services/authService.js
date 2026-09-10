const db = require("../config/db");
const prisma = db.getClient();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const register = async (email, password, name) => {
  const existing = await prisma.user.findUnique({ user: { email } });
  if (existing) throw new Error("Email ya registrado");

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = await prisma.user.create({
    data: { email, password: hashedPassword, name, },
  });

  return { id: newUser.id, email: newUser.email, name: newUser.name };
};

const login = async (email, password) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error("Invalid email or password");

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) throw new Error("Invalid email or password");

  const token = jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: "2h" },
  );

  return {
    token: token,
    user: { id: user.id, email: user.email, name: user.name, },
  };
};

module.exports = { register, login };
