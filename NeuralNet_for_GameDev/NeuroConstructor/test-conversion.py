# -*- coding: utf-8 -*-
"""Test conversion endpoint"""
import requests
import json

API = "http://127.0.0.1:8000"

# 1. Test convert endpoint (no actual model, should fail gracefully)
print("=== Test: convert model ===")
r = requests.post(f"{API}/api/models/convert", json={
    "teacher_path": "teacher/test.gguf",
    "student_path": "student/test_student.gguf"
}, timeout=30)

print(f"Status: {r.status_code}")
print(f"Response: {json.dumps(r.json(), indent=2, ensure_ascii=False)}")

# 2. Test create student from scratch (this worked before)
print("\n=== Test: create student from scratch ===")
r = requests.post(f"{API}/api/models/student/scratch", json={
    "model_family": "test-model",
    "hidden_size": 512,
    "num_layers": 8,
    "num_heads": 8,
    "num_kv_heads": 2,
    "vocab_size": 32000,
    "max_position_embeddings": 2048,
    "rope_theta": 10000,
    "head_dim": 64
}, timeout=30)

print(f"Status: {r.status_code}")
data = r.json()
print(f"Response: {json.dumps(data, indent=2, ensure_ascii=False)}")

# 3. List models
print("\n=== Test: list models ===")
r = requests.get(f"{API}/api/models/list", params={"directory": "student"}, timeout=5)
print(f"Status: {r.status_code}")
data = r.json()
print(f"Response: {json.dumps(data, indent=2, ensure_ascii=False)}")

# 4. Test chat after conversion
print("\n=== Test: chat with mode human-student ===")
r = requests.post(f"{API}/api/chat/mode", json={
    "mode": "human-student",
    "message": "Hello, who are you?",
    "history": []
}, timeout=60)

print(f"Status: {r.status_code}")
data = r.json()
print(f"Response: {json.dumps(data, indent=2, ensure_ascii=False)}")
