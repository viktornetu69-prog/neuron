"""
Auto-install LLM Engine dependencies.

Проверяет и устанавливает:
- llama-cpp-python — для GGUF моделей
- requests — для Ollama API

Запуск:
  python install_llm_engine.py
"""

import subprocess
import sys
import os

# Fix encoding for Windows console
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')


def check_package(name: str) -> bool:
    """Проверить, установлен ли пакет."""
    try:
        __import__(name)
        return True
    except ImportError:
        return False


def install_package(name: str, upgrade: bool = True) -> bool:
    """Установить пакет через pip."""
    cmd = [sys.executable, "-m", "pip", "install"]
    if upgrade:
        cmd.append("--upgrade")
    cmd.append(name)

    print(f"  Installing {name}...")
    result = subprocess.run(cmd, capture_output=False)
    return result.returncode == 0


def main():
    print("=" * 60)
    print("NeuroConstructor — LLM Engine Auto-Installer")
    print("=" * 60)
    print()

    # 1. Проверяем llama-cpp-python
    print("1. Checking llama-cpp-python...")
    if not check_package("llama_cpp"):
        print("   ❌ Not installed — installing...")
        success = install_package("llama-cpp-python")
        if success:
            print("   ✅ llama-cpp-python installed successfully")
        else:
            print("   ❌ Installation failed — try manually:")
            print("      pip install llama-cpp-python")
    else:
        print("   ✅ llama-cpp-python already installed")

    # 2. Проверяем requests (для Ollama)
    print()
    print("2. Checking requests (Ollama API)...")
    if not check_package("requests"):
        print("   ❌ Not installed — installing...")
        success = install_package("requests")
        if success:
            print("   ✅ requests installed successfully")
        else:
            print("   ❌ Installation failed")
    else:
        print("   ✅ requests already installed")

    # 3. Проверяем модели
    print()
    print("3. Checking models...")
    teacher_dir = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "NeuroConstructor.Core", "models", "teacher"
    )
    if os.path.exists(teacher_dir):
        gguf_files = [f for f in os.listdir(teacher_dir) if f.endswith('.gguf')]
        if gguf_files:
            print(f"   ✅ Found {len(gguf_files)} GGUF model(s):")
            for f in gguf_files:
                size = os.path.getsize(os.path.join(teacher_dir, f)) / (1024**3)
                print(f"      • {f} ({size:.2f} GB)")
        else:
            print("   ⚠️  No GGUF models found — upload to models/teacher/")
    else:
        print("   ⚠️  Teacher model directory not found")

    print()
    print("=" * 60)
    print("✅ Installation complete!")
    print("=" * 60)
    print()
    print("Next steps:")
    print("  1. Run backend:  python main.py")
    print("  2. Open Benchmark panel in UI")
    print("  3. LLM Engine should show: ✅ llama-cpp-python Available")


if __name__ == "__main__":
    main()
