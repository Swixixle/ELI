# Epistemic Load Index (ELI)

**ELI** is a specialized simplification engine designed to reduce "epistemic load"—the mental effort required to understand complex information. It acts as the bridge between high-level technical/clinical data and human-readable clarity.

## 🚀 Overview

In a world of dense medical jargon and complex codebases, ELI serves as the "Explain Like I'm..." layer for your ecosystem. Whether it's interpreting clinical notes from **CDIL** or mapping system dependencies in **LANTERN**, ELI breaks down barriers to understanding.

## 🛠 Key Features

* **Jargon Translation:** Converts specialized terminology (medical, legal, or technical) into plain language.
* **Documentation Synthesis:** Automatically generates readable summaries and READMEs for complex repositories.
* **Cognitive Load Assessment:** Analyzes text to determine its complexity level and suggests simplifications.
* **Contextual Bridging:** Connects the "what" of a technical system to the "why" for stakeholders.

## 🔐 Secrets and Configuration

To run ELI, ensure the following keys are configured in your environment:

| Key | Description |
| --- | --- |
| `SESSION_SECRET` | Secures user sessions and simplify-requests. |
| `OPENAI_API_KEY` | Powers the core natural language processing and simplification logic. |
| `LOG_LEVEL` | (Optional) Set to `info` or `debug` for system tracking. |

## 📂 Integration

ELI is designed to plug directly into:

* **[CDIL](https://www.google.com/search?q=https://github.com/Swixixle/CDIL):** To simplify clinical documentation for patients.
* **[LANTERN](https://www.google.com/search?q=https://github.com/Swixixle/Lantern):** To explain architectural maps of codebases.

---
