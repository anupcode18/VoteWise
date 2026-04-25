const DecisionEngine = require('../src/logic/Engine');
const Validator = require('../src/logic/Validator');
const ExplainabilityEngine = require('../src/logic/ExplainabilityEngine');
const flowData = require('../src/data/flow.json');

const engine = new DecisionEngine(flowData);

function test(context, description, sessionId = 'test_session') {
  console.log(`\nTEST: ${description}`);
  const state = engine.resolveState(context, sessionId);
  const guidance = ExplainabilityEngine.generateGuidance(state);
  
  console.log(`Step ID: ${state.step.id}`);
  console.log(`Is Verified: ${guidance.trust.is_verified}`);
  
  // Basic sanity assertions
  if (description.includes("Injection") || description.includes("Extremely long") || description.includes("Empty")) {
      console.assert(state.step.id === 'start' || state.step.id === 'error', "Fallback routing failed!");
  }
  return guidance;
}

// 1. Empty input
test({}, "Empty input");

// 2. Extremely long input
test({ voter_type: 'a'.repeat(5000), age: 100 }, "Extremely long input");

// 3. Mixed valid + invalid fields
test({ voter_type: 'candidate', injected_step: 'done' }, "Mixed valid + internal fields");

// 4. Boundary values (Age)
test({ voter_type: 'first-time', age: 18, location: 'NY' }, "Boundary: Age 18");
test({ voter_type: 'first-time', age: 130, location: 'CA' }, "Boundary: Age 130");

// 5. Injection-like payloads
test({ voter_type: '<script>alert(1)</script>', location: 'DROP TABLE users;' }, "Injection-like payloads");

// 6. Rapid repeated calls (Rate limit test)
console.log("\nTEST: Rapid repeated calls (Rate Limit)");
let rateLimited = false;
for (let i = 0; i < 15; i++) {
  const state = engine.resolveState({ voter_type: 'registered' }, 'spammer_session');
  if (state.step.id === 'start' && state.step.title === 'Safe Mode') {
    rateLimited = true;
  }
}
console.assert(rateLimited === true, "Rate limiting failed!");
console.log("Rate limiting successfully triggered for 'spammer_session'.");

console.log("\nALL VERIFICATION TESTS COMPLETE.");
