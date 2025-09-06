require('dotenv').config();
const http = require('http');
const socketIo = require('socket.io');
const app = require('./app');
const connectDB = require('./config/db');
const attendanceService = require('./services/attendanceService');
const { startGrpcClient } = require('./grpc/grpcClient');

const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB(process.env.MONGO_URI);

  const server = http.createServer(app);
  const io = socketIo(server, { cors: { origin: '*' } });

  io.on('connection', (socket) => {
    console.log('Frontend connected:', socket.id);
    socket.on('disconnect', () => console.log('Frontend disconnected:', socket.id));
  });

  // initialize attendance service with io so it can emit
  attendanceService.init(io);

  // start gRPC client that listens to Python stream
  startGrpcClient(process.env.GRPC_ADDR);

  server.listen(PORT, () => console.log(`Backend listening http://localhost:${PORT}`));
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
