| Test Case | Primary Metric Tested | Expected Behavior | Failure Mode Caught |
| :--- | :--- | :--- | :--- |
| **1. Golden Path** | Dwell & Gaze Accuracy | `1` ID, `~4s` attention | Dead head-pose or broken ROI trigger |
| **2. Hard Negative** | Gaze Specificity | `1` ID, `0s` attention | Counting proximity/dwell as actual views |
| **3. Crossover** | Tracker ID Persistence | `2` IDs, no ID swap | Track fragmentation behind the static cart |
| **4. Out-of-Zone** | Spatial Cone Calibration | `0` foreground OTS | Over-counting deep background aisle traffic |
| **5. Peak-Hour Stress** | Throughput & Multi-Occlusion | `8–10` IDs, `2` viewers | Crowd ID-cascade, NMS suppression, or latency drop |