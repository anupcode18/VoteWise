/**
 * ElectEase AI — Structured Test Suite
 * Categories: Validation | Flow | Security | Edge Cases | Explainability
 * Output: TOTAL / PASSED / FAILED summary
 */

import DecisionEngine from '../src/logic/Engine.js';
import ExplainabilityEngine from '../src/logic/ExplainabilityEngine.js';
import Validator from '../src/logic/Validator.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const flowData = require('../src/data/flow.json');

const engine = new DecisionEngine(flowData);
const explainer = new ExplainabilityEngine(flowData.templates);

let total = 0;
let passed = 0;
let failed = 0;

function assert(condition, label, category) {
    total++;
    if (condition) {
        passed++;
        console.log(`  ✓ [${category}] ${label}`);
    } else {
        failed++;
        console.error(`  ✗ [${category}] ${label}`);
    }
}

// ─── CATEGORY 1: VALIDATION ───
console.log('\n═══ VALIDATION TESTS ═══');

(() => {
    const cat = 'VALIDATION';

    // Empty input
    const r1 = Validator.validateContext({});
    assert(r1.safeContext.voter_type === 'unknown', 'Empty context → unknown voter_type', cat);
    assert(r1.safeContext.age === null, 'Empty context → null age', cat);

    // Valid input
    const r2 = Validator.validateContext({ voter_type: 'first-time', age: 25, location: 'Delhi' });
    assert(r2.valid === true, 'Valid context passes validation', cat);
    assert(r2.safeContext.voter_type === 'first-time', 'voter_type preserved', cat);
    assert(r2.safeContext.age === 25, 'Age preserved', cat);
    assert(r2.safeContext.location === 'Delhi', 'Location preserved', cat);

    // Boundary ages
    const r3 = Validator.validateContext({ voter_type: 'registered', age: 18 });
    assert(r3.safeContext.age === 18, 'Age 18 accepted (boundary)', cat);

    const r4 = Validator.validateContext({ voter_type: 'registered', age: 130 });
    assert(r4.safeContext.age === 130, 'Age 130 accepted (boundary)', cat);

    const r5 = Validator.validateContext({ voter_type: 'registered', age: 17 });
    assert(r5.safeContext.age === null, 'Age 17 rejected', cat);

    const r6 = Validator.validateContext({ voter_type: 'registered', age: 131 });
    assert(r6.safeContext.age === null, 'Age 131 rejected', cat);

    // Sanitization
    assert(Validator.sanitizeInput('<script>alert(1)</script>') === 'scriptalert1script', 'Script tags stripped', cat);
    assert(Validator.sanitizeInput('a'.repeat(100), 50).length === 50, 'Max length enforced', cat);
    assert(Validator.sanitizeInput(123) === '', 'Non-string returns empty', cat);
})();

// ─── CATEGORY 2: FLOW ───
console.log('\n═══ FLOW TESTS ═══');

(() => {
    const cat = 'FLOW';

    // First-time voter path
    const s1 = engine.resolveState({ voter_type: 'first-time', age: 18 }, 'flow_test_1');
    assert(s1.step.id === 'registration_check', 'First-time → registration_check', cat);

    const s2 = engine.resolveState({ voter_type: 'first-time', _targetStepId: 'eligibility_info' }, 'flow_test_2');
    assert(s2.step.id === 'eligibility_info', 'Target step → eligibility_info', cat);

    const s3 = engine.resolveState({ voter_type: 'first-time', _targetStepId: 'done' }, 'flow_test_3');
    assert(s3.step.id === 'done', 'Target step → done', cat);
    assert(s3.progress === 100, 'Done step → 100% progress', cat);

    // Registered voter path
    const s4 = engine.resolveState({ voter_type: 'registered' }, 'flow_test_4');
    assert(s4.step.id === 'verify_registration', 'Registered → verify_registration', cat);

    // Candidate path
    const s5 = engine.resolveState({ voter_type: 'candidate' }, 'flow_test_5');
    assert(s5.step.id === 'candidate_intro', 'Candidate → candidate_intro', cat);

    // Start fallback
    const s6 = engine.resolveState({ voter_type: 'unknown' }, 'flow_test_6');
    assert(s6.step.id === 'start', 'Unknown → start', cat);

    // Progress monotonicity
    assert(s1.progress > 0, 'registration_check progress > 0', cat);

    // All flow steps exist in templates
    for (const stepId of Object.keys(flowData.steps)) {
        assert(flowData.templates[stepId] !== undefined, `Template exists for step "${stepId}"`, cat);
    }
})();

// ─── CATEGORY 3: SECURITY ───
console.log('\n═══ SECURITY TESTS ═══');

(() => {
    const cat = 'SECURITY';

    // Injection payloads
    const s1 = engine.resolveState({ voter_type: '<script>alert(1)</script>' }, 'sec_test_1');
    assert(s1.step.id === 'start', 'Script injection → fallback to start', cat);

    const s2 = engine.resolveState({ voter_type: 'DROP TABLE users;' }, 'sec_test_2');
    assert(s2.step.id === 'start', 'SQL injection → fallback to start', cat);

    // Unknown fields ignored
    const s3 = engine.resolveState({ voter_type: 'candidate', __proto__: { admin: true } }, 'sec_test_3');
    assert(s3.step.id === 'candidate_intro', 'Proto pollution ignored', cat);

    // Very long input
    const s4 = engine.resolveState({ voter_type: 'a'.repeat(5000) }, 'sec_test_4');
    assert(s4.step.id === 'start', 'Extremely long input → start', cat);

    // Rate limiting
    let rateLimited = false;
    for (let i = 0; i < 15; i++) {
        const state = engine.resolveState({ voter_type: 'registered' }, 'spammer_session');
        if (state.step.title === 'Safe Mode') {
            rateLimited = true;
        }
    }
    assert(rateLimited === true, 'Rate limiting triggers after 10 requests', cat);

    // Output integrity
    const fakeOutput = { step: { id: 'start', title: 'HACKED', description: '', type: 'system' }, progress: 0, timeline: [] };
    assert(Validator.validateOutput(fakeOutput, { steps: flowData.steps, timeline_defaults: flowData.timeline_defaults }) === false, 'Tampered output rejected', cat);
})();

// ─── CATEGORY 4: EDGE CASES ───
console.log('\n═══ EDGE CASE TESTS ═══');

(() => {
    const cat = 'EDGE';

    // Null/undefined context
    const s1 = engine.resolveState(null, 'edge_1');
    assert(s1.step.id === 'start' || s1.step.title === 'Safe Mode', 'Null context handled', cat);

    const s2 = engine.resolveState(undefined, 'edge_2');
    assert(s2.step.id === 'start' || s2.step.title === 'Safe Mode', 'Undefined context handled', cat);

    // Invalid target step
    const s3 = engine.resolveState({ voter_type: 'first-time', _targetStepId: 'nonexistent_step' }, 'edge_3');
    assert(s3.step.id === 'registration_check', 'Invalid target → routing fallback', cat);

    // Mixed valid + internal fields
    const s4 = engine.resolveState({ voter_type: 'candidate', injected_step: 'done' }, 'edge_4');
    assert(s4.step.id === 'candidate_intro', 'Internal field injection ignored', cat);

    // Age under 18 is rejected by Validator (18-130 range), so engine uses routing fallback
    const s5 = engine.resolveState({ voter_type: 'first-time', age: 16 }, 'edge_5');
    assert(s5.step.id === 'registration_check', 'Age < 18 rejected by validator → routing fallback', cat);
})();

// ─── CATEGORY 5: EXPLAINABILITY ───
console.log('\n═══ EXPLAINABILITY TESTS ═══');

(() => {
    const cat = 'EXPLAIN';

    // Normal mode
    const state = engine.resolveState({ voter_type: 'first-time', _targetStepId: 'eligibility_info' }, 'explain_1');
    const g1 = explainer.generateGuidance(state, false);
    assert(g1.trust.isVerified === true, 'Trust.isVerified is true', cat);
    assert(g1.trust.source === 'Predefined Election Rules', 'Trust.source correct', cat);
    assert(typeof g1.readiness.score === 'number', 'Readiness score is number', cat);
    assert(g1.readiness.score >= 0 && g1.readiness.score <= 100, 'Readiness 0-100', cat);
    assert(typeof g1.recommendation === 'string' && g1.recommendation.length > 0, 'Recommendation is non-empty', cat);
    assert(typeof g1.locationRelevant === 'boolean', 'locationRelevant is boolean', cat);

    // Simple mode
    const g2 = explainer.generateGuidance(state, true);
    assert(g2.explanation !== g1.explanation, 'Simple mode gives different explanation', cat);
    assert(g2.explanation.length < g1.explanation.length, 'Simple mode is shorter', cat);

    // Fallback
    const g3 = explainer.generateGuidance(null, false);
    assert(g3.step.id === 'error', 'Null state → error fallback', cat);

    const g4 = explainer.generateGuidance({ step: { id: 'fake_step' } }, false);
    assert(g4.step.id === 'error', 'Unknown step → error fallback', cat);

    // All fields present
    const requiredKeys = ['step', 'progress', 'explanation', 'why', 'action', 'alert', 'nextStepHint', 'recommendation', 'readiness', 'trust', 'officialLinks'];
    for (const key of requiredKeys) {
        assert(g1[key] !== undefined, `Output has "${key}" field`, cat);
    }
})();

// ─── SUMMARY ───
console.log('\n══════════════════════════════════');
console.log(`  TOTAL:  ${total}`);
console.log(`  PASSED: ${passed}`);
console.log(`  FAILED: ${failed}`);
console.log('══════════════════════════════════');

if (failed > 0) {
    console.log('\n⚠️  SOME TESTS FAILED\n');
    process.exit(1);
} else {
    console.log('\n✅ ALL TESTS PASSED\n');
}
