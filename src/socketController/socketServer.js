const { Server } = require("socket.io");
const LogController = require("./LogController");

const SOCKET_PORT = process.env.SOCKET_PORT || 4344; // Use a separate port for the socket server

const io = new Server(SOCKET_PORT, {
  cors: {
    origin: "*", // Allow all origins for development
  },
});

console.log(`Socket.IO server running on port ${SOCKET_PORT}`);

// Pass the `io` instance to the LogController
LogController(io);
