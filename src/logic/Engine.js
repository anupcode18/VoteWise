/**
 * ElectEase Decision Engine
 * Deterministic, rule-based logic for civic guidance.
 */

import Validator from './Validator.js';

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
  /**
   * Resolve the next step given a targetStepId OR fall back to routing.
   * targetStepId is pre-resolved by the UI from option.next / step.next.
   * The engine validates it exists in the flow graph before accepting.
   */
  resolveState(rawContext, sessionId = 'default_session') {
    // 1. Dynamic Rate Limiting Check
    if (!Validator.checkRateLimit(sessionId, 10, 60000)) {
      return Validator.getSafeFallback();
    }

    // 2. Validate and Normalize Context
    const { valid, safeContext } = Validator.validateContext(rawContext);

    // 3. Determine current step
    let currentStepId = 'start';

    // 3a. If the UI has resolved a specific target step, validate and use it
    if (rawContext._targetStepId && this.flow[rawContext._targetStepId]) {
      currentStepId = rawContext._targetStepId;
    }
    // 3b. Otherwise, use voter_type routing for initial entry
    else if (safeContext.voter_type && safeContext.voter_type !== 'unknown') {
      currentStepId = this.routing[safeContext.voter_type] || 'start';
    }

    // 4. Age-based overrides (High priority)
    if (safeContext.age !== null && safeContext.age < 18) {
       currentStepId = 'eligibility_info';
    }

    const currentStep = this.flow[currentStepId] || this.flow['start'];

    // 5. Generate progress & timeline
    const progress = this.calculateProgress(currentStepId);
    const timeline = this.generateTimeline(safeContext);

    const output = {
      step: currentStep,
      progress,
      timeline
    };

    // 6. Final Output Integrity Check
    if (!Validator.validateOutput(output, { steps: this.flow, timeline_defaults: this.timelineDefaults })) {
        return Validator.getSafeFallback();
    }

    return output;
  }

  calculateProgress(stepId) {
    if (stepId === 'start') return 0;
    if (this.flow[stepId] && this.flow[stepId].type === 'final') return 100;

    // Walk forward from stepId following .next links to count remaining steps
    let remaining = 0;
    let walkId = stepId;
    const visited = new Set();
    while (walkId && this.flow[walkId] && this.flow[walkId].type !== 'final' && !visited.has(walkId)) {
      visited.add(walkId);
      remaining++;
      walkId = this.flow[walkId].next || null;
    }

    // Walk backward: count how many steps from start to here
    // Use a simple approach: total path = steps behind + steps ahead
    // Steps behind = we know the step isn't start or final
    // Estimate total depth from routing entry to done
    let total = remaining;
    // Walk from routing entry forward to count full path length
    for (const [, entryId] of Object.entries(this.routing)) {
      let id = entryId;
      let depth = 1;
      const seen = new Set();
      while (id && this.flow[id] && this.flow[id].type !== 'final' && !seen.has(id)) {
        seen.add(id);
        if (id === stepId) {
          // Found our step at position 'depth' in this path
          total = depth + remaining - 1;
          return Math.round((depth / (total + 1)) * 100);
        }
        depth++;
        // Follow first option's next or direct next
        if (this.flow[id].options && this.flow[id].options.length > 0) {
          id = this.flow[id].options[0].next;
        } else {
          id = this.flow[id].next || null;
        }
      }
    }

    // Fallback: simple ratio
    const stepKeys = Object.keys(this.flow);
    const idx = stepKeys.indexOf(stepId);
    if (idx === -1) return 0;
    return Math.round((idx / (stepKeys.length - 1)) * 100);
  }

  generateTimeline(safeContext) {
    let timeline = [...this.timelineDefaults];
    if (safeContext.voter_type === 'candidate') {
      timeline.push({ event: "Nomination Deadline", date: "2026-05-01" });
    }
    return timeline.sort((a, b) => new Date(a.date) - new Date(b.date));
  }
}

export default DecisionEngine;
