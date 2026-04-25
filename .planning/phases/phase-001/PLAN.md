# PLAN: Phase 1 - Decision Engine Core

## OBJECTIVE
Build the core deterministic logic engine (`Engine.js`) and define the election guidance flow (`flow.json`).

## TASKS
1. **Define Flow Schema (`flow.json`)**:
   - Create a JSON structure with steps, conditions, and metadata.
   - Include sample steps for "First-time voter" and "Existing voter".

2. **Implement Logic Engine (`Engine.js`)**:
   - `resolveState(context)`: Main function to determine current step and next step.
   - `calculateProgress(stepId)`: Helper for progress tracking.
   - `generateTimeline(context)`: Helper for deadline/date calculation.

3. **Verification**:
   - Run a test script to verify that different context inputs produce correct, deterministic outputs.

## OUTPUTS
- `src/logic/Engine.js`
- `src/data/flow.json`

## CONSTRAINTS
- No external dependencies.
- Deterministic logic only.
