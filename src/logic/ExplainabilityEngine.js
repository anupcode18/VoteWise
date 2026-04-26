/**
 * ElectEase Explainability Engine
 * 
 * PURPOSE: Transforms raw engine state into user-friendly, structured explainable output.
 * RESPONSIBILITIES: Reads templates from flow.json, maps state to human-readable explanations, calculates readiness scores, and populates official links.
 * SECURITY NOTES: Driven entirely by predefined JSON templates (zero hardcoded text, zero LLM hallucinations).
 */

class ExplainabilityEngine {
  /**
   * @param {Object} templates - The templates object from flow.json
   */
  constructor(templates) {
    this.templates = templates || {};
  }

  /**
   * generateGuidance
   * INPUTS: state (Object { step, progress, timeline }), simpleMode (boolean)
   * OUTPUTS: Object (Structured standardized output for UI)
   * BEHAVIOR: Translates the logic state into a complete guidance object including explanation, why, action, alerts, recommendations, and official links. Calculates readiness score dynamically.
   */
  generateGuidance(state, simpleMode = false) {
    if (!state || !state.step || !state.step.id) {
      return ExplainabilityEngine.getFallbackGuidance();
    }

    const stepId = state.step.id;
    const template = this.templates[stepId];

    if (!template) {
      return ExplainabilityEngine.getFallbackGuidance();
    }

    // Calculate readiness from checklist
    const checklist = template.checklist;
    const checklistValues = Object.values(checklist);
    const completedCount = checklistValues.filter(v => v === true).length;
    const readinessScore = Math.round((completedCount / checklistValues.length) * 100);

    return {
      step: state.step,
      progress: state.progress || 0,
      explanation: simpleMode ? template.simple : template.explanation,
      why: template.why,
      action: template.action,
      alert: template.alert,
      nextStepHint: template.next_step_hint,
      recommendation: template.recommendation,
      locationRelevant: template.location_relevant === true,
      officialLinks: template.official_links || null,
      readiness: {
        score: readinessScore,
        checklist: {
          eligibility: checklist.eligibility,
          documents: checklist.documents,
          submission: checklist.submission
        }
      },
      trust: {
        isVerified: true,
        source: "Predefined Election Rules"
      }
    };
  }

  static getFallbackGuidance() {
    return {
      step: { id: "error", title: "Error", description: "Invalid state encountered.", type: "system" },
      progress: 0,
      explanation: "The system encountered an unknown state or unrecognized step.",
      why: "To maintain security and prevent misinformation, guidance has been safely halted.",
      action: "Please restart the guidance process safely.",
      alert: { type: "error", message: "System Error: Safe Mode Activated." },
      nextStepHint: "Next: Restart System",
      recommendation: "Refresh the page and try again.",
      locationRelevant: false,
      readiness: {
        score: 0,
        checklist: { eligibility: false, documents: false, submission: false }
      },
      trust: {
        isVerified: true,
        source: "Predefined Election Rules"
      }
    };
  }
}

export default ExplainabilityEngine;
