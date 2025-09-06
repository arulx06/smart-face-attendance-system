const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const attendanceService = require('../services/attendanceService');

const PROTO_PATH = path.join(__dirname, 'face.proto'); // ensure face.proto copied here
const packageDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true, longs: String, enums: String, defaults: true, oneofs: true
});
const proto = grpc.loadPackageDefinition(packageDef).face;

function startGrpcClient(addr = process.env.GRPC_ADDR || 'localhost:50051') {
  const client = new proto.FaceService(addr, grpc.credentials.createInsecure());
  const call = client.StreamRecognitions({});

  call.on('data', (response) => {
    if (response && response.student_id) {
      attendanceService.handleRecognition(response.student_id);
    }
  });

  call.on('error', (err) => {
    console.error('gRPC stream error:', err);
    // Optionally implement reconnect/backoff here
  });

  call.on('end', () => {
    console.log('gRPC stream ended');
    // consider reconnect strategy
  });

  console.log('Connected to gRPC server at', addr);
}

module.exports = { startGrpcClient };
