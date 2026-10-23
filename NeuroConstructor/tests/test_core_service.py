"""
End-to-end test for the NeuroConstructor gRPC core.

Starts the real gRPC server, creates a synthetic GGUF teacher model and
exercises every RPC of the NeuroService (Chat, GetStatus, LoadTeacherModel,
CreateStudentModel, ConvertModel, ValidateModel).

Usage:  python tests/test_core_service.py
"""
import os
import struct
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))
CORE_DIR = os.path.abspath(os.path.join(_HERE, "..", "NeuroConstructor.Core"))
for path in (CORE_DIR, os.path.join(CORE_DIR, "core")):
    if path not in sys.path:
        sys.path.insert(0, path)

import grpc
import NeuroConstructor_pb2 as pb
import NeuroConstructor_pb2_grpc as pb_grpc
from core.engine import NeuroServiceImplementation
from concurrent import futures

PORT = 50077
WORK_DIR = os.path.join(_HERE, "_artifacts")


def write_string(value: str) -> bytes:
    encoded = value.encode('utf-8')
    return struct.pack('<Q', len(encoded)) + encoded


def build_fake_gguf(path: str, family='llama', vocab=32000, hidden=2048,
                    layers=16, heads=16, context=2048) -> str:
    """Write a minimal but structurally valid GGUF file."""
    metadata = [
        ("general.architecture", 8, family),
        (f"{family}.vocab_size", 4, vocab),
        (f"{family}.embedding_length", 4, hidden),
        (f"{family}.block_count", 4, layers),
        (f"{family}.attention.head_count", 4, heads),
        (f"{family}.context_length", 4, context),
    ]

    payload = b'GGUF'
    payload += struct.pack('<I', 3)          # version
    payload += struct.pack('<Q', 0)          # tensor count
    payload += struct.pack('<Q', len(metadata))
    for key, value_type, value in metadata:
        payload += write_string(key)
        payload += struct.pack('<I', value_type)
        if value_type == 8:
            payload += write_string(value)
        elif value_type == 4:
            payload += struct.pack('<I', value)

    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'wb') as handle:
        handle.write(payload)
    return path


class Results:
    def __init__(self):
        self.passed = 0
        self.failed = 0

    def check(self, name, condition, detail=""):
        if condition:
            self.passed += 1
            print(f"  [PASS] {name}")
        else:
            self.failed += 1
            print(f"  [FAIL] {name} {detail}")
        return condition


def main() -> int:
    results = Results()

    print("Starting test gRPC server on port %d..." % PORT)
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=4))
    pb_grpc.add_NeuroServiceServicer_to_server(NeuroServiceImplementation(), server)
    server.add_insecure_port(f'[::]:{PORT}')
    server.start()

    os.makedirs(WORK_DIR, exist_ok=True)
    teacher_path = build_fake_gguf(os.path.join(WORK_DIR, "teacher.gguf"))
    student_path = os.path.join(WORK_DIR, "student.gguf")
    # CreateStudentModel stores the template inside the Core project's models folder.
    template_path = os.path.join(CORE_DIR, "models", "student_template.json")

    channel = grpc.insecure_channel(f'localhost:{PORT}')
    stub = pb_grpc.NeuroServiceStub(channel)

    try:
        print("\nGetStatus")
        status = stub.GetStatus(pb.StatusRequest())
        results.check("status returns a response", status is not None)
        results.check("no model loaded initially", status.model_loaded is False)

        print("\nChat")
        chat = stub.Chat(pb.ChatRequest(message="Hello core"))
        results.check("chat echoes the message", "Hello core" in chat.message, chat.message)
        results.check("chat is not an error", chat.is_error is False)

        print("\nLoadTeacherModel")
        load = stub.LoadTeacherModel(pb.TeacherModelRequest(model_path=teacher_path))
        results.check("teacher load succeeds", load.status == "success", load.error_message)
        results.check("teacher quality score is set", load.quality_score > 0.0)
        results.check("model info mentions the architecture", "llama" in load.model_info, load.model_info[:200])

        print("\nLoadTeacherModel with a missing file")
        missing = stub.LoadTeacherModel(pb.TeacherModelRequest(model_path=os.path.join(WORK_DIR, "nope.gguf")))
        results.check("missing teacher reports an error", missing.status == "error")

        print("\nCreateStudentModel")
        create = stub.CreateStudentModel(pb.CreateStudentRequest(teacher_model_path=teacher_path))
        results.check("student creation succeeds", create.status == "success", create.error_message)
        results.check("compression is reported", create.compression_applied is True)
        results.check("template file was written", os.path.exists(template_path), template_path)

        print("\nConvertModel")
        convert = stub.ConvertModel(pb.ConvertRequest(teacher_path=teacher_path, student_path=student_path))
        results.check("conversion succeeds", convert.status == "success", convert.error_message)
        results.check("conversion reports a compression ratio", convert.compression_ratio > 0.0)
        results.check("conversion reports a quality score", convert.quality_score > 0.0)
        results.check("student artefacts were written",
                      os.path.exists(os.path.join(WORK_DIR, "config.json")))

        print("\nValidateModel")
        validate = stub.ValidateModel(pb.ValidateRequest(
            teacher_model=teacher_path, student_model=template_path))
        results.check("validation completes", validate.error_message == "", validate.error_message)
        results.check("validation reports a compatibility score", validate.compatibility_score > 0.0)
        results.check("validation result is valid", validate.is_valid is True, validate.validation_results[:300])

        print("\nGetStatus after loading")
        status2 = stub.GetStatus(pb.StatusRequest())
        results.check("model is reported as loaded", status2.model_loaded is True)
        results.check("model path is reported", bool(status2.model_path))
    finally:
        channel.close()
        server.stop(0).wait(timeout=5)

    print(f"\n{results.passed} passed, {results.failed} failed")
    return 0 if results.failed == 0 else 1


if __name__ == '__main__':
    sys.exit(main())

