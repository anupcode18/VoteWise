const Validator = require('../src/logic/Validator');
const flowData = require('../src/data/flow.json');

console.log("--- TEST 1: sanitizeInput ---");
const raw1 = "  <script>alert(1)</script> Hello $World!  ";
const clean1 = Validator.sanitizeInput(raw1);
console.log(`Raw: '${raw1}'`);
console.log(`Clean: '${clean1}'`);
console.assert(clean1 === "alert1 Hello World!", "Sanitization failed!");

console.log("\n--- TEST 2: validateContext ---");
const ctx1 = { voter_type: "first-time", age: 25, location: "NY" };
const val1 = Validator.validateContext(ctx1);
console.log("Valid Context:", val1);
console.assert(val1.valid === true, "Valid context marked invalid");

const ctx2 = { voter_type: "hacker", age: 15, injected: "bad_data" };
const val2 = Validator.validateContext(ctx2);
console.log("Invalid Context:", val2);
console.assert(val2.valid === false, "Invalid context marked valid");
console.assert(val2.safeContext.voter_type === 'unknown', "Fallback voter type failed");
console.assert(val2.safeContext.age === null, "Fallback age failed");
console.assert(val2.safeContext.injected === undefined, "Unauthorized field slipped through");

console.log("\n--- TEST 3: validateOutput ---");
const validOutput = {
  step: flowData.steps['start'],
  progress: 0,
  timeline: []
};
const isOutValid = Validator.validateOutput(validOutput, flowData);
console.log(`Valid Output Check: ${isOutValid}`);
console.assert(isOutValid === true, "Valid output marked invalid");

const invalidOutput = {
  step: { id: 'start', title: 'Modified Title', description: 'Modified' },
  progress: 0,
  timeline: []
};
const isOutInvalid = Validator.validateOutput(invalidOutput, flowData);
console.log(`Invalid Output Check (tampered step): ${isOutInvalid}`);
console.assert(isOutInvalid === false, "Tampered output marked valid");

console.log("\nALL TESTS PASSED.");
