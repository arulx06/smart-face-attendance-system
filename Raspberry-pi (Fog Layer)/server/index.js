import http from "http";
import { Server } from "socket.io";

import app from "./app.js";
import { connectDB } from "./config/db.js";
import attendanceService from "./services/attendanceService.js";
import startGrpcClient from "./grpc/grpcClient.js";

const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB();

  const server = http.createServer(app);

  const io = new Server(server, {
    cors: {
      origin: process.env.SOCKET_ORIGIN?.split(","),
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("🔌 Frontend connected:", socket.id);

    socket.on("disconnect", () => {
      console.log("❌ Frontend disconnected:", socket.id);
    });
  });

  // Allow attendance service to emit socket events
  attendanceService.init(io);

  // Start gRPC client (Python → Node stream)
  startGrpcClient(process.env.GRPC_ADDR);

  server.listen(PORT, () => {
    console.log(`🚀 Backend running at http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error("❌ Failed to start server:", err);
  process.exit(1);
});
