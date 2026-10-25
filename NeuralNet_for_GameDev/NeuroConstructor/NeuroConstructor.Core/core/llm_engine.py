"""
LLM Engine — universal interface for Large Language Models.

Supports:
1. llama-cpp-python — GGUF models (CPU/GPU)
2. Ollama API — local LLM server
3. Mock mode — fallback for testing

Usage:
    engine = LLMEngine.from_gguf("path/to/model.gguf")
    engine = LLMEngine.from_ollama(url="http://localhost:11434", model="llama3")
    engine = LLMEngine.mock()  # default
    
    result = engine.generate(
        prompt="What is AI?",
        max_tokens=512,
        temperature=0.7,
    )
"""

import json
import os
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, field
from datetime import datetime


# ─── Optional imports ────────────────────────────────────────────────────────

try:
    from llama_cpp import Llama
    LLAMA_CPP_AVAILABLE = True
except ImportError:
    LLAMA_CPP_AVAILABLE = False
    Llama = None

try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False
    requests = None


# ─── Data classes ────────────────────────────────────────────────────────────

@dataclass
class InferenceConfig:
    """Configuration for model inference."""
    max_tokens: int = 512
    temperature: float = 0.7
    top_p: float = 0.9
    top_k: int = 40
    repeat_penalty: float = 1.1
    stop_sequences: List[str] = field(default_factory=lambda: ["\n\n", "<|endoftext|>"])
    n_ctx: int = 2048


@dataclass
class InferenceResult:
    """Result of model inference."""
    text: str
    tokens_generated: int
    inference_time_ms: float
    model_name: str
    success: bool
    error: Optional[str] = None
    usage: Dict[str, int] = field(default_factory=dict)

    def to_dict(self) -> Dict:
        return {
            "text": self.text[:500],  # Truncate for API
            "tokens_generated": self.tokens_generated,
            "inference_time_ms": round(self.inference_time_ms, 2),
            "model_name": self.model_name,
            "success": self.success,
            "error": self.error,
            "usage": self.usage,
        }


# ─── LLM Engine Base ─────────────────────────────────────────────────────────

class LLMEngine:
    """
    Universal LLM inference engine supporting multiple backends.
    
    Backends:
    - llama_cpp: GGUF models via llama-cpp-python
    - ollama: Local Ollama server via HTTP API
    - mock: Fake responses for testing
    """

    def __init__(self, backend: str = "mock", config: Optional[InferenceConfig] = None):
        self.backend = backend
        self.config = config or InferenceConfig()
        self.model = None
        self.model_name = "mock"
        self._initialized = False

    def init(self) -> bool:
        """Initialize the model backend."""
        raise NotImplementedError("Subclasses must implement init()")

    def generate(self, prompt: str, **kwargs) -> InferenceResult:
        """Generate text from prompt."""
        raise NotImplementedError("Subclasses must implement generate()")

    @classmethod
    def from_gguf(
        cls,
        model_path: str,
        config: Optional[InferenceConfig] = None,
        n_gpu_layers: int = -1,
        n_threads: int = 8,
    ) -> "LLMEngine":
        """Create LLM Engine from GGUF model (llama-cpp-python)."""
        if not LLAMA_CPP_AVAILABLE:
            raise ImportError(
                "llama-cpp-python is not installed. "
                "Install with: pip install llama-cpp-python"
            )

        return LlamaCppEngine(
            model_path=model_path,
            config=config,
            n_gpu_layers=n_gpu_layers,
            n_threads=n_threads,
        )

    @classmethod
    def from_ollama(
        cls,
        url: str = "http://localhost:11434",
        model: str = "llama3",
        config: Optional[InferenceConfig] = None,
    ) -> "LLMEngine":
        """Create LLM Engine from Ollama API."""
        if not REQUESTS_AVAILABLE:
            raise ImportError(
                "requests library is not installed. "
                "Install with: pip install requests"
            )

        return OllamaEngine(
            url=url,
            model=model,
            config=config,
        )

    @classmethod
    def mock(cls) -> "LLMEngine":
        """Create mock LLM Engine for testing."""
        engine = cls(backend="mock", config=InferenceConfig())
        engine._initialized = True
        return engine

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    @property
    def backend_name(self) -> str:
        return self.backend


# ─── GGUF Backend (llama-cpp-python) ─────────────────────────────────────────

class LlamaCppEngine(LLMEngine):
    """LLM Engine wrapper for llama-cpp-python."""

    def __init__(self, model_path: str, config: Optional[InferenceConfig] = None,
                 n_gpu_layers: int = -1, n_threads: int = 8):
        super().__init__(backend="llama_cpp", config=config)
        self.model_path = model_path
        self.n_gpu_layers = n_gpu_layers
        self.n_threads = n_threads
        self.model = None
        # Auto-init
        self.init()

    def init(self) -> bool:
        if not LLAMA_CPP_AVAILABLE:
            raise ImportError("llama-cpp-python is not installed")

        try:
            gpu = self.n_gpu_layers if self.n_gpu_layers >= 0 else 0  # Fallback to CPU
            self.model = Llama(
                model_path=self.model_path,
                n_gpu_layers=gpu,
                n_threads=self.n_threads,
                n_ctx=self.config.n_ctx if self.config else 2048,
            )
            self.model_name = os.path.basename(self.model_path)
            self._initialized = True
            return True
        except Exception as e:
            print(f"LlamaCppEngine init error: {e}")
            raise RuntimeError(f"Failed to load GGUF model: {str(e)}")

    def generate_stream(self, prompt: str, **kwargs):
        """Генерация потока токенов (streaming)"""
        if not self._initialized or not self.model:
            raise RuntimeError("Engine not initialized")

        import time
        start_time = time.time()

        try:
            gen_config = self.config or InferenceConfig()
            temperature = kwargs.get("temperature", gen_config.temperature)
            max_tokens = kwargs.get("max_tokens", gen_config.max_tokens)
            top_p = kwargs.get("top_p", gen_config.top_p)

            # Stream: create_completion returns generator
            stream = self.model.create_completion(
                prompt=prompt,
                max_tokens=max_tokens,
                temperature=temperature,
                top_p=top_p,
                stop=gen_config.stop_sequences,
                stream=True,  # ← Включаем streaming
            )

            full_text = ""
            for chunk in stream:
                text = chunk.get("choices", [{}])[0].get("text", "")
                if text:
                    full_text += text
                    yield {"token": text, "full_text": full_text}

            inference_time = (time.time() - start_time) * 1000
            yield {
                "done": True,
                "full_text": full_text,
                "tokens_generated": len(full_text.split()),
                "inference_time_ms": inference_time,
            }

        except Exception as e:
            yield {"error": str(e)}


# ─── Ollama Backend ──────────────────────────────────────────────────────────

class OllamaEngine(LLMEngine):
    """LLM Engine wrapper for Ollama API."""

    def __init__(self, url: str = "http://localhost:11434", model: str = "llama3",
                 config: Optional[InferenceConfig] = None):
        super().__init__(backend="ollama", config=config)
        self.ollama_url = url
        self.ollama_model = model
        self._initialized = False

    def init(self) -> bool:
        if not REQUESTS_AVAILABLE:
            raise ImportError("requests library is not installed")

        try:
            resp = requests.get(f"{self.ollama_url}/api/tags", timeout=5)
            if resp.status_code == 200:
                self._initialized = True
                self.model_name = self.ollama_model
                return True
            else:
                raise RuntimeError(f"Ollama API error: {resp.status_code}")
        except Exception as e:
            raise RuntimeError(f"Cannot connect to Ollama: {str(e)}")

    def generate(self, prompt: str, **kwargs) -> InferenceResult:
        if not self._initialized:
            raise RuntimeError("Ollama engine not initialized")

        import time
        start_time = time.time()

        try:
            gen_config = self.config or InferenceConfig()

            data = {
                "model": self.ollama_model,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "num_predict": kwargs.get("max_tokens", gen_config.max_tokens),
                    "temperature": kwargs.get("temperature", gen_config.temperature),
                    "top_p": kwargs.get("top_p", gen_config.top_p),
                },
            }

            resp = requests.post(
                f"{self.ollama_url}/api/generate",
                json=data,
                timeout=60,
            )

            if resp.status_code != 200:
                raise RuntimeError(f"Ollama generation failed: {resp.text}")

            result = resp.json()
            text = result.get("response", "")
            inference_time = (time.time() - start_time) * 1000

            return InferenceResult(
                text=text,
                tokens_generated=len(text.split()),
                inference_time_ms=inference_time,
                model_name=self.ollama_model,
                success=True,
            )

        except Exception as e:
            return InferenceResult(
                text="",
                tokens_generated=0,
                inference_time_ms=(time.time() - start_time) * 1000,
                model_name=self.ollama_model,
                success=False,
                error=str(e),
            )


# ─── Mock Backend ────────────────────────────────────────────────────────────

class MockEngine(LLMEngine):
    """Mock LLM Engine for testing (no real inference)."""

    MOCK_RESPONSE = (
        "This is a mock response from the LLM engine. "
        "In production, this would be generated by a real language model "
        "such as llama-cpp-python or Ollama."
    )

    def __init__(self):
        super().__init__(backend="mock")
        self._initialized = True
        self.model_name = "mock"

    def generate(self, prompt: str, **kwargs) -> InferenceResult:
        import time
        start_time = time.time()

        return InferenceResult(
            text=self.MOCK_RESPONSE,
            tokens_generated=len(self.MOCK_RESPONSE.split()),
            inference_time_ms=(time.time() - start_time) * 1000,
            model_name="mock",
            success=True,
        )


# ─── Factory function ────────────────────────────────────────────────────────

def create_llm_engine(
    engine_type: str = "mock",
    model_path: str = "",
    url: str = "http://localhost:11434",
    model_name: str = "llama3",
    config: Optional[InferenceConfig] = None,
    n_gpu_layers: int = -1,
    n_threads: int = 8,
) -> LLMEngine:
    """
    Factory function to create LLM Engine instances.
    
    Args:
        engine_type: "llama_cpp", "ollama", or "mock"
        model_path: Path to GGUF file (for llama_cpp)
        url: Ollama server URL (for ollama)
        model_name: Model name for Ollama (for ollama)
        config: Inference configuration
        n_gpu_layers: Number of layers to offload to GPU (for llama_cpp)
        n_threads: Number of CPU threads (for llama_cpp)
    
    Returns:
        LLMEngine instance
    """
    if engine_type == "llama_cpp":
        if not model_path:
            raise ValueError("model_path required for llama_cpp engine")
        return LlamaCppEngine(
            model_path=model_path,
            config=config or InferenceConfig(),
            n_gpu_layers=n_gpu_layers,
            n_threads=n_threads,
        )
    elif engine_type == "ollama":
        return OllamaEngine(
            url=url,
            model=model_name,
            config=config or InferenceConfig(),
        )
    else:  # mock
        return MockEngine()
