"""
Main entry point for the NeuroConstructor Python Core.
This script starts the gRPC server that the C# UI will communicate with.
"""
import os
import sys
import grpc
from concurrent import futures

# Ensure both the package root and the generated-code directory are importable
_CORE_DIR = os.path.dirname(os.path.abspath(__file__))
if _CORE_DIR not in sys.path:
    sys.path.insert(0, _CORE_DIR)
_CORE_PACKAGE_DIR = os.path.join(_CORE_DIR, "core")
if _CORE_PACKAGE_DIR not in sys.path:
    sys.path.insert(0, _CORE_PACKAGE_DIR)

import NeuroConstructor_pb2_grpc
import NeuroConstructor_pb2

# Import our service implementation
from core.engine import NeuroServiceImplementation


def serve():
    # Start gRPC server on local port 50051 (override with NEURO_PORT)
    port = os.environ.get("NEURO_PORT", "50051")
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    
    # Register our service
    NeuroConstructor_pb2_grpc.add_NeuroServiceServicer_to_server(
        NeuroServiceImplementation(), server
    )
    
    print(f"Starting Python Core server on port {port}...")
    server.add_insecure_port(f'[::]:{port}')
    server.start()
    
    # Keep server running
    server.wait_for_termination()


if __name__ == '__main__':
    # Write PID file for tracking by startup script
    import os
    pid_file = os.path.join(_CORE_DIR, "server.pid")
    with open(pid_file, "w") as f:
        f.write(str(os.getpid()))
    
    # Setup file logging
    log_file = os.path.join(_CORE_DIR, "server.log")
    os.makedirs(os.path.dirname(log_file) if os.path.dirname(log_file) else ".", exist_ok=True)
    
    import logging
    logger = logging.getLogger()
    logger.setLevel(logging.INFO)
    handler = logging.FileHandler(log_file, encoding="utf-8")
    formatter = logging.Formatter("%(asctime)s - %(levelname)s - %(message)s")
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    
    serve()
