// server/grpc/grpcClient.js
import path from "path";
import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import { fileURLToPath } from "url";

import attendanceService from "../services/attendanceService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROTO_PATH = path.join(__dirname, "face.proto");
const packageDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const proto = grpc.loadPackageDefinition(packageDef).face;

let grpcClient = null;
let grpcCall = null;

// Connect gRPC stream to Python server
function connectGrpcStream(addr = process.env.GRPC_ADDR || "localhost:50051") {
  grpcClient = new proto.FaceService(addr, grpc.credentials.createInsecure());
  grpcCall = grpcClient.StreamRecognitions({});

  console.log("✅ gRPC stream started...");

  grpcCall.on("data", (response) => {
    if (response && response.student_id) {
      attendanceService.handleRecognition(response.student_id);
    }
  });

  grpcCall.on("error", (err) => {
    console.error("❌ gRPC stream error:", err.message);
  });

  grpcCall.on("end", () => {
    console.log("⚠️ gRPC stream ended.");
  });
}

// Explicit pause and resume functions
export async function pauseRecognition() {
  if (grpcCall) {
    console.log("🛑 Pausing recognition camera...");
    grpcCall.cancel();
    grpcCall = null;
  }
}

export async function resumeRecognition() {
  if (!grpcCall) {
    console.log("▶️ Resuming recognition camera...");
    connectGrpcStream();
  }
}

// Start client (optional initial call)
export default function startGrpcClient(addr) {
  console.log("Connecting to gRPC server at", addr);
  connectGrpcStream(addr);
}
