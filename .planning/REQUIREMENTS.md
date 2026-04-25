# REQUIREMENTS

## CORE FUNCTIONAL REQUIREMENTS
1. **Context-Aware Interaction**: Detect user type (First-time, Existing, Candidate, Seeker).
2. **Guided Step Flow**: Sequential guidance steps.
3. **Timeline Generation**: Dynamic timeline based on context.
4. **Decision Engine**: Deterministic logic processing.
5. **Smart Alerts**: Deadline and document triggers.
6. **Explainable Guidance**: "Why" context for each step.

## NON-FUNCTIONAL REQUIREMENTS
- **Security**: Sanitized inputs and validated outputs.
- **Performance**: Lightweight (<1MB), fast execution.
- **Reliability**: Deterministic responses (no hallucination).
- **Usability**: Premium, glassmorphic UI.

## SECURITY SPECIFICATIONS
- Input fields must be sanitized via regex.
- All engine logic paths must be pre-defined in JSON.
- No direct user input passed to AI without validation.
