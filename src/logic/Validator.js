/**
 * ElectEase Security Layer (Validator)
 * Strict, deterministic 3-layer security for civic guidance.
 */

const requestCounts = new Map();

const Validator = {
  /**
   * Dynamic rate limiting using token/session ID.
   * Tracks { count, startTime } and resets after windowMs.
   */
  checkRateLimit(identifier, limit = 10, windowMs = 60000) {
    if (!identifier) return false;
    const now = Date.now();
    const record = requestCounts.get(identifier) || { count: 0, startTime: now };
    
    if (now - record.startTime > windowMs) {
      // Reset window
      record.count = 1;
      record.startTime = now;
    } else {
      record.count++;
    }
    
    requestCounts.set(identifier, record);
    return record.count <= limit;
  },

  /**
   * 1. sanitizeInput(input)
   * Strict whitelist-based sanitization.
   */
  sanitizeInput(input, maxLength = 50) {
    if (typeof input !== 'string') return '';
    let sanitized = input.trim();
    
    // Strict Whitelist: alphanumeric, space, and hyphen ONLY
    sanitized = sanitized.replace(/[^a-zA-Z0-9\s\-]/g, '');
    
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }
    return sanitized;
  },

  /**
   * 2. validateContext(context)
   * Strictly enforces fields and types, rejecting invalid partial states.
   */
  validateContext(context) {
    if (!context || typeof context !== 'object') {
      return { valid: false, safeContext: { voter_type: 'unknown', age: null, location: null } };
    }

    const allowedVoterTypes = ['first-time', 'registered', 'candidate'];
    const safeContext = {};
    let isValid = true;

    // Validate voter_type (REQUIRED)
    if (context.voter_type !== undefined && context.voter_type !== null) {
      let typeStr = String(context.voter_type);
      let sanitizedType = typeStr.trim().replace(/[^a-zA-Z0-9\-]/g, '').toLowerCase();
      if (allowedVoterTypes.includes(sanitizedType)) {
        safeContext.voter_type = sanitizedType;
      } else {
        isValid = false;
        safeContext.voter_type = 'unknown'; // Safe Fallback
      }
    } else {
      isValid = false;
      safeContext.voter_type = 'unknown';
    }

    // Validate age
    if (context.age !== undefined && context.age !== null) {
      const ageNum = parseInt(context.age, 10);
      if (Number.isInteger(ageNum) && ageNum >= 18 && ageNum <= 130) {
        safeContext.age = ageNum;
      } else {
        isValid = false;
        safeContext.age = null; // Fallback
      }
    } else {
      safeContext.age = null;
    }

    // Validate location
    if (context.location !== undefined && context.location !== null) {
      const locStr = String(context.location);
      const cleanLoc = this.sanitizeInput(locStr, 50);
      if (cleanLoc.length > 0) {
        safeContext.location = cleanLoc;
      } else {
        isValid = false;
        safeContext.location = null;
      }
    } else {
      safeContext.location = null;
    }

    return { valid: isValid, safeContext };
  },

  /**
   * 3. validateOutput(output, flow)
   * Prevents arbitrary logic execution or hallucinations.
   */
  validateOutput(output, flow) {
    if (!output || typeof output !== 'object') return false;

    // Strict structure
    const keys = Object.keys(output);
    if (!keys.includes('step') || !keys.includes('progress') || !keys.includes('timeline')) {
        return false;
    }

    if (!output.step || typeof output.step !== 'object') return false;
    if (!Number.isInteger(output.progress) || output.progress < 0 || output.progress > 100) return false;
    if (!Array.isArray(output.timeline)) return false;

    const stepId = output.step.id;
    if (!stepId || !flow.steps[stepId]) return false;

    const expectedStep = flow.steps[stepId];
    if (output.step.title !== expectedStep.title) return false;
    if (output.step.description !== expectedStep.description) return false;
    if (output.step.type !== expectedStep.type) return false;

    return true;
  },

  getSafeFallback() {
    return {
      step: { id: "start", title: "Safe Mode", description: "Invalid input or excessive requests detected. Restarting safely.", type: "system" },
      progress: 0,
      timeline: []
    };
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Validator;
} else {
  window.Validator = Validator;
}
