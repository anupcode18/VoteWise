/**
 * ElectEase Decision Engine
 * 
 * PURPOSE: Deterministic, rule-based logic for civic guidance.
 * RESPONSIBILITIES: Resolves state based on user input, determines the next logical step from flow.json, tracks progress, and calculates timeline.
 * SECURITY NOTES: Output integrity is checked via Validator.js before returning. Logic is purely data-driven (no hallucinations).
 */

import Validator from './Validator.js';

class DecisionEngine {
  constructor(flowData) {
    this.flow = flowData.steps;
    this.routing = flowData.routing;
    this.timelineDefaults = flowData.timeline_defaults;

    // Cache: pre-compute path maps for each routing entry
    this.pathCache = this.buildPathCache();
  }

  /**
   * Pre-compute full path for each voter type at construction time.
   * Avoids recalculating graph walks on every resolveState call.
   */
  buildPathCache() {
    const cache = {};
    for (const [voterType, entryId] of Object.entries(this.routing)) {
      const path = [];
      let id = entryId;
      const visited = new Set();
      while (id && this.flow[id] && !visited.has(id)) {
        visited.add(id);
        path.push(id);
        if (this.flow[id].type === 'final') break;
        if (this.flow[id].options && this.flow[id].options.length > 0) {
          id = this.flow[id].options[0].next;
        } else {
          id = this.flow[id].next || null;
        }
      }
      cache[voterType] = path;
    }
    return cache;
  }

  /**
   * resolveState
   * INPUTS: rawContext (Object from UI), sessionId (string)
   * OUTPUTS: Object { step, progress, timeline }
   * BEHAVIOR: Rate limits session, validates context, determines current/next step based on flow.json routing, calculates progress and timeline, then verifies output integrity.
   */
  resolveState(rawContext, sessionId = 'default_session') {
    // 0. Null guard
    if (!rawContext || typeof rawContext !== 'object') {
      rawContext = {};
    }

    // 1. Rate limit
    if (!Validator.checkRateLimit(sessionId, 10, 60000)) {
      return Validator.getSafeFallback();
    }

    // 2. Validate context
    const { safeContext } = Validator.validateContext(rawContext);

    // 3. Determine step
    let currentStepId = 'start';

    if (rawContext._targetStepId && this.flow[rawContext._targetStepId]) {
      currentStepId = rawContext._targetStepId;
    } else if (safeContext.voter_type && safeContext.voter_type !== 'unknown') {
      currentStepId = this.routing[safeContext.voter_type] || 'start';
    }

    // Note: Age validation (18-130) is enforced by Validator.validateContext().
    // No age override needed here — invalid ages are already nullified upstream.

    const currentStep = this.flow[currentStepId] || this.flow['start'];

    // 5. Progress & timeline
    const progress = this.calculateProgress(currentStepId, safeContext.voter_type);
    const timeline = this.generateTimeline(safeContext);

    const output = { step: currentStep, progress, timeline };

    // 6. Output integrity
    if (!Validator.validateOutput(output, { steps: this.flow, timeline_defaults: this.timelineDefaults })) {
      return Validator.getSafeFallback();
    }

    return output;
  }

  /**
   * Path-aware progress using cached paths.
   */
  calculateProgress(stepId, voterType) {
    if (stepId === 'start') return 0;
    if (this.flow[stepId] && this.flow[stepId].type === 'final') return 100;

    // Try cached path first
    if (voterType && this.pathCache[voterType]) {
      const path = this.pathCache[voterType];
      const idx = path.indexOf(stepId);
      if (idx !== -1) {
        return Math.round(((idx + 1) / path.length) * 100);
      }
    }

    // Fallback: search all cached paths
    for (const path of Object.values(this.pathCache)) {
      const idx = path.indexOf(stepId);
      if (idx !== -1) {
        return Math.round(((idx + 1) / path.length) * 100);
      }
    }

    // Last resort
    const keys = Object.keys(this.flow);
    const idx = keys.indexOf(stepId);
    return idx === -1 ? 0 : Math.round((idx / (keys.length - 1)) * 100);
  }

  generateTimeline(safeContext) {
    const timeline = [...this.timelineDefaults];
    if (safeContext.voter_type === 'candidate') {
      timeline.push({ event: "Nomination Deadline", date: "2026-05-01" });
    }
    return timeline.sort((a, b) => new Date(a.date) - new Date(b.date));
  }
}

export default DecisionEngine;
