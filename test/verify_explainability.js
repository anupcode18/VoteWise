const DecisionEngine = require('../src/logic/Engine');
const ExplainabilityEngine = require('../src/logic/ExplainabilityEngine');
const flowData = require('../src/data/flow.json');

const engine = new DecisionEngine(flowData);

console.log("--- TEST: Explainability Engine ---");

// Test 1: Start State
const state1 = engine.resolveState({});
const guidance1 = ExplainabilityEngine.generateGuidance(state1);
console.log("\n[Start State]");
console.log("Explanation:", guidance1.explanation);
console.log("Action:", guidance1.action);
console.log("Alert:", guidance1.alert);
console.assert(guidance1.is_verified === true, "Output not verified");

// Test 2: Document Collection State
// (Need to manually feed this step for testing since Engine auto-derives based on context)
const state2 = { step: flowData.steps['document_collection'], progress: 50, timeline: [] };
const guidance2 = ExplainabilityEngine.generateGuidance(state2);
console.log("\n[Document Collection State]");
console.log("Explanation:", guidance2.explanation);
console.log("Action:", guidance2.action);
console.log("Alert:", guidance2.alert);
console.assert(guidance2.explanation.includes('Why this matters'), "Why component missing");

// Test 3: Invalid State Fallback
const guidance3 = ExplainabilityEngine.generateGuidance(null);
console.log("\n[Invalid State Fallback]");
console.log("Explanation:", guidance3.explanation);
console.log("Action:", guidance3.action);
console.log("Alert:", guidance3.alert);
console.assert(guidance3.step.id === 'error', "Fallback step ID incorrect");

console.log("\nVERIFICATION COMPLETE: Explainability engine provides structured, deterministic outputs.");
