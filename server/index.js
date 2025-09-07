import dotenv from "dotenv"
import path from "path"
import http from "http"
import {Server} from "socket.io"
import app from "./app.js"
import {connectDB} from "./config/db.js"
import attendanceService from "./services/attendanceService.js"
import startGrpcClient from "./grpc/grpcClient.js"


dotenv.config();
const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB();

  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: '*' } });

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
