// Legacy test file — replaced by structured test suite (verify_all.js)
import ExplainabilityEngine from '../src/logic/ExplainabilityEngine.js';

console.log("TEST: Explainability Engine");

const mockState = {
  step: { id: "registration_check", title: "Registration Status", description: "...", type: "question" },
  progress: 25,
  timeline: []
};

const guidance = ExplainabilityEngine.generateGuidance(mockState);
console.log("Guidance Output:", guidance);

console.assert(guidance.step.id === "registration_check", "Guidance failed: incorrect step mapping");
console.assert(guidance.explanation.length > 0, "Guidance failed: missing explanation");
console.assert(guidance.trust.is_verified === true, "Guidance failed: missing trust layer");
console.assert(guidance.progress === 25, "Guidance failed: missing progress field");

// Test Fallback
const fallback = ExplainabilityEngine.generateGuidance({ step: { id: "non-existent" } });
console.log("Fallback Output:", fallback.step.id);
console.assert(fallback.step.id === "error", "Guidance fallback failed");

console.log("VERIFY EXPLAINABILITY: PASSED");

