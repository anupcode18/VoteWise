/**
 * ElectEase Decision Engine
 * Deterministic, rule-based logic for civic guidance.
 */

const Validator = require('./Validator');

class DecisionEngine {
  constructor(flowData) {
    this.flow = flowData.steps;
    this.routing = flowData.routing;
    this.timelineDefaults = flowData.timeline_defaults;
  }

  /**
   * Resolves the current state based on external user context.
   * @param {Object} rawContext - Unsafe user context
   * @param {string} sessionId - Identifier for rate limiting
   * @returns {Object} { step, progress, timeline }
   */
  resolveState(rawContext, sessionId = 'default_session') {
    // 1. Dynamic Rate Limiting Check
    if (!Validator.checkRateLimit(sessionId, 10, 60000)) {
      return Validator.getSafeFallback();
    }

    // 2. Validate and Normalize Context
    const { valid, safeContext } = Validator.validateContext(rawContext);

    // 3. Context Resolver & Completeness Checking
    let currentStepId = 'start';
    
    // Voter type is REQUIRED for progression
    if (safeContext.voter_type !== 'unknown') {
      // Dynamic routing from flow.json
      if (this.routing[safeContext.voter_type]) {
        currentStepId = this.routing[safeContext.voter_type];
        
        // Example of conditional checking (e.g., age validation)
        if (safeContext.age !== null && safeContext.age < 18) {
           // We can route to an ineligible step if it existed, but we enforce defaults
           currentStepId = 'eligibility_info'; 
        }
      }
    } else {
      // If missing or invalid -> fallback to start
      currentStepId = 'start';
    }

    const currentStep = this.flow[currentStepId] || this.flow['start'];

    // 4. Generate progress & timeline
    const progress = this.calculateProgress(currentStepId);
    const timeline = this.generateTimeline(safeContext);

    const output = {
      step: currentStep,
      progress,
      timeline
    };

    // 5. Final Output Integrity Check
    if (!Validator.validateOutput(output, { steps: this.flow, timeline_defaults: this.timelineDefaults })) {
        return Validator.getSafeFallback();
    }

    return output;
  }

  calculateProgress(stepId) {
    const stepKeys = Object.keys(this.flow);
    const currentIndex = stepKeys.indexOf(stepId);
    if (currentIndex === -1) return 0;
    if (this.flow[stepId].type === 'final') return 100;
    return Math.round(((currentIndex) / (stepKeys.length - 1)) * 100);
  }

  generateTimeline(safeContext) {
    let timeline = [...this.timelineDefaults];
    if (safeContext.voter_type === 'candidate') {
      timeline.push({ event: "Nomination Deadline", date: "2026-05-01" });
    }
    return timeline.sort((a, b) => new Date(a.date) - new Date(b.date));
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DecisionEngine;
} else {
  window.DecisionEngine = DecisionEngine;
}
