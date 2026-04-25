/**
 * ElectEase Security Layer (Validator)
 * 3-layer security for input sanitization, context validation, and output integrity.
 */

const requestCounts = new Map();

const Validator = {
  /**
   * Rate limiting to prevent spam/abuse.
   * Tracks request count by a generic identifier (e.g., 'session').
   */
  checkRateLimit(identifier = 'global', limit = 50, windowMs = 60000) {
    const now = Date.now();
    const record = requestCounts.get(identifier) || { count: 0, startTime: now };
    
    if (now - record.startTime > windowMs) {
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
   * Whitelist-based sanitization: allows only a-zA-Z0-9 and spaces.
   */
  sanitizeInput(input, maxLength = 100) {
    if (typeof input !== 'string') return '';
    let sanitized = input.trim();
    
    // Whitelist: only alphanumeric and space
    sanitized = sanitized.replace(/[^a-zA-Z0-9\s]/g, '');
    
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }
    return sanitized;
  },

  /**
   * 2. validateContext(context)
   * Strictly enforces fields and types.
   */
  validateContext(context) {
    if (!context || typeof context !== 'object') return { valid: false, safeContext: { voter_type: 'unknown', age: null, location: null } };

    const allowedVoterTypes = ['first-time', 'registered', 'candidate'];
    const safeContext = {};
    let isValid = true;

    // Validate voter_type
    if (context.voter_type !== undefined && context.voter_type !== null) {
      // Allow alphanumeric and hyphens, ensure it's a string
      let typeStr = String(context.voter_type);
      let sanitizedType = typeStr.trim().replace(/[^a-zA-Z0-9\-]/g, '').toLowerCase();
      if (allowedVoterTypes.includes(sanitizedType)) {
        safeContext.voter_type = sanitizedType;
      } else {
        isValid = false;
        safeContext.voter_type = 'unknown';
      }
    } else {
      safeContext.voter_type = 'unknown';
    }

    // Validate age
    if (context.age !== undefined && context.age !== null) {
      const ageNum = parseInt(context.age, 10);
      if (Number.isInteger(ageNum) && ageNum >= 18 && ageNum <= 130) {
        safeContext.age = ageNum;
      } else {
        isValid = false;
        safeContext.age = null;
      }
    } else {
      safeContext.age = null;
    }

    // Validate location (string)
    if (context.location) {
      safeContext.location = this.sanitizeInput(context.location, 50);
    } else {
      safeContext.location = null;
    }

    return { valid: isValid, safeContext };
  },

  /**
   * 3. validateOutput(output, flow)
   * Ensures output structure and contents are strictly from predefined flow.
   */
  validateOutput(output, flow) {
    if (!output || typeof output !== 'object') return false;

    // Strict structural enforcement
    const keys = Object.keys(output);
    if (keys.length !== 3 || !keys.includes('step') || !keys.includes('progress') || !keys.includes('timeline')) {
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
      step: { id: "start", title: "Safe Mode", description: "Invalid input detected. Restarting safely.", type: "system" },
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
