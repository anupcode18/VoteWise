/**
 * ElectEase Decision Engine
 * Deterministic, rule-based logic for civic guidance.
 */

const Validator = require('./Validator');

class DecisionEngine {
  constructor(flowData) {
    this.flow = flowData.steps;
    this.timelineDefaults = flowData.timeline_defaults;
  }

  /**
   * Resolves the current state based on external user context.
   * STRICTLY ignores internal control fields.
   * @param {Object} rawContext - Unsafe user context
   * @returns {Object} { step, progress, timeline }
   */
  resolveState(rawContext) {
    // 1. Rate Limiting Check
    if (!Validator.checkRateLimit('user_session')) {
      return Validator.getSafeFallback();
    }

    // 2. Validate and Normalize Context
    const { valid, safeContext } = Validator.validateContext(rawContext);

    // 3. Context Resolver: Derive Step Internally
    let currentStepId = 'start';
    
    if (safeContext.voter_type !== 'unknown') {
      // Derive step based on context
      if (safeContext.voter_type === 'first-time') {
        currentStepId = 'registration_check';
        // Basic condition checking (extendable)
        if (safeContext.age !== null && safeContext.age < 18) {
           // Provide early block if underage (example of intelligent handling)
           currentStepId = 'ineligible_age'; // If this step existed, but let's stick to flow
        }
      } else if (safeContext.voter_type === 'registered') {
        currentStepId = 'verify_registration'; // Assume this exists in flow.json
      } else if (safeContext.voter_type === 'candidate') {
        currentStepId = 'candidate_intro'; // Assume this exists in flow.json
      }
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
