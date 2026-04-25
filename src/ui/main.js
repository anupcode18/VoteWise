/**
 * ElectEase AI | UI Layer (main.js)
 * Orchestrates interaction between UI components and deterministic logic engines.
 */

import DecisionEngine from '../logic/Engine.js';
import ExplainabilityEngine from '../logic/ExplainabilityEngine.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Initialize State & Engines
    let currentContext = {
        voter_type: 'unknown',
        age: 18,
        location: 'Local'
    };

    let engine;
    let flowData;
    let currentStepId = 'start';
    let simpleMode = false;
    let lastGuidance = null;

    try {
        const response = await fetch('src/data/flow.json');
        if (!response.ok) throw new Error("Flow data not found");
        flowData = await response.json();
        engine = new DecisionEngine(flowData);
    } catch (error) {
        console.error("Initialization error:", error);
        showFatalError("System connection issue. Please ensure you are running this on a local server (http://localhost).");
        return;
    }

    // 2. Select DOM Elements
    const stepTitle = document.getElementById('step-title');
    const stepExplanation = document.getElementById('step-explanation');
    const stepWhy = document.getElementById('step-why');
    const stepAction = document.getElementById('step-action');
    const stepAlert = document.getElementById('step-alert');
    const alertMessage = document.getElementById('alert-message');
    const nextStepHint = document.getElementById('next-step-hint');
    const progressBar = document.getElementById('progress-bar');
    const progressPercent = document.getElementById('progress-percent');
    const inputContainer = document.getElementById('input-container');
    const nextBtn = document.getElementById('next-btn');
    const recommendationText = document.getElementById('recommendation-text');
    const readinessScore = document.getElementById('readiness-score');
    const readinessBar = document.getElementById('readiness-bar');
    const checkEligibility = document.getElementById('check-eligibility');
    const checkDocuments = document.getElementById('check-documents');
    const checkSubmission = document.getElementById('check-submission');
    const simpleToggle = document.getElementById('simple-toggle');
    const downloadBtn = document.getElementById('download-btn');

    let selectedOption = null;

    // 3. UI Update Logic
    const updateUI = (guidance) => {
        lastGuidance = guidance;
        const { step, progress, explanation, why, action, alert, next_step_hint, recommendation, readiness } = guidance;
        currentStepId = step.id;

        // Header & Progress
        stepTitle.innerText = step.title;
        progressBar.style.width = `${progress}%`;
        progressPercent.innerText = `${progress}%`;

        // Content
        stepExplanation.innerText = explanation;
        stepWhy.innerText = why;
        stepAction.innerText = action;

        // Alert handling
        if (alert) {
            stepAlert.style.display = 'block';
            stepAlert.className = `alert-box ${alert.type}`;
            alertMessage.innerText = alert.message;
        } else {
            stepAlert.style.display = 'none';
        }

        // Recommendation
        if (recommendation) {
            recommendationText.innerText = recommendation;
        }

        // Readiness
        if (readiness) {
            readinessScore.innerText = `${readiness.score}%`;
            readinessBar.style.width = `${readiness.score}%`;
            updateChecklist(checkEligibility, readiness.checklist.eligibility);
            updateChecklist(checkDocuments, readiness.checklist.documents);
            updateChecklist(checkSubmission, readiness.checklist.submission);
        }

        // Hint & Button
        nextStepHint.innerText = next_step_hint || "";
        nextBtn.innerText = step.id === 'start' ? "Begin Journey" : (step.type === 'final' ? "Restart" : "Continue");
        nextBtn.disabled = true;

        // Input Injection
        renderInputs(step);
    };

    function updateChecklist(element, isDone) {
        const icon = element.querySelector('.check-icon');
        if (isDone) {
            element.classList.add('done');
            icon.innerText = '✓';
        } else {
            element.classList.remove('done');
            icon.innerText = '○';
        }
    }

    const renderInputs = (step) => {
        inputContainer.innerHTML = '';
        selectedOption = null;
        
        if (step.id === 'start') {
            const label = document.createElement('label');
            label.innerText = "Select your current status:";
            label.className = "input-label";
            
            const select = document.createElement('select');
            select.id = 'voter-type-select';
            
            const options = [
                { label: "Choose an option...", value: "unknown" },
                { label: "First-time Voter", value: "first-time" },
                { label: "Registered Voter", value: "registered" },
                { label: "Election Candidate", value: "candidate" }
            ];

            options.forEach(opt => {
                const o = document.createElement('option');
                o.value = opt.value;
                o.innerText = opt.label;
                select.appendChild(o);
            });

            select.addEventListener('change', (e) => {
                currentContext.voter_type = e.target.value;
                selectedOption = e.target.value !== 'unknown' ? e.target.value : null;
                nextBtn.disabled = !selectedOption;
            });

            inputContainer.appendChild(label);
            inputContainer.appendChild(select);
        } else if (step.options && step.options.length > 0) {
            const label = document.createElement('label');
            label.innerText = "Please choose an option:";
            label.className = "input-label";
            inputContainer.appendChild(label);

            const optionsList = document.createElement('div');
            optionsList.className = "options-list";

            step.options.forEach(opt => {
                const btn = document.createElement('button');
                btn.className = "option-btn";
                btn.innerText = opt.label;
                btn.addEventListener('click', () => {
                    Array.from(optionsList.children).forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    selectedOption = opt.value;
                    nextBtn.disabled = false;
                });
                optionsList.appendChild(btn);
            });
            inputContainer.appendChild(optionsList);
        } else {
            nextBtn.disabled = false;
        }
    };

    function showFatalError(msg) {
        const card = document.getElementById('step-card');
        if (card) {
            card.innerHTML = `
                <div style="text-align: center; padding: 20px;">
                    <h2 style="color: var(--error);">Initialization Failed</h2>
                    <p style="color: var(--text-dim); margin-bottom: 20px;">${msg}</p>
                </div>
            `;
        }
    }

    // ─── Feature: Download Plan ───
    function generatePlanText(guidance) {
        const g = guidance;
        const c = currentContext;
        const lines = [
            '════════════════════════════════════════',
            '  ElectEase AI — Your Personal Election Plan',
            '════════════════════════════════════════',
            '',
            `Voter Type:    ${c.voter_type || 'Unknown'}`,
            `Location:      ${c.location || 'Not set'}`,
            '',
            '────────────────────────────────────────',
            `  Current Step: ${g.step.title}`,
            '────────────────────────────────────────',
            '',
            `Explanation:   ${g.explanation}`,
            `Why:           ${g.why}`,
            `Action:        ${g.action}`,
            '',
            `Alert:         [${g.alert.type.toUpperCase()}] ${g.alert.message}`,
            `Recommendation:${g.recommendation}`,
            '',
            '────────────────────────────────────────',
            '  Readiness Checklist',
            '────────────────────────────────────────',
            `  [${g.readiness.checklist.eligibility ? '✓' : ' '}] Eligibility Confirmed`,
            `  [${g.readiness.checklist.documents  ? '✓' : ' '}] Documents Ready`,
            `  [${g.readiness.checklist.submission ? '✓' : ' '}] Application Submitted`,
            '',
            `  Readiness Score: ${g.readiness.score}%`,
            `  Progress:        ${g.progress}%`,
            '',
            '────────────────────────────────────────',
            `  Next: ${g.next_step_hint}`,
            '────────────────────────────────────────',
            '',
            `Source: ${g.trust.source}`,
            `Verified: ${g.trust.is_verified ? 'Yes' : 'No'}`,
            `Generated: ${new Date().toLocaleString()}`,
            '',
            '════════════════════════════════════════',
        ];
        return lines.join('\n');
    }

    function downloadPlan() {
        if (!lastGuidance) return;
        const text = generatePlanText(lastGuidance);
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `electease-plan-${currentStepId}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // ─── Feature: Simple Mode Toggle ───
    simpleToggle.addEventListener('click', () => {
        simpleMode = !simpleMode;
        simpleToggle.classList.toggle('active', simpleMode);
        simpleToggle.innerText = simpleMode ? '☰ Normal' : '☰ Simple';
        // Re-render with current state
        const state = engine.resolveState({ ...currentContext, _targetStepId: currentStepId }, 'web_session_01');
        const guidance = ExplainabilityEngine.generateGuidance(state, simpleMode);
        updateUI(guidance);
    });

    // ─── Feature: Download Button ───
    downloadBtn.addEventListener('click', downloadPlan);

    // 4. Interaction Handling
    nextBtn.addEventListener('click', () => {
        const currentStep = flowData.steps[currentStepId];

        // If final step → full reset
        if (currentStep && currentStep.type === 'final') {
            currentContext = { voter_type: 'unknown', age: 18, location: 'Local' };
            currentStepId = 'start';
            delete currentContext._targetStepId;

            const state = engine.resolveState(currentContext, 'web_session_01');
            const guidance = ExplainabilityEngine.generateGuidance(state, simpleMode);
            updateUI(guidance);
            return;
        }

        // Resolve next step ID from flow graph
        let nextStepId = null;

        if (currentStep && currentStep.options && selectedOption) {
            const chosen = currentStep.options.find(o => o.value === selectedOption);
            if (chosen && chosen.next) {
                nextStepId = chosen.next;
            }
        } else if (currentStep && currentStep.next) {
            nextStepId = currentStep.next;
        }

        if (nextStepId) {
            currentContext._targetStepId = nextStepId;
        }

        const state = engine.resolveState(currentContext, 'web_session_01');
        const guidance = ExplainabilityEngine.generateGuidance(state, simpleMode);
        updateUI(guidance);
    });

    // 5. Initial Run
    const initialState = engine.resolveState(currentContext);
    const initialGuidance = ExplainabilityEngine.generateGuidance(initialState, simpleMode);
    updateUI(initialGuidance);
});
