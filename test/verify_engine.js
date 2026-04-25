import DecisionEngine from '../src/logic/Engine.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const flowData = require('../src/data/flow.json');

const engine = new DecisionEngine(flowData);

console.log("TEST: Decision Engine Resolution");

// Test Case 1: First-time voter
const context1 = { voter_type: 'first-time', age: 18 };
const state1 = engine.resolveState(context1);
console.log("State 1 (first-time):", state1.step.id);
console.assert(state1.step.id === 'registration_check', "State 1 failed");

// Test Case 2: Registered voter
const context2 = { voter_type: 'registered' };
const state2 = engine.resolveState(context2);
console.log("State 2 (registered):", state2.step.id);
console.assert(state2.step.id === 'verify_registration', "State 2 failed");

// Test Case 3: Malicious injection
const context3 = { voter_type: 'registered', currentStepId: 'done' };
const state3 = engine.resolveState(context3);
console.log("State 3 (injection check):", state3.step.id);
console.assert(state3.step.id === 'verify_registration', "State 3 failed - should ignore internal control fields");

console.log("VERIFY ENGINE: PASSED");
