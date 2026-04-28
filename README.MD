# ElectEase AI — Deterministic Civic Guidance Assistant

## 1) Project Overview
ElectEase AI addresses a high-impact public problem: election participation drops when people cannot clearly understand eligibility, required documents, deadlines, and local process steps.

### Problem Statement
- Citizens face fragmented election information across portals and regions.
- First-time voters often miss critical requirements due to unclear guidance.
- Users need practical, trustworthy next steps, not open-ended chatbot responses.

### Why This Matters
Election workflows are high-stakes, deadline-driven, and compliance-sensitive. In this context, incorrect guidance is harmful. A deterministic system improves trust, repeatability, and safety.

### Target Users
- First-time voters
- Already-registered voters who need process clarity
- Election candidates navigating procedural requirements

## 2) Solution Approach
ElectEase AI is intentionally **not a chatbot**. It is a deterministic civic guidance system with optional AI enhancement.

- **Deterministic Core**: Rule-based state transitions from a curated `flow.json`.
- **Explainability-First**: Every output includes what to do, why it matters, and what to do next.
- **Optional AI Layer**: Gemini expands existing deterministic guidance; it does not change decision logic.

## 3) System Architecture

### Core Guidance Pipeline
`User Input → Validator (Sanitization) → Decision Engine (Logic) → Explainability Engine (Output Formatting) → UI`

### AI Enhancement Pipeline
`Frontend UI → Minimal Cloud Run Backend Proxy → Gemini API`

This split preserves deterministic behavior while adding secure, optional AI explainability.

## 4) Key Features (Detailed)
- **Context-Aware Guidance**: Path resolution based on voter profile and current journey step.
- **Readiness Score**: Checklist-backed score for eligibility, documentation, and submission readiness.
- **Smart Recommendations**: Action-focused nudges derived from deterministic state.
- **Location-Based Assistance**: Nearby election-office lookup with geolocation + manual fallback.
- **Official Links Integration**: Direct links to trusted election resources.
- **Downloadable Election Plan**: One-click `.txt` export of current guidance and readiness status.
- **Explain More with AI**: Optional Gemini-powered expansion of the current instruction in plain language.

## 5) Google Services Integration (Critical)
Google services are used with clear system boundaries and measurable value:

### Google Cloud Run
- Hosts the minimal backend proxy used by `/explain`.
- Stores `GEMINI_API_KEY` in server environment variables (not client code).
- Provides managed, autoscaling deployment with a public URL for evaluation.

### Gemini API
- Used only for **explanation enhancement** when users click **Explain More with AI**.
- Does not route user state, scoring logic, or step progression.
- Keeps the deterministic pipeline intact while improving readability and user confidence.

### Google Maps
- Supports real-world actionability by helping users find nearby election offices.
- Converts guidance into immediate offline action (where to go, what to do).

## 6) Security
- **Input Sanitization**: Validator layer filters unsafe input patterns.
- **Schema Validation**: State and output structures remain type-safe and predictable.
- **Output Integrity**: Guidance is generated from deterministic templates and controlled state.
- **API Key Protection**: Gemini key is loaded from backend environment variables.
- **No Direct API Exposure**: Frontend never calls Gemini with a key.

## 7) Efficiency
- **Lightweight Frontend**: Designed to stay under the `<1MB` project constraint.
- **No Heavy Frontend Frameworks**: Vanilla HTML/CSS/JS.
- **Minimal Backend**: Native Node `http` server and built-in `fetch` only (no Express).
- **Optimized Rendering**: Single rerender path and compact DOM updates.

## 8) Testing
The project includes a structured verification suite across:
- Validation
- Flow correctness
- Security behavior
- Edge cases

Current reported status: **61 / 61 tests passed**.

Run tests:
```bash
node test/verify_all.js
```

## 9) Accessibility
- ARIA labels and semantic status messaging
- Keyboard-friendly input and option navigation
- Semantic alert boxes for warnings and critical steps
- **Simple Mode** for lower reading complexity and faster comprehension

## 10) Design Decisions
### Why no backend initially
Early architecture prioritized a deterministic, offline-friendly, low-complexity frontend core.

### Why deterministic instead of chatbot-first
Election guidance demands correctness, consistency, and auditability; deterministic rules provide this.

### Why Gemini is optional
AI improves explanation quality, but must never alter legal/process routing. Optional usage prevents dependency risk.

### Why minimal backend (no Express)
Project constraints require lightweight deployment and low overhead. A built-in Node server is sufficient for secure API proxying.

## 11) How to Run

### Local Setup
1. Create `.env` in project root:
```env
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-2.5-flash
```
2. Start server:
```bash
node backend/server.js
```
3. Open:
`http://localhost:8080`

### Cloud Run Deployment
```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/electease
gcloud run deploy electease \
  --image gcr.io/YOUR_PROJECT_ID/electease \
  --platform managed \
  --region asia-south1 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=YOUR_KEY,GEMINI_MODEL=gemini-2.5-flash
```

## 12) Future Scope
- Regional and multilingual guidance packs
- Real-time election API integrations (deadlines, polling updates)
- Broader AI assist features (summaries, document prep guidance) while keeping deterministic routing intact
