/**
 * ElectEase Explainability Engine (Prompt System)
 * Translates Engine logic state into deterministic, explainable guidance.
 */

const predefinedTemplates = {
  "start": {
    "explanation": "We need to understand your current voting status to provide the correct guidance.",
    "simple": "Tell us who you are so we can help.",
    "why": "Different voter types have different requirements and deadlines.",
    "action": "Select the option that best describes you.",
    "alert": { "type": "info", "message": "Your selection will customize the next steps." },
    "next_step_hint": "Next: Registration Status Check",
    "recommendation": "Take a moment to confirm your current voter registration status before proceeding.",
    "checklist": { "eligibility": false, "documents": false, "submission": false }
  },
  "registration_check": {
    "explanation": "We need to know if you have already submitted a voter registration application.",
    "simple": "Have you already applied to register?",
    "why": "This determines whether you need to start a new application or just track an existing one.",
    "action": "Indicate whether you have started the registration process.",
    "alert": { "type": "warning", "message": "If you are unsure, it is best to assume you have not started." },
    "next_step_hint": "Next: Eligibility Information",
    "recommendation": "Check with your local electoral office if you are unsure about your registration status.",
    "checklist": { "eligibility": false, "documents": false, "submission": false }
  },
  "verify_registration": {
    "explanation": "You should check if your name is already on the official electoral roll.",
    "simple": "Look up your name on the voter list.",
    "why": "This prevents duplicate registrations and confirms your eligibility to vote.",
    "action": "Check your status online using your voter ID.",
    "alert": { "type": "info", "message": "Make sure your details match your ID exactly." },
    "next_step_hint": "Next: Done",
    "recommendation": "Visit the National Voter Service Portal to verify your registration instantly.",
    "checklist": { "eligibility": true, "documents": true, "submission": true }
  },
  "candidate_intro": {
    "explanation": "Political candidates have a separate set of strict guidelines and nomination procedures.",
    "simple": "Candidates follow a different process.",
    "why": "Filing for candidacy requires specific legal compliance.",
    "action": "Review the candidate nomination portal.",
    "alert": { "type": "warning", "message": "Do not miss the nomination deadline." },
    "next_step_hint": "Next: Nomination Filing",
    "recommendation": "Consult your party office or the Election Commission portal for candidacy forms.",
    "checklist": { "eligibility": true, "documents": false, "submission": false }
  },
  "eligibility_info": {
    "explanation": "You must meet the basic age and citizenship requirements to register.",
    "simple": "You need to be 18+ and a citizen.",
    "why": "Only eligible citizens are legally allowed to participate in the election.",
    "action": "Review the eligibility criteria before proceeding.",
    "alert": { "type": "info", "message": "You must be 18+ to register." },
    "next_step_hint": "Next: Document Collection",
    "recommendation": "Confirm your age using your birth certificate or Aadhaar card before collecting documents.",
    "checklist": { "eligibility": true, "documents": false, "submission": false }
  },
  "document_collection": {
    "explanation": "You need specific official documents to prove your identity and address.",
    "simple": "Get your ID proof, address proof, and photo ready.",
    "why": "Electoral rules require strict verification to prevent voter fraud.",
    "action": "Gather your Identity Proof, Address Proof, and a Passport Photograph.",
    "alert": { "type": "warning", "message": "Ensure all documents are valid and not expired." },
    "next_step_hint": "Next: Application Submission",
    "recommendation": "Use Aadhaar, Passport, or Driving License as identity proof for faster processing.",
    "checklist": { "eligibility": true, "documents": true, "submission": false }
  },
  "application_submission": {
    "explanation": "You must formally submit your voter registration form (Form 6).",
    "simple": "Submit Form 6 online or at the office.",
    "why": "Submission is required to be added to the official electoral roll.",
    "action": "Submit the form online or visit your local electoral office.",
    "alert": { "type": "error", "message": "Urgent: Complete this before the application deadline." },
    "next_step_hint": "Next: Completion",
    "recommendation": "Online submission via the NVSP portal is the fastest method.",
    "checklist": { "eligibility": true, "documents": true, "submission": true }
  },
  "done": {
    "explanation": "You have completed the guided steps for your voter profile.",
    "simple": "All done! You're all set.",
    "why": "Your action items are complete for this phase.",
    "action": "Wait for further notifications or check your status online.",
    "alert": { "type": "info", "message": "No further action required." },
    "next_step_hint": "Next: None",
    "recommendation": "Bookmark the NVSP portal to track your voter ID card delivery.",
    "checklist": { "eligibility": true, "documents": true, "submission": true }
  }
};

class ExplainabilityEngine {
  /**
   * Translates the logic state into structured explainable output.
   * @param {Object} state - Output from Decision Engine { step, progress, timeline }
   * @param {boolean} simpleMode - If true, use simplified explanation
   * @returns {Object} Structured standardized output
   */
  static generateGuidance(state, simpleMode = false) {
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

    // Calculate readiness from checklist
    const checklist = template.checklist;
    const checklistItems = Object.values(checklist);
    const completedItems = checklistItems.filter(v => v === true).length;
    const readinessScore = Math.round((completedItems / checklistItems.length) * 100);

    return {
      step: state.step,
      progress: state.progress || 0,
      explanation: simpleMode ? template.simple : template.explanation,
      why: template.why,
      action: template.action,
      alert: template.alert,
      next_step_hint: template.next_step_hint,
      recommendation: template.recommendation,
      readiness: {
        score: readinessScore,
        checklist: {
          eligibility: checklist.eligibility,
          documents: checklist.documents,
          submission: checklist.submission
        }
      },
      trust: {
        is_verified: true,
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
      alert: {
        type: "error",
        message: "System Error: Safe Mode Activated."
      },
      next_step_hint: "Next: Restart System",
      recommendation: "Refresh the page and try again.",
      readiness: {
        score: 0,
        checklist: { eligibility: false, documents: false, submission: false }
      },
      trust: {
        is_verified: true,
        source: "Predefined Election Rules"
      }
    };
  }
}

export default ExplainabilityEngine;
