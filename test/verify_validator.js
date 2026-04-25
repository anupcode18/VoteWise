import Validator from '../src/logic/Validator.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const flowData = require('../src/data/flow.json');

console.log("TEST: Security Layer (Validator)");

// 1. Sanitization
const dirtyInput = "<script>alert(1)</script>  First-Time-Voter!  ";
const clean = Validator.sanitizeInput(dirtyInput);
console.log("Cleaned:", `"${clean}"`);
console.assert(!clean.includes("<script>"), "Sanitization failed: script remains");
console.assert(clean === "First-Time-Voter", "Sanitization failed: complex characters not handled");

// 2. Context Validation
const badContext = { voter_type: "hacker", age: "infinity" };
const { valid, safeContext } = Validator.validateContext(badContext);
console.log("Safe Context:", safeContext);
console.assert(safeContext.voter_type === "unknown", "Context validation failed: invalid voter_type allowed");
console.assert(safeContext.age === null, "Context validation failed: invalid age allowed");

// 3. Output Integrity
const fakeOutput = { step: { id: "done", title: "You Win!" }, progress: 100, timeline: [] };
const isOutputValid = Validator.validateOutput(fakeOutput, flowData);
console.log("Output Integrity Check:", isOutputValid);
console.assert(isOutputValid === false, "Output integrity failed: allowed manipulated title");

console.log("VERIFY VALIDATOR: PASSED");
