const service = require("../services/authService");

const register = async (req, res) => {
  try {
    const { email, password, name } = req.body;
    const user = await service.register(email, password, name);
    return res.status(201).json(user);
  } catch (error) {
    const status = error.message.includes("ya registrado") ? 409 : 400;
    res.status(status).json({ error: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await service.login(email, password);
    return res.json(result);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

module.exports = { register, login };
