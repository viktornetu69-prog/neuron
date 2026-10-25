# -*- coding: utf-8 -*-
"""
Real integration tests for NeuroConstructor
"""

import requests
import json
import time
import os
import sys

API_BASE = "http://127.0.0.1:8000"
PASS = 0
FAIL = 0

def test(name, fn):
    global PASS, FAIL
    try:
        fn()
        print(f"  [PASS] {name}")
        PASS += 1
    except Exception as e:
        print(f"  [FAIL] {name}: {e}")
        FAIL += 1

# ============================================================================
# Tests
# ============================================================================

def test_health():
    r = requests.get(f"{API_BASE}/health", timeout=5)
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "healthy"

def test_status():
    r = requests.get(f"{API_BASE}/api/status", timeout=5)
    assert r.status_code == 200
    data = r.json()
    assert "model_loaded" in data

def test_chat_mode_human_teacher():
    r = requests.post(
        f"{API_BASE}/api/chat/mode",
        json={"mode": "human-teacher", "message": "Test", "history": []},
        timeout=60
    )
    assert r.status_code == 200
    data = r.json()
    assert "success" in data or "error" not in data

def test_chat_mode_human_student():
    r = requests.post(
        f"{API_BASE}/api/chat/mode",
        json={"mode": "human-student", "message": "Test", "history": []},
        timeout=60
    )
    assert r.status_code == 200
    data = r.json()
    assert "success" in data or "error" not in data

def test_chat_mode_teacher_student():
    r = requests.post(
        f"{API_BASE}/api/chat/mode",
        json={"mode": "teacher-student", "message": "Test", "history": []},
        timeout=60
    )
    assert r.status_code == 200
    data = r.json()
    assert "success" in data or "error" not in data

def test_chat_export():
    r = requests.post(
        f"{API_BASE}/api/chat/export",
        json={"mode": "human-teacher", "messages": []},
        timeout=5
    )
    assert r.status_code == 200
    data = r.json()
    assert "success" in data

def test_datasets_list():
    r = requests.get(f"{API_BASE}/api/datasets/list", params={"path": "."}, timeout=5)
    # May return 200 or 404 depending on implementation
    assert r.status_code in [200, 404]

def test_datasets_templates():
    r = requests.get(f"{API_BASE}/api/datasets/templates", timeout=5)
    assert r.status_code == 200
    data = r.json()
    assert "templates" in data

def test_stage6_ai():
    r = requests.post(
        f"{API_BASE}/api/stage6/ai",
        json={"metrics": {"accuracy": 0.9, "latency": 0.8}},
        timeout=5
    )
    assert r.status_code == 200
    data = r.json()
    assert "predicted_performance" in data
    assert 0 <= data["predicted_performance"] <= 1

def test_stage6_forecast():
    r = requests.post(
        f"{API_BASE}/api/stage6/forecast",
        json={"forecast_horizon": 5},
        timeout=5
    )
    assert r.status_code == 200
    data = r.json()
    assert "predicted_loads" in data

def test_stage6_auto_fix():
    r = requests.post(
        f"{API_BASE}/api/stage6/auto-fix",
        json={"error_type": "memory", "error_data": "OOM"},
        timeout=5
    )
    assert r.status_code == 200
    data = r.json()
    assert "fixes_applied" in data

def test_stage6_self_learning():
    r = requests.post(
        f"{API_BASE}/api/stage6/self-learning",
        json={"results": [{"success": True, "score": 0.9}]},
        timeout=5
    )
    assert r.status_code == 200
    data = r.json()
    assert "success" in data

def test_create_student_from_scratch():
    """Create a Student model from scratch"""
    r = requests.post(
        f"{API_BASE}/api/models/student/scratch",
        json={
            "model_family": "test-llama",
            "hidden_size": 512,
            "num_layers": 8,
            "num_heads": 8,
            "num_kv_heads": 2,
            "vocab_size": 32000,
            "max_position_embeddings": 2048,
            "rope_theta": 10000,
            "head_dim": 64,
        },
        timeout=10
    )
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "created"
    assert "student_model_info" in data

def test_models_list_teacher():
    """List teacher model files"""
    r = requests.get(f"{API_BASE}/api/models/list", params={"directory": "teacher"}, timeout=5)
    assert r.status_code == 200
    data = r.json()
    assert "files" in data

def test_models_list_student():
    """List student model files"""
    r = requests.get(f"{API_BASE}/api/models/list", params={"directory": "student"}, timeout=5)
    assert r.status_code == 200
    data = r.json()
    assert "files" in data

# ============================================================================
# Run tests
# ============================================================================

if __name__ == "__main__":
    print("=" * 60)
    print("NeuroConstructor Integration Tests")
    print("=" * 60)
    
    print("\n1. Health & Status")
    test("GET /health", test_health)
    test("GET /api/status", test_status)
    
    print("\n2. Chat Modes")
    test("chat human-teacher", test_chat_mode_human_teacher)
    test("chat human-student", test_chat_mode_human_student)
    test("chat teacher-student", test_chat_mode_teacher_student)
    test("chat export", test_chat_export)
    
    print("\n3. Datasets")
    test("datasets list", test_datasets_list)
    test("datasets templates", test_datasets_templates)
    
    print("\n4. Stage 6 AI")
    test("stage6 AI", test_stage6_ai)
    test("stage6 forecast", test_stage6_forecast)
    test("stage6 auto-fix", test_stage6_auto_fix)
    test("stage6 self-learning", test_stage6_self_learning)
    
    print("\n5. Models")
    test("create student from scratch", test_create_student_from_scratch)
    test("list teacher models", test_models_list_teacher)
    test("list student models", test_models_list_student)
    
    print("\n" + "=" * 60)
    print(f"Results: {PASS} passed, {FAIL} failed, {PASS + FAIL} total")
    print("=" * 60)
    
    sys.exit(1 if FAIL > 0 else 0)
