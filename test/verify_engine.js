const DecisionEngine = require('../src/logic/Engine');
const Validator = require('../src/logic/Validator');
const flowData = require('../src/data/flow.json');

const engine = new DecisionEngine(flowData);

function test(context, description) {
  console.log(`\nTEST: ${description}`);
  const state = engine.resolveState(context);
  console.log(`Current Step: ${state.step.id} (${state.step.title})`);
  return state;
}

// 1. Empty input {}
test({}, "Empty input");

// 2. Valid user context
test({ voter_type: 'first-time', age: 25, location: 'NY' }, "Valid context (First-time)");

// 3. Extremely long input
test({ voter_type: 'a'.repeat(5000), age: 100 }, "Extremely long input");

// 4. Invalid data types
test({ voter_type: 12345, age: "twenty" }, "Invalid data types");

// 5. Mixed valid + invalid fields
test({ voter_type: 'candidate', admin_override: true, injected_step: 'done' }, "Mixed valid + internal fields");

// 6. Injection-like inputs
test({ voter_type: '<script>alert(1)</script>', location: 'DROP TABLE users;' }, "Injection-like inputs");

console.log("\nVERIFICATION COMPLETE: Edge cases tested.");
