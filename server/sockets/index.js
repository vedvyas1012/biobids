const { setIo: setBidIo } = require('../controllers/bidController');

const initSockets = (io) => {
  setBidIo(io);

  io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    socket.on('join_listing_room', ({ listing_id }) => {
      socket.join(`listing_${listing_id}`);
      console.log(`[Socket] ${socket.id} joined listing_${listing_id}`);
    });

    socket.on('leave_listing_room', ({ listing_id }) => {
      socket.leave(`listing_${listing_id}`);
    });

    socket.on('join_user_room', ({ user_id }) => {
      socket.join(`user_${user_id}`);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });
};

module.exports = { initSockets };
