/**
 * ElectEase Explainability Engine (Prompt System)
 * Translates Engine logic state into deterministic, explainable guidance.
 */

const predefinedTemplates = {
  "start": {
    "explanation": "We need to understand your current voting status to provide the correct guidance.",
    "why": "Different voter types have different requirements and deadlines.",
    "action": "Select the option that best describes you.",
    "alert": { "type": "info", "message": "Your selection will customize the next steps." },
    "next_step_hint": "Next: Registration Status Check"
  },
  "registration_check": {
    "explanation": "We need to know if you have already submitted a voter registration application.",
    "why": "This determines whether you need to start a new application or just track an existing one.",
    "action": "Indicate whether you have started the registration process.",
    "alert": { "type": "warning", "message": "If you are unsure, it is best to assume you have not started." },
    "next_step_hint": "Next: Eligibility Information"
  },
  "verify_registration": {
    "explanation": "You should check if your name is already on the official electoral roll.",
    "why": "This prevents duplicate registrations and confirms your eligibility to vote.",
    "action": "Check your status online using your voter ID.",
    "alert": { "type": "info", "message": "Make sure your details match your ID exactly." },
    "next_step_hint": "Next: Done"
  },
  "candidate_intro": {
    "explanation": "Political candidates have a separate set of strict guidelines and nomination procedures.",
    "why": "Filing for candidacy requires specific legal compliance.",
    "action": "Review the candidate nomination portal.",
    "alert": { "type": "warning", "message": "Do not miss the nomination deadline." },
    "next_step_hint": "Next: Nomination Filing"
  },
  "eligibility_info": {
    "explanation": "You must meet the basic age and citizenship requirements to register.",
    "why": "Only eligible citizens are legally allowed to participate in the election.",
    "action": "Review the eligibility criteria before proceeding.",
    "alert": { "type": "info", "message": "You must be 18+ to register." },
    "next_step_hint": "Next: Document Collection"
  },
  "document_collection": {
    "explanation": "You need specific official documents to prove your identity and address.",
    "why": "Electoral rules require strict verification to prevent voter fraud.",
    "action": "Gather your Identity Proof, Address Proof, and a Passport Photograph.",
    "alert": { "type": "warning", "message": "Ensure all documents are valid and not expired." },
    "next_step_hint": "Next: Application Submission"
  },
  "application_submission": {
    "explanation": "You must formally submit your voter registration form (Form 6).",
    "why": "Submission is required to be added to the official electoral roll.",
    "action": "Submit the form online or visit your local electoral office.",
    "alert": { "type": "error", "message": "Urgent: Complete this before the application deadline." },
    "next_step_hint": "Next: Completion"
  },
  "done": {
    "explanation": "You have completed the guided steps for your voter profile.",
    "why": "Your action items are complete for this phase.",
    "action": "Wait for further notifications or check your status online.",
    "alert": { "type": "info", "message": "No further action required." },
    "next_step_hint": "Next: None"
  }
};

class ExplainabilityEngine {
  /**
   * Translates the logic state into structured explainable output.
   * @param {Object} state - Output from Decision Engine { step, progress, timeline }
   * @returns {Object} Structured standardized output
   */
  static generateGuidance(state) {
    if (!state || !state.step || !state.step.id) {
      return this.getFallbackGuidance();
    }

    const stepId = state.step.id;
    const template = predefinedTemplates[stepId];

    // Explicitly handle unknown steps
    if (!template) {
      console.warn(`unknown_step_detected = true for stepId: ${stepId}`);
      return this.getFallbackGuidance();
    }

    return {
      step: state.step,
      explanation: template.explanation,
      why: template.why,
      action: template.action,
      alert: template.alert,
      next_step_hint: template.next_step_hint,
      trust: {
        is_verified: true,
        source: "Predefined Election Rules"
      }
    };
  }

  static getFallbackGuidance() {
    return {
      step: { id: "error", title: "Error", description: "Invalid state encountered.", type: "system" },
      explanation: "The system encountered an unknown state or unrecognized step.",
      why: "To maintain security and prevent misinformation, guidance has been safely halted.",
      action: "Please restart the guidance process safely.",
      alert: {
        type: "error",
        message: "System Error: Safe Mode Activated."
      },
      next_step_hint: "Next: Restart System",
      trust: {
        is_verified: true,
        source: "Predefined Election Rules"
      }
    };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ExplainabilityEngine;
} else {
  window.ExplainabilityEngine = ExplainabilityEngine;
}
