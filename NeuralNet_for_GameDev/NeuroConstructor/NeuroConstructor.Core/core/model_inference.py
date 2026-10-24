"""Model inference module for NeuralNet_for_GameDev.

Provides a simple ML‑like prediction engine that can use a student model
configuration (if available) or fall back to scenario‑based defaults.
"""

from typing import Dict, Any, Optional


class PredictionResult:
    """Result of a model prediction.

    Attributes
    ----------
    prediction : str
        The predicted outcome/label (e.g. "optimal", "degraded", "critical").
    confidence : float
        Confidence score in the range [0.0, 1.0].
    """

    def __init__(self, prediction: str, confidence: float):
        self.prediction = prediction
        self.confidence = confidence


class ModelInference:
    """Simple inference engine for game‑dev scenarios.

    The ``predict`` method can optionally consume a ``model_info`` dictionary
    that describes a student model (e.g. weights, feature names).  When no
    model info is supplied the method uses a tiny rule‑of‑thumb based on the
    supplied ``scenario`` and ``features``.
    """

    def predict(
        self,
        model_info: Optional[Dict[str, Any]],
        scenario: str,
        features: Dict[str, float],
    ) -> PredictionResult:
        """Generate a prediction for the given scenario and features.

        Parameters
        ----------
        model_info :
            Optional dictionary containing student model metadata.
            If provided, the prediction is derived from the features using
            simple linear weighting.
        scenario :
            Name of the game scenario (e.g. "performance", "load", "resource").
        features :
            Dictionary of float metrics such as cpu_usage, memory_usage, etc.

        Returns
        -------
        PredictionResult
            An instance with ``prediction`` and ``confidence``.
        """
        # ------------------------------------------------------------------
        # 1️⃣  Student‑model path ------------------------------------------------
        # ------------------------------------------------------------------
        if model_info is not None:
            # Very lightweight "ML": weight each feature by a coefficient stored
            # in model_info (if present) otherwise use fixed defaults.
            weights = model_info.get(
                "weights", {"cpu_usage": 0.4, "memory_usage": 0.3, "execution_time": 0.2, "load": 0.1}
            )
            # Normalise feature contributions; missing features default to 0.0
            score = 0.0
            for feat, w in weights.items():
                score += features.get(feat, 0.0) * w
            # Scale score to 0‑1 range (assuming features are already 0‑1)
            score = max(0.0, min(1.0, score))

            # Choose prediction label based on thresholds
            if score > 0.7:
                prediction = "optimal"
                confidence = round(score, 2)
            elif score > 0.4:
                prediction = "degraded"
                confidence = round(score, 2)
            else:
                prediction = "critical"
                confidence = round(1.0 - score, 2)

            return PredictionResult(prediction=prediction, confidence=confidence)

        # ------------------------------------------------------------------
        # 2️⃣  Default scenario‑based inference ---------------------------------
        # ------------------------------------------------------------------
        # Very naive rules that depend only on the scenario name.
        # These can be expanded later with real thresholds or a tiny model.
        if scenario == "performance":
            # Lower cpu/memory -> better performance
            cpu = features.get("cpu_usage", 0.5)
            mem = features.get("memory_usage", 0.5)
            avg = (cpu + mem) / 2.0
            if avg < 0.3:
                prediction = "optimal"
                confidence = round(1.0 - avg, 2)
            elif avg < 0.6:
                prediction = "degraded"
                confidence = round(1.0 - avg, 2)
            else:
                prediction = "critical"
                confidence = round(1.0 - avg, 2)

        elif scenario == "load":
            # High load values indicate high stress
            load = features.get("load", 0.5)
            if load < 0.3:
                prediction = "low"
                confidence = round(1.0 - load, 2)
            elif load < 0.7:
                prediction = "moderate"
                confidence = round(1.0 - load, 2)
            else:
                prediction = "high"
                confidence = round(load, 2)

        elif scenario == "resource":
            # Resource predicts if we have enough cpu/memory headroom
            cpu = features.get("cpu_usage", 0.5)
            mem = features.get("memory_usage", 0.5)
            headroom = 1.0 - max(cpu, mem)
            if headroom > 0.5:
                prediction = "adequate"
                confidence = round(headroom, 2)
            elif headroom > 0.2:
                prediction = "tight"
                confidence = round(headroom, 2)
            else:
                prediction = "exhausted"
                confidence = round(1.0 - headroom, 2)

        else:
            # Unknown scenario → default neutral prediction
            prediction = "unknown"
            confidence = 0.5

        return PredictionResult(prediction=prediction, confidence=confidence)