# ElectEase AI — Smart Civic Guidance Assistant

## Problem Statement
Navigating election processes can be overwhelming and confusing for many citizens. Key challenges include:
- Lack of clarity on registration steps and required documentation.
- Confusion regarding eligibility criteria and deadlines.
- Difficulty in finding local election offices for real-world actions.
- General misinformation and the complexity of official government portals.

## Solution
ElectEase AI is a deterministic, context-aware civic guidance assistant designed to solve these problems by providing:
- **Guided Journeys**: A step-by-step interactive flow that simplifies complex processes.
- **Explainable Guidance**: Clear explanations of *what* to do and *why* it matters.
- **Actionable Intelligence**: Real-world tools like readiness scores, smart recommendations, and official links.
- **Privacy & Security**: A rule-based system (no hallucinations) that runs entirely on local logic with strict input/output validation.

## Key Features
- **Context-Aware Decision Engine**: Tailors guidance based on your specific voter profile (First-time, Registered, or Candidate).
- **Explainable Guidance System**: Provides both detailed and "simple mode" explanations for accessibility.
- **Readiness Score**: A dynamic checklist that tracks your eligibility, documents, and submission status.
- **Smart Recommendations**: Context-aware tips to ensure a smooth journey.
- **Location-Based Assistance**: Integration with Google Maps to help you find nearby election offices.
- **Official Election Links**: Direct integration with verified Election Commission of India (ECI) and state portals.
- **Downloadable Election Plan**: Generate and download a personalized `.txt` summary of your plan.

## Tech Stack
- **Frontend**: HTML5, CSS3 (Vanilla), JavaScript (ES Modules)
- **Core Logic**: Rule-based Decision Engine (Pure JavaScript)
- **Data**: JSON-driven flow system
- **No External Dependencies**: Built without heavy libraries or frameworks for maximum performance.

## System Architecture
The system follows a strict, one-way pipeline to ensure security and determinism:
`User → Validator (Security) → Decision Engine (Logic) → Explainability (Formatting) → UI`

## Security
- **Input Sanitization**: Whitelist-based filtering to prevent XSS and SQL injection.
- **Schema Validation**: Ensures all inputs and outputs conform to strict internal types.
- **Rate Limiting**: Protects against automated spam and potential denial-of-service attempts.
- **Output Integrity**: Verifies that guidance content has not been tampered with before display.

## Testing
The project includes a structured test suite that verifies the system across 5 categories: Validation, Flow, Security, Edge Cases, and Explainability.

To run the tests, use:
```bash
node test/verify_all.js
```

## Accessibility
- **ARIA Compliance**: Full support for screen readers with semantic landmarks and live regions.
- **Keyboard Navigation**: Fully operable via keyboard (e.g., radio group navigation with arrow keys).
- **Responsive Design**: Glassmorphic UI that adapts to mobile, tablet, and desktop screens.

## Google Services Usage
- **Google Maps**: Lightweight integration used to guide users to nearby election offices via search queries.
- **Google Fonts**: Uses the "Inter" font family for modern, readable typography.

## Performance
- **Lightweight**: Entire system is under 1MB.
- **O(1) Computations**: Progress and path calculation are pre-cached for instant UI updates.
- **Minimal DOM Reflows**: Efficient rendering pipeline.

## How to Run
Since the project uses ES Modules, it must be served via a local server:
```bash
# Using Node.js
npx serve

# OR using Python
python -m http.server
```

## Future Scope
- **Backend Persistence**: Securely saving user progress across sessions.
- **Multi-language Support**: Expanding guidance to regional languages.
- **Live Data APIs**: Integrating real-time election results and polling station waiting times.
