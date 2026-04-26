/**
 * ElectEase AI | UI Layer (main.js)
 * Dashboard orchestrator — connects engines to UI components.
 * Zero external dependencies. Pure ES Modules.
 */

import DecisionEngine from '../logic/Engine.js';
import ExplainabilityEngine from '../logic/ExplainabilityEngine.js';

document.addEventListener('DOMContentLoaded', async () => {
    // ═══ 1. State ═══
    let currentContext = { voter_type: 'unknown', age: 18, location: 'Local' };
    let engine;
    let explainer;
    let flowData;
    let currentStepId = 'start';
    let simpleMode = false;
    let lastGuidance = null;
    let visitedSteps = new Set(['start']);
    let userCoords = null;

    // ═══ 2. Init Engines ═══
    try {
        const response = await fetch('src/data/flow.json');
        if (!response.ok) throw new Error('Flow data not found');
        flowData = await response.json();
        engine = new DecisionEngine(flowData);
        explainer = new ExplainabilityEngine(flowData.templates);
    } catch (err) {
        showFatalError('System connection issue. Please ensure you are running this on a local server (http://localhost).');
        return;
    }

    // ═══ 3. DOM Cache ═══
    const dom = {
        stepTitle: document.getElementById('step-title'),
        stepExplanation: document.getElementById('step-explanation'),
        stepWhy: document.getElementById('step-why'),
        stepAction: document.getElementById('step-action'),
        stepAlert: document.getElementById('step-alert'),
        alertMessage: document.getElementById('alert-message'),
        nextStepHint: document.getElementById('next-step-hint'),
        progressBar: document.getElementById('progress-bar'),
        progressBarWrap: document.getElementById('progress-bar-wrap'),
        progressPercent: document.getElementById('progress-percent'),
        inputContainer: document.getElementById('input-container'),
        nextBtn: document.getElementById('next-btn'),
        recommendationText: document.getElementById('recommendation-text'),
        readinessScore: document.getElementById('readiness-score'),
        readinessBar: document.getElementById('readiness-bar'),
        readinessBarWrap: document.getElementById('readiness-bar-wrap'),
        checkEligibility: document.getElementById('check-eligibility'),
        checkDocuments: document.getElementById('check-documents'),
        checkSubmission: document.getElementById('check-submission'),
        simpleToggle: document.getElementById('simple-toggle'),
        downloadBtn: document.getElementById('download-btn'),
        copyBtn: document.getElementById('copy-btn'),
        stepNav: document.getElementById('step-nav'),
        locationBtn: document.getElementById('location-btn'),
        locationStatus: document.getElementById('location-status'),
        mapsLink: document.getElementById('maps-link'),
    };

    let selectedOption = null;

    // ═══ 4. Sidebar: Journey Steps ═══
    function buildSidebar() {
        dom.stepNav.innerHTML = '';
        const steps = flowData.steps;
        const order = Object.keys(steps);
        order.forEach(id => {
            if (id === 'start') return; // skip start in nav
            const step = steps[id];
            const item = document.createElement('div');
            item.className = 'step-nav-item';
            item.dataset.stepId = id;
            item.innerHTML = `<span class="step-dot" aria-hidden="true"></span><span>${step.title}</span>`;
            dom.stepNav.appendChild(item);
        });
    }

    function updateSidebar(activeId) {
        const items = dom.stepNav.querySelectorAll('.step-nav-item');
        items.forEach(item => {
            const id = item.dataset.stepId;
            item.classList.remove('active', 'completed');
            if (id === activeId) {
                item.classList.add('active');
            } else if (visitedSteps.has(id)) {
                item.classList.add('completed');
            }
        });
    }

    // ═══ 5. UI Update (single re-render path) ═══
    function updateUI(guidance) {
        lastGuidance = guidance;
        const { step, progress, explanation, why, action, alert, nextStepHint, recommendation, readiness, locationRelevant } = guidance;
        currentStepId = step.id;
        visitedSteps.add(currentStepId);

        // Title & Progress
        dom.stepTitle.textContent = step.title;
        dom.progressBar.style.width = `${progress}%`;
        dom.progressPercent.textContent = `${progress}%`;
        dom.progressBarWrap.setAttribute('aria-valuenow', progress);

        // Content
        dom.stepExplanation.textContent = explanation;
        dom.stepWhy.textContent = why;
        dom.stepAction.textContent = action;

        // Alert
        if (alert) {
            dom.stepAlert.style.display = 'block';
            dom.stepAlert.className = `alert-box ${alert.type}`;
            dom.alertMessage.textContent = alert.message;
        } else {
            dom.stepAlert.style.display = 'none';
        }

        // Recommendation
        dom.recommendationText.textContent = recommendation || '';

        // Readiness
        if (readiness) {
            dom.readinessScore.textContent = `${readiness.score}%`;
            dom.readinessBar.style.width = `${readiness.score}%`;
            dom.readinessBarWrap.setAttribute('aria-valuenow', readiness.score);
            setChecklistItem(dom.checkEligibility, readiness.checklist.eligibility);
            setChecklistItem(dom.checkDocuments, readiness.checklist.documents);
            setChecklistItem(dom.checkSubmission, readiness.checklist.submission);
        }

        // Hint
        dom.nextStepHint.textContent = nextStepHint || '';

        // Button label
        dom.nextBtn.textContent = step.id === 'start' ? 'Begin Journey' : (step.type === 'final' ? 'Restart' : 'Continue');
        dom.nextBtn.disabled = true;

        // Official Links
        const officialActionBox = document.getElementById('official-action-box');
        const officialLinksContainer = document.getElementById('official-links-container');
        if (guidance.officialLinks) {
            officialLinksContainer.innerHTML = '';
            
            if (guidance.officialLinks.primary) {
                const primaryBtn = document.createElement('a');
                primaryBtn.href = guidance.officialLinks.primary.url;
                primaryBtn.className = 'official-btn';
                primaryBtn.textContent = guidance.officialLinks.primary.label + ' →';
                primaryBtn.target = '_blank';
                primaryBtn.rel = 'noopener noreferrer';
                officialLinksContainer.appendChild(primaryBtn);
            }
            
            if (guidance.officialLinks.secondary) {
                const secondaryBtn = document.createElement('a');
                secondaryBtn.href = guidance.officialLinks.secondary.url;
                secondaryBtn.className = 'official-btn-secondary';
                secondaryBtn.textContent = guidance.officialLinks.secondary.label;
                secondaryBtn.target = '_blank';
                secondaryBtn.rel = 'noopener noreferrer';
                officialLinksContainer.appendChild(secondaryBtn);
            }
            
            officialActionBox.style.display = 'block';
        } else {
            officialActionBox.style.display = 'none';
        }

        // Location section visibility
        const locSection = document.getElementById('location-section');
        if (locSection) {
            locSection.style.display = locationRelevant ? 'block' : 'none';
        }

        // Sidebar
        updateSidebar(currentStepId);

        // Inputs
        renderInputs(step);
    }

    function setChecklistItem(element, isDone) {
        const icon = element.querySelector('.check-icon');
        if (isDone) {
            element.classList.add('done');
            icon.textContent = '✓';
        } else {
            element.classList.remove('done');
            icon.textContent = '○';
        }
    }

    // ═══ 6. Input Rendering ═══
    function renderInputs(step) {
        dom.inputContainer.innerHTML = '';
        selectedOption = null;

        if (step.id === 'start') {
            const label = document.createElement('label');
            label.textContent = 'Select your current status:';
            label.className = 'input-label';
            label.setAttribute('for', 'voter-type-select');

            const select = document.createElement('select');
            select.id = 'voter-type-select';
            select.setAttribute('aria-label', 'Voter type selection');

            const opts = [
                { label: 'Choose an option...', value: 'unknown' },
                { label: 'First-time Voter', value: 'first-time' },
                { label: 'Registered Voter', value: 'registered' },
                { label: 'Election Candidate', value: 'candidate' }
            ];

            opts.forEach(o => {
                const opt = document.createElement('option');
                opt.value = o.value;
                opt.textContent = o.label;
                select.appendChild(opt);
            });

            select.addEventListener('change', (e) => {
                currentContext.voter_type = e.target.value;
                selectedOption = e.target.value !== 'unknown' ? e.target.value : null;
                dom.nextBtn.disabled = !selectedOption;
            });

            dom.inputContainer.appendChild(label);
            dom.inputContainer.appendChild(select);
        } else if (step.options && step.options.length > 0) {
            const label = document.createElement('label');
            label.textContent = 'Please choose an option:';
            label.className = 'input-label';
            dom.inputContainer.appendChild(label);

            const list = document.createElement('div');
            list.className = 'options-list';
            list.setAttribute('role', 'radiogroup');
            list.setAttribute('aria-label', 'Step options');

            step.options.forEach((opt, idx) => {
                const btn = document.createElement('button');
                btn.className = 'option-btn';
                btn.textContent = opt.label;
                btn.setAttribute('role', 'radio');
                btn.setAttribute('aria-checked', 'false');
                btn.setAttribute('tabindex', idx === 0 ? '0' : '-1');

                btn.addEventListener('click', () => {
                    Array.from(list.children).forEach(b => {
                        b.classList.remove('selected');
                        b.setAttribute('aria-checked', 'false');
                    });
                    btn.classList.add('selected');
                    btn.setAttribute('aria-checked', 'true');
                    selectedOption = opt.value;
                    dom.nextBtn.disabled = false;
                });

                // Keyboard navigation within radio group
                btn.addEventListener('keydown', (e) => {
                    const buttons = Array.from(list.children);
                    let nextIdx = -1;
                    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                        nextIdx = (idx + 1) % buttons.length;
                    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                        nextIdx = (idx - 1 + buttons.length) % buttons.length;
                    }
                    if (nextIdx >= 0) {
                        e.preventDefault();
                        buttons[nextIdx].focus();
                        buttons[nextIdx].click();
                    }
                });

                list.appendChild(btn);
            });
            dom.inputContainer.appendChild(list);
        } else {
            dom.nextBtn.disabled = false;
        }
    }

    // ═══ 7. Location Assistance (Google Maps) ═══
    dom.locationBtn.addEventListener('click', () => {
        dom.locationBtn.disabled = true;
        dom.locationStatus.textContent = 'Requesting your location...';

        if (!navigator.geolocation) {
            showManualLocationFallback();
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                userCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                const query = encodeURIComponent(`election office near ${userCoords.lat},${userCoords.lng}`);
                const mapsUrl = `https://www.google.com/maps/search/${query}`;

                dom.locationStatus.textContent = `Location found. We found offices near you.`;
                dom.mapsLink.href = mapsUrl;
                dom.mapsLink.style.display = 'block';
                dom.locationBtn.textContent = 'Refresh Location';
                dom.locationBtn.disabled = false;
            },
            () => {
                showManualLocationFallback();
            },
            { enableHighAccuracy: false, timeout: 8000 }
        );
    });

    function showManualLocationFallback() {
        const query = encodeURIComponent('election office near me');
        const mapsUrl = `https://www.google.com/maps/search/${query}`;
        dom.locationStatus.textContent = 'Location unavailable. Use the link below to search manually.';
        dom.mapsLink.href = mapsUrl;
        dom.mapsLink.style.display = 'block';
        dom.locationBtn.disabled = false;
    }

    // ═══ 8. Download Plan ═══
    function generatePlanText(guidance) {
        const g = guidance;
        const c = currentContext;
        return [
            '╔══════════════════════════════════════════════════╗',
            '║     ElectEase AI — Your Personal Election Plan   ║',
            '╚══════════════════════════════════════════════════╝',
            '',
            `  Voter Type:     ${c.voter_type || 'Unknown'}`,
            `  Location:       ${c.location || 'Not specified'}`,
            '',
            '──────────────────────────────────────────────────',
            `  CURRENT STEP: ${g.step.title}`,
            '──────────────────────────────────────────────────',
            '',
            `  Explanation:    ${g.explanation}`,
            `  Why:            ${g.why}`,
            `  Action:         ${g.action}`,
            '',
            `  Alert:          [${(g.alert?.type || 'INFO').toUpperCase()}] ${g.alert?.message || 'None'}`,
            `  Recommendation: ${g.recommendation || 'None'}`,
            '',
            '──────────────────────────────────────────────────',
            '  READINESS CHECKLIST',
            '──────────────────────────────────────────────────',
            `  [${g.readiness.checklist.eligibility ? '✓' : ' '}] Eligibility Confirmed`,
            `  [${g.readiness.checklist.documents  ? '✓' : ' '}] Documents Ready`,
            `  [${g.readiness.checklist.submission ? '✓' : ' '}] Application Submitted`,
            '',
            `  Readiness Score:  ${g.readiness.score}%`,
            `  Progress:         ${g.progress}%`,
            '',
            '──────────────────────────────────────────────────',
            `  Next: ${g.nextStepHint || 'None'}`,
            '──────────────────────────────────────────────────',
            '',
            `  Source:     ${g.trust.source}`,
            `  Verified:   ${g.trust.isVerified ? 'Yes' : 'No'}`,
            `  Generated:  ${new Date().toLocaleString()}`,
            '',
            '══════════════════════════════════════════════════',
        ].join('\n');
    }

    dom.downloadBtn.addEventListener('click', () => {
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
    });

    // ═══ 9. Copy to Clipboard ═══
    dom.copyBtn.addEventListener('click', async () => {
        if (!lastGuidance) return;
        const text = generatePlanText(lastGuidance);
        try {
            await navigator.clipboard.writeText(text);
            showToast('Plan copied to clipboard!');
        } catch {
            showToast('Copy failed — please try download instead.');
        }
    });

    // ═══ 10. Simple Mode Toggle ═══
    dom.simpleToggle.addEventListener('click', () => {
        simpleMode = !simpleMode;
        dom.simpleToggle.classList.toggle('active', simpleMode);
        dom.simpleToggle.textContent = simpleMode ? '☰ Normal' : '☰ Simple';
        dom.simpleToggle.setAttribute('aria-pressed', simpleMode);
        rerender();
    });

    // ═══ 11. Navigation ═══
    dom.nextBtn.addEventListener('click', () => {
        const currentStep = flowData.steps[currentStepId];

        // Reset on final
        if (currentStep && currentStep.type === 'final') {
            currentContext = { voter_type: 'unknown', age: 18, location: 'Local' };
            currentStepId = 'start';
            visitedSteps = new Set(['start']);
            delete currentContext._targetStepId;
            rerender();
            return;
        }

        // Resolve next step
        let nextStepId = null;

        if (currentStep?.options && selectedOption) {
            const chosen = currentStep.options.find(o => o.value === selectedOption);
            if (chosen?.next) nextStepId = chosen.next;
        } else if (currentStep?.next) {
            nextStepId = currentStep.next;
        }

        if (nextStepId) {
            currentContext._targetStepId = nextStepId;
        }

        rerender();
    });

    // ═══ 12. Rerender Helper ═══
    function rerender() {
        const state = engine.resolveState(
            { ...currentContext, _targetStepId: currentContext._targetStepId || currentStepId },
            'web_session_01'
        );
        const guidance = explainer.generateGuidance(state, simpleMode);
        updateUI(guidance);
    }

    // ═══ 13. Toast Notification ═══
    function showToast(message) {
        let toast = document.querySelector('.toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.className = 'toast';
            toast.setAttribute('role', 'status');
            toast.setAttribute('aria-live', 'polite');
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2500);
    }

    // ═══ 14. Fatal Error ═══
    function showFatalError(msg) {
        const card = document.getElementById('step-card');
        if (card) {
            card.innerHTML = `
                <div style="text-align:center;padding:40px;">
                    <h2 style="color:var(--error);margin-bottom:12px;">Initialization Failed</h2>
                    <p style="color:var(--text-dim);">${msg}</p>
                </div>`;
        }
    }

    // ═══ 15. Boot ═══
    buildSidebar();
    const initialState = engine.resolveState(currentContext);
    const initialGuidance = explainer.generateGuidance(initialState, simpleMode);
    updateUI(initialGuidance);
});
