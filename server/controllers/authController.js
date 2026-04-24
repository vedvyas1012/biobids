const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { generateTokens, splitName } = require('../utils/helpers');
const { createEscrowCustomer } = require('../utils/escrowService');

const register = async (req, res) => {
  try {
    const { name, email, phone, password, role, gst_number, location_state, location_district } = req.body;

    if (role === 'admin') return res.status(403).json({ message: 'Cannot register as admin' });

    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(409).json({ message: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 12);
    const user = await User.create({
      name, email, phone, password: hashed, role,
      gst_number: role === 'buyer' ? gst_number : null,
      location_state, location_district,
    });

    const { token, refreshToken } = generateTokens(user);
    await user.update({ refresh_token: refreshToken });

    // Register user with Escrow.com so they exist before any transaction (non-fatal)
    const { firstName, lastName } = splitName(user.name);
    createEscrowCustomer({
      email: user.email,
      firstName,
      lastName,
      phone: user.phone,
    }).catch((e) => console.error('[Register] Escrow customer creation failed (non-fatal):', e.message));

    res.status(201).json({
      token, refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

    const { token, refreshToken } = generateTokens(user);
    await user.update({ refresh_token: refreshToken });

    res.json({
      token, refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) return res.status(401).json({ message: 'No refresh token' });

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await User.findByPk(decoded.id);
    if (!user || user.refresh_token !== token) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    const tokens = generateTokens(user);
    await user.update({ refresh_token: tokens.refreshToken });

    res.json(tokens);
  } catch {
    res.status(401).json({ message: 'Invalid or expired refresh token' });
  }
};

const getMe = async (req, res) => {
  res.json({ user: req.user });
};

const logout = async (req, res) => {
  await req.user.update({ refresh_token: null });
  res.json({ message: 'Logged out successfully' });
};

module.exports = { register, login, refreshToken, getMe, logout };
