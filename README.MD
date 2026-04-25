# ElectEase AI

ElectEase AI is a context-aware civic guidance assistant designed to help users understand and navigate election processes in an interactive, step-by-step manner.

Unlike standard chatbots, ElectEase AI operates on a **Deterministic Decision Engine**. It ensures strict pathfinding, zero hallucinations, and robust security through structured logic.

## Architecture

The system is built on a "Logic-First, AI-Enhanced" architecture with pure Vanilla JavaScript (0 external dependencies).

### 1. Decision Engine (`src/logic/Engine.js`)
The civic logic core. It resolves external user contexts (`voter_type`, `age`, `location`) against a strict JSON flow graph (`src/data/flow.json`). It dynamically calculates progress and timeline events without trusting internal control overrides.

### 2. Security Layer (`src/logic/Validator.js`)
The trust guard. It implements a 3-layer security system:
- **Input Sanitization**: Strict whitelist allowing only `a-zA-Z0-9`, spaces, and hyphens.
- **Context Validation**: Enforces type matching (e.g., `age` must be an integer >= 18) and strict enumerations.
- **Output Integrity**: Ensures that the generated step strictly matches the predefined definitions in `flow.json` to prevent arbitrary text generation.
- **Rate Limiting**: Throttles excessive requests to prevent abuse.

### 3. Explainability Engine (`src/logic/ExplainabilityEngine.js`)
The prompt system. Translates raw deterministic states into user-friendly, structured guidance. It provides `explanation`, `action`, and `alert` mappings from predefined, verified templates.

## Running Tests

The system comes with a deterministic test suite to verify all logic and security bounds.

```bash
# Verify the Decision Engine and Security routing
node test/verify_engine.js

# Verify the Security Layer strictness (Sanitization, Validation)
node test/verify_validator.js

# Verify the Explainability Engine output mappings
node test/verify_explainability.js
```

## Constraints
- **Size**: Strictly < 1MB
- **Dependencies**: 0 external packages (Vanilla JS/Node.js core)
- **Security**: Prompt injection prevention & strict output constraints.

## Current State
- **Phase 1-3**: Core Engines & Security completed.
- **Next Phase**: UI Foundation (Glassmorphic Interface).
