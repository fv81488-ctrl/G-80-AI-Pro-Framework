# G-80-AI-Pro-Framework
Official implementation of the G-80 AI Pro: A secure, energy-aware hybrid ESP32-Raspberry Pi architecture for On-Demand Edge AI (2026)
# G-80 AI Pro: A Secure Energy-Aware Hybrid Embedded System

Official implementation of the **G-80 AI Pro (2026)** framework, as described in the research paper: *"A Secure Energy-Aware Hybrid ESP32-Raspberry Pi Architecture for On-Demand Edge AI"*.

## Abstract
This project addresses the power-latency trade-off in portable Edge AI. By utilizing a heterogeneous dual-processor architecture (ESP32 as Master, Raspberry Pi 5 as Slave), the G-80 system achieves up to **6.7x power reduction** in idle states while maintaining high-performance inference capabilities on-demand.

## Key Features
- **Heterogeneous Design:** ESP32 for low-power control and UI; Raspberry Pi 5 for AI inference.
- **Secure Communication:** HMAC-SHA256 signed UART bridge for command integrity.
- **AI Stack:** Quantized INT8 ONNX models for vision and voice.
- **Energy Management:** 4-tier power state logic (Deep Sleep to AI-Active).

## Architecture


The system delegates low-latency peripheral management to the "always-on" ESP32, while waking the Raspberry Pi 5 only when intensive processing is required.

## Performance Metrics
- **Idle Power:** 418mW (ESP32 active, RPi Off).
- **Peak AI Power:** ~8.5W.
- **Battery Life:** ~12.4 hours (5000mAh battery).
- **Inference Latency:** ~1.15s for voice commands.

## Citation
If you use this code or reference the G-80 AI Pro in your research, please cite:
```text
Ebrahim, G. A. A. (2026). A Secure Energy-Aware Hybrid ESP32-Raspberry Pi Architecture for On-Demand Edge AI. University of Sciences and Technology, Sudan.
