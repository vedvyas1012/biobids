require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const { sequelize } = require('./models');
const { initSockets } = require('./sockets');
const { startEscrowCron, setIo: setCronIo } = require('./utils/escrow');
const { setIo: setPaymentIo } = require('./controllers/paymentController');
const { setIo: setOrderIo } = require('./controllers/orderController');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL, credentials: true },
});

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/listings', require('./routes/listings'));
app.use('/api', require('./routes/bids'));            // /api/listings/:id/bids + /api/bids/:id/*
app.use('/api/orders', require('./routes/orders'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/admin', require('./routes/admin'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', ts: new Date() }));

// Socket.io
setPaymentIo(io);
setOrderIo(io);
setCronIo(io);
initSockets(io);

// Cron jobs
startEscrowCron();

// DB sync + start
const PORT = process.env.PORT || 5000;

sequelize
  .authenticate()
  .then(() => {
    console.log('MySQL connected');
    return sequelize.sync({ alter: true }); // use migrations in production
  })
  .then(() => {
    server.listen(PORT, () => console.log(`BioBids server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('DB connection failed:', err.message);
    process.exit(1);
  });
