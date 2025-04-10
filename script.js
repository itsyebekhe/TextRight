(() => { // IIFE
    // --- DOM Elements ---
    const checkForm = document.getElementById('check-form');
    const inputText = document.getElementById('input-text');
    const outputCorrectedTextarea = document.getElementById('output-corrected');
    const outputDiffView = document.getElementById('output-diff');
    const outputDiffContent = document.getElementById('output-diff-content');
    const inputStats = document.getElementById('input-stats');
    const inputReadability = document.getElementById('input-readability');
    const outputReadability = document.getElementById('output-readability');
    const apiKeyInput = document.getElementById('api-key');
    const modelSelect = document.getElementById('model');
    const errorDiv = document.getElementById('error');
    const checkBtn = document.getElementById('check-btn');
    const copyBtn = document.getElementById('copy-btn');
    const copyInputBtn = document.getElementById('copy-input-btn');
    const clearInputBtn = document.getElementById('clear-input-btn');
    const themeToggleBtn = document.getElementById('theme-toggle');
    const togglePasswordBtn = document.getElementById('toggle-password-btn');
    const eyeIconOpen = document.getElementById('eye-icon-open');
    const eyeIconClosed = document.getElementById('eye-icon-closed');
    const saveApiKeyCheckbox = document.getElementById('save-api-key-checkbox');
    const saveModelCheckbox = document.getElementById('save-model-checkbox');
    const formalitySelect = document.getElementById('formality-select');
    const concisenessCheck = document.getElementById('conciseness-check');
    const explainCorrectionsCheck = document.getElementById('explain-corrections-check'); // New
    const explanationArea = document.getElementById('explanation-area'); // New
    const explanationList = document.getElementById('explanation-list'); // New
    const currentYearSpan = document.getElementById('current-year');
    const htmlElement = document.documentElement;
    const tabCorrected = document.getElementById('tab-corrected');
    const tabDiff = document.getElementById('tab-diff');
    const outputCorrectedContent = document.getElementById('output-corrected-content');
    // Removed History Elements

    // --- Constants & Config ---
    const MAX_CHARS = 5000;
    const LS_PREFIX = 'EnhancedGrammarChecker_';
    const LS_API_KEY = LS_PREFIX + 'APIKey';
    const LS_MODEL = LS_PREFIX + 'Model';
    const LS_THEME = LS_PREFIX + 'Theme';
    // Removed LS_HISTORY and MAX_HISTORY_ITEMS
    const DEFAULT_MODEL = 'gemini-1.5-flash-latest';
    const PROXY_URL = 'https://middleman.yebekhe.workers.dev'; // Proxy URL
    const RTL_CHAR_REGEX = /^[\u0600-\u06FF\u0590-\u05FF]/;
    let GEMINI_API_KEY = "";
    // Removed checkHistory array

    // Delimiters for parsing explanations
    const CORRECTED_TEXT_DELIMITER = "**Corrected Text:**";
    const EXPLANATIONS_DELIMITER = "**Explanations:**";


    // --- Initial Setup ---
    if (currentYearSpan) currentYearSpan.textContent = new Date().getFullYear();

    // --- PWA Service Worker Registration ---
    if ('serviceWorker' in navigator) { /* ... same ... */ window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js', { scope: '/' }).then(reg => console.log('SW registration successful:', reg.scope)).catch(err => console.log('SW registration failed:', err)); }); }

    // --- Helper Function for Direction ---
    function setTextareaDirection(element) { /* ... same ... */ if (!element || element.tagName !== 'TEXTAREA') return; const text = element.value.trimStart(); element.dir = (text && RTL_CHAR_REGEX.test(text[0])) ? 'rtl' : 'ltr'; }

    // --- Textarea Auto-Resize ---
    function autoResizeTextarea(element) { /* ... same ... */ if (!element || element.tagName !== 'TEXTAREA') return; element.style.height = 'auto'; const minHeight = parseFloat(getComputedStyle(element).minHeight); element.style.height = `${Math.max(minHeight, element.scrollHeight + 2)}px`; }

    // --- Readability Score (Flesch-Kincaid) ---
    function countSyllables(word) { /* ... same ... */ if (!word || word.length === 0) return 0; word = word.toLowerCase().trim().replace(/[^a-z]/g, ''); if (word.length <= 3) return 1; word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, ''); word = word.replace(/^y/, ''); const vowelGroups = word.match(/[aeiouy]{1,}/g); const count = vowelGroups ? vowelGroups.length : 0; return Math.max(1, count); }
    function calculateReadability(text) { /* ... same ... */ if (!text || text.trim().length === 0) return { score: 0, grade: "N/A" }; const sentences = text.match(/[^.!?\n]+[.!?\n]+/g) || [text]; const sentenceCount = Math.max(1, sentences.length); const words = text.trim().split(/\s+/).filter(Boolean); const wordCount = words.length; if (wordCount === 0) return { score: 0, grade: "N/A" }; let syllableCount = 0; words.forEach(word => { syllableCount += countSyllables(word); }); const score = 206.835 - 1.015 * (wordCount / sentenceCount) - 84.6 * (syllableCount / wordCount); const gradeLevel = 0.39 * (wordCount / sentenceCount) + 11.8 * (syllableCount / wordCount) - 15.59; const clampedScore = Math.max(0, Math.min(100, score)); const formattedGrade = gradeLevel < 1 ? "~K" : gradeLevel > 16 ? "Grad+" : `G${Math.round(gradeLevel)}`; return { score: Math.round(clampedScore), grade: formattedGrade }; }
    function displayReadability(element, text) { /* ... same ... */ if (!element) return; const { score, grade } = calculateReadability(text); element.textContent = score > 0 ? `Readability: ${score} (${grade})` : 'Readability: --'; }

    // --- Theme Handling ---
    function applyTheme(theme) { /* ... same ... */ htmlElement.classList.toggle('dark-mode', theme === 'dark'); if(themeToggleBtn) { themeToggleBtn.textContent = theme === 'dark' ? '🌙' : '☀️'; themeToggleBtn.title = `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`; } try { const primaryColor = getComputedStyle(htmlElement).getPropertyValue('--primary-color').trim(); document.querySelector('meta[name="theme-color"]').setAttribute('content', primaryColor); const rgbMatch = primaryColor.match(/(\d+),\s*(\d+),\s*(\d+)/); if (rgbMatch) { htmlElement.style.setProperty('--primary-color-rgb', `${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}`); } else { console.warn("Could not parse primary color for RGB", primaryColor); htmlElement.style.setProperty('--primary-color-rgb', theme === 'dark' ? '77, 171, 247' : '0, 86, 179'); } } catch (e) { console.error("Error applying theme colors:", e); } }
    function toggleTheme() { /* ... same ... */ const newTheme = htmlElement.classList.contains('dark-mode') ? 'light' : 'dark'; localStorage.setItem(LS_THEME, newTheme); applyTheme(newTheme); }
    // Init theme
    const savedTheme = localStorage.getItem(LS_THEME); const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches; applyTheme(savedTheme || (prefersDark ? 'dark' : 'light'));
    if(themeToggleBtn) themeToggleBtn.addEventListener('click', toggleTheme);
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => { if (!localStorage.getItem(LS_THEME)) applyTheme(e.matches ? 'dark' : 'light'); });

    // --- API Key Visibility ---
    function togglePasswordVisibility() { /* ... same ... */ if(!apiKeyInput || !eyeIconOpen || !eyeIconClosed) return; const isPassword = apiKeyInput.type === 'password'; apiKeyInput.type = isPassword ? 'text' : 'password'; eyeIconOpen.style.display = isPassword ? 'block' : 'none'; eyeIconClosed.style.display = isPassword ? 'none' : 'block'; }
    // Init icon state
    if (apiKeyInput && apiKeyInput.type === 'text') { if(eyeIconOpen) eyeIconOpen.style.display = 'block'; if(eyeIconClosed) eyeIconClosed.style.display = 'none'; } else { if(eyeIconOpen) eyeIconOpen.style.display = 'none'; if(eyeIconClosed) eyeIconClosed.style.display = 'block'; }
    if(togglePasswordBtn) togglePasswordBtn.addEventListener('click', togglePasswordVisibility);

    // --- Input Validation & Stats Update ---
    function validateForm() { /* ... same ... */ const text = inputText ? inputText.value.trim() : ''; const key = apiKeyInput ? apiKeyInput.value.trim() : ''; const isValid = text.length > 0 && text.length <= MAX_CHARS && key.length > 0; if (checkBtn) checkBtn.disabled = !isValid; if (clearInputBtn) clearInputBtn.disabled = !(inputText && inputText.value.length > 0); if (copyInputBtn) copyInputBtn.disabled = !(inputText && inputText.value.length > 0); return isValid; }
    function updateInputStats() { /* ... same ... */ if (!inputText || !inputStats || !inputReadability) return; const text = inputText.value; const len = text.length; const words = text.trim().split(/\s+/).filter(Boolean); const wordCount = words.length; inputStats.textContent = `Words: ${wordCount} | Chars: ${len} / ${MAX_CHARS}`; inputStats.classList.toggle('limit-exceeded', len > MAX_CHARS); displayReadability(inputReadability, text); setTextareaDirection(inputText); autoResizeTextarea(inputText); validateForm(); }
    if(inputText) inputText.addEventListener('input', updateInputStats);
    if(apiKeyInput) apiKeyInput.addEventListener('input', validateForm);

    // --- Settings Persistence ---
    function saveSetting(key, value) { /* ... same ... */ try { localStorage.setItem(key, value); } catch(e) { console.warn("LS Save Error:", e); } }
    function removeSetting(key) { /* ... same ... */ try { localStorage.removeItem(key); } catch(e) { console.warn("LS Remove Error:", e); } }
    function loadSetting(key, element, defaultValue = '', isCheckbox = false) { /* ... same ... */ if (!element) return false; try { const savedValue = localStorage.getItem(key); if (savedValue !== null) { if (isCheckbox) element.checked = (savedValue === 'true'); else if (element.tagName === 'SELECT') { if ([...element.options].some(opt => opt.value === savedValue)) element.value = savedValue; else { removeSetting(key); if (defaultValue) element.value = defaultValue; return false; } } else if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') element.value = savedValue; else return false; return true; } else if (defaultValue && !isCheckbox && (element.tagName === 'SELECT' || element.tagName === 'INPUT' || element.tagName === 'TEXTAREA')) { element.value = defaultValue; } } catch(e) { console.warn("LS Load Error:", e); if (defaultValue && !isCheckbox && (element.tagName === 'SELECT' || element.tagName === 'INPUT' || element.tagName === 'TEXTAREA')) element.value = defaultValue; } return false; }
    // Load settings
    const keyLoaded = loadSetting(LS_API_KEY, apiKeyInput); if (keyLoaded && saveApiKeyCheckbox) saveApiKeyCheckbox.checked = true;
    const modelLoaded = loadSetting(LS_MODEL, modelSelect, DEFAULT_MODEL); if (modelLoaded && saveModelCheckbox) saveModelCheckbox.checked = true;
    // Add save listeners
    if (saveApiKeyCheckbox) saveApiKeyCheckbox.addEventListener('change', () => { if (saveApiKeyCheckbox.checked) { if (apiKeyInput) saveSetting(LS_API_KEY, apiKeyInput.value); } else { removeSetting(LS_API_KEY); } });
    if (apiKeyInput) apiKeyInput.addEventListener('input', () => { if (saveApiKeyCheckbox && saveApiKeyCheckbox.checked) saveSetting(LS_API_KEY, apiKeyInput.value); });
    if (saveModelCheckbox) saveModelCheckbox.addEventListener('change', () => { if (saveModelCheckbox.checked) { if (modelSelect) saveSetting(LS_MODEL, modelSelect.value); } else { removeSetting(LS_MODEL); } });
    if (modelSelect) modelSelect.addEventListener('change', () => { if (saveModelCheckbox && saveModelCheckbox.checked) saveSetting(LS_MODEL, modelSelect.value); });

    // --- Tab Switching ---
    function switchTab(targetTab) { /* ... same ... */ const isActiveCorrected = targetTab === tabCorrected; if(tabCorrected) { tabCorrected.classList.toggle('active', isActiveCorrected); tabCorrected.setAttribute('aria-selected', isActiveCorrected); } if(tabDiff) { tabDiff.classList.toggle('active', !isActiveCorrected); tabDiff.setAttribute('aria-selected', !isActiveCorrected); } if(outputCorrectedContent) outputCorrectedContent.classList.toggle('active', isActiveCorrected); if(outputDiffContent) outputDiffContent.classList.toggle('active', !isActiveCorrected); }
    if(tabCorrected) tabCorrected.addEventListener('click', () => switchTab(tabCorrected));
    if(tabDiff) tabDiff.addEventListener('click', () => switchTab(tabDiff));

    // --- Input/Output Actions ---
    function clearInput() {
        if (!inputText) return;
        inputText.value = '';
        inputText.dispatchEvent(new Event('input', { bubbles: true }));
        inputText.focus();
        // Clear output and related elements
        if (outputCorrectedTextarea) outputCorrectedTextarea.value = '';
        if (outputDiffView) outputDiffView.innerHTML = '';
        if (outputReadability) outputReadability.textContent = 'Readability: --';
        if (copyBtn) copyBtn.disabled = true;
        hideExplanations(); // Hide explanations area
        showError('');
        if(outputCorrectedTextarea) autoResizeTextarea(outputCorrectedTextarea);
    }
    if(clearInputBtn) clearInputBtn.addEventListener('click', clearInput);

    function copyInput() { /* ... same ... */ if (!inputText || !copyInputBtn) return; const textToCopy = inputText.value; if (textToCopy && navigator.clipboard) { navigator.clipboard.writeText(textToCopy).then(() => { const originalText = copyInputBtn.textContent; copyInputBtn.textContent = 'Copied!'; copyInputBtn.disabled = true; setTimeout(() => { copyInputBtn.textContent = 'Copy Input'; copyInputBtn.disabled = !(inputText && inputText.value.length > 0); }, 2000); }).catch(err => { console.error('Copy Input failed:', err); showError('Failed to copy input text.'); }); } else if (!navigator.clipboard) { showError('Clipboard API not available.'); } }
    if(copyInputBtn) copyInputBtn.addEventListener('click', copyInput);

    function copyOutput() { /* ... same ... */ if (!outputCorrectedTextarea || !copyBtn) return; const textToCopy = outputCorrectedTextarea.value; if (textToCopy && navigator.clipboard) { navigator.clipboard.writeText(textToCopy).then(() => { copyBtn.textContent = 'Copied!'; copyBtn.disabled = true; setTimeout(() => { copyBtn.textContent = 'Copy'; copyBtn.disabled = !outputCorrectedTextarea.value; }, 2000); }).catch(err => { console.error('Copy failed:', err); showError('Failed to copy text.'); }); } else if (!navigator.clipboard) { showError('Clipboard API not available.'); } }
    if(copyBtn) copyBtn.addEventListener('click', copyOutput);

    // --- Show/Hide Error ---
    function showError(message) { /* ... same ... */ if (!errorDiv) return; errorDiv.textContent = message || ''; errorDiv.classList.toggle('visible', !!message); }

    // --- Generate Diff HTML ---
    function createDiffHtml(original, corrected) { /* ... same ... */ if (typeof Diff === 'undefined' || !Diff || typeof Diff.diffWords !== 'function') { console.error("jsdiff library (Diff object) is not available!"); return '<span style="color: var(--error-color);">Error: Diff library not loaded. Cannot show changes.</span>'; } try { const diff = Diff.diffWords(original, corrected); let html = ''; diff.forEach((part) => { const value = part.value.replace(/</g, "<").replace(/>/g, ">"); const valueWithBreaks = value.replace(/\n/g, '<br>'); if (part.added) html += `<ins>${valueWithBreaks}</ins>`; else if (part.removed) html += `<del>${valueWithBreaks}</del>`; else html += `<span>${valueWithBreaks}</span>`; }); return html; } catch (error) { console.error("Error during diff generation:", error); return `<span style="color: var(--error-color);">Error generating diff view: ${error.message}</span>`; } }

    // --- Explanation Display ---
    function displayExplanations(explanationText) {
        if (!explanationArea || !explanationList) return;

        explanationList.innerHTML = ''; // Clear previous
        const explanations = explanationText.split(/[\r\n]+- /).map(e => e.trim()).filter(Boolean); // Split by newline-dash-space

        if (explanations.length === 0 || (explanations.length === 1 && explanations[0].toLowerCase().includes("no major changes"))) {
            const li = document.createElement('li');
            li.textContent = "No specific explanations provided by the AI.";
            explanationList.appendChild(li);
        } else {
            explanations.forEach(exp => {
                // Remove leading "- " if it exists from the first item
                const cleanedExp = exp.startsWith('- ') ? exp.substring(2) : exp;
                if(cleanedExp) {
                    const li = document.createElement('li');
                    li.textContent = cleanedExp.replace(/</g, "<").replace(/>/g, ">"); // Basic XSS protection
                    explanationList.appendChild(li);
                }
            });
        }
        explanationArea.hidden = false; // Show the area
    }

    function hideExplanations() {
        if (explanationArea) explanationArea.hidden = true;
        if (explanationList) explanationList.innerHTML = ''; // Clear content
    }


    // --- Keyboard Shortcuts ---
    function handleKeyDown(event) { /* ... same ... */ if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { if(document.activeElement !== inputText && document.activeElement !== outputCorrectedTextarea) { event.preventDefault(); if (checkBtn && !checkBtn.disabled) checkBtn.click(); } } } // Removed Esc listener
    document.addEventListener('keydown', handleKeyDown);

    // --- Grammar Check API Call (Using Proxy, Modified Prompt) ---
    async function handleGrammarCheck(event) {
        event.preventDefault();
        // --- UI & Validation Setup ---
        if (!checkBtn || !copyBtn || !outputCorrectedTextarea || !outputDiffView || !outputDiffContent || !inputText || !apiKeyInput || !outputReadability || !formalitySelect || !concisenessCheck || !explainCorrectionsCheck || !explanationArea) { console.error("UI elements missing."); showError("UI Error."); return; }
        if (!validateForm()) { showError('Please enter text (up to 5000 chars) and your API key.'); return; }

        showError(''); checkBtn.disabled = true; checkBtn.classList.add('loading');
        copyBtn.disabled = true; outputCorrectedTextarea.value = 'Checking...';
        outputDiffView.innerHTML = 'Checking...'; outputReadability.textContent = 'Readability: --';
        hideExplanations(); // Hide previous explanations
        setTextareaDirection(outputCorrectedTextarea);
        const inputDirection = inputText.dir || 'ltr'; outputDiffContent.dir = inputDirection;

        // --- API & Proxy Setup ---
        GEMINI_API_KEY = apiKeyInput.value.trim();
        if (!GEMINI_API_KEY) { showError("API Key is missing."); checkBtn.classList.remove('loading'); validateForm(); return; }

        const textToCheck = inputText.value;
        const selectedModel = modelSelect.value;
        const targetFormality = formalitySelect.value;
        const makeConcise = concisenessCheck.checked;
        const explainCorrections = explainCorrectionsCheck.checked; // Get explanation flag

        const targetGoogleApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${GEMINI_API_KEY}`;

        // --- Build Dynamic Prompt ---
        let promptInstructions = [
            "You are an expert proofreader and editor.",
            "Correct the following text for grammar, spelling, and punctuation errors.",
            "Strictly preserve the original formatting (line breaks, paragraphs, indentation) unless correcting errors requires minor adjustments."
        ];
        if (targetFormality !== 'general') { promptInstructions.push(`Adjust the tone and style for ${formalitySelect.options[formalitySelect.selectedIndex].text}. Keep source language.`); }
        if (makeConcise) { promptInstructions.push("Make the text more concise where possible without losing essential meaning."); }

        if (explainCorrections) {
             promptInstructions.push(`After making corrections, present the final text clearly delimited like this:`);
             promptInstructions.push(CORRECTED_TEXT_DELIMITER); // Add delimiter instruction
             promptInstructions.push("[The final, corrected text goes here]");
             promptInstructions.push(`\nThen, provide a brief bulleted list of the main changes made, delimited like this:`);
             promptInstructions.push(EXPLANATIONS_DELIMITER); // Add delimiter instruction
             promptInstructions.push("- [Explanation for change 1]");
             promptInstructions.push("- [Explanation for change 2]");
             promptInstructions.push("If no significant changes were made, state that clearly in the explanation section.");
             promptInstructions.push("Do NOT include any other conversational text, apologies, or summaries outside these delimited sections. All responses should be in the same language as the original text.");
        } else {
             promptInstructions.push('Only return the resulting corrected text, without any extra conversational text, delimiters, explanations, or remarks. All responses should be in the same language as the original text.');
        }

        const fullPrompt = `${promptInstructions.join('\n')}\n\n--- START TEXT ---\n${textToCheck}\n--- END TEXT ---`;
        // --- End Prompt Building ---

        console.log("Generated Prompt:\n", fullPrompt); // Log prompt for debugging

        const googleApiPayload = {
            contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
            generationConfig: { temperature: 0.2, response_mime_type: "text/plain" },
            safetySettings: [ /* ... same ... */ { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }, { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" }, { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }, { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" } ]
        };
        const proxyRequestBody = { endpoint: targetGoogleApiUrl, ...googleApiPayload };

        try {
            outputCorrectedTextarea.value = 'Sending request...';
            const response = await fetch(PROXY_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(proxyRequestBody) });
            outputCorrectedTextarea.value = 'Waiting for AI response...';
            const data = await response.json();
            outputCorrectedTextarea.value = 'Processing response...';

            if (!response.ok) { /* ... same error handling ... */ console.error(`Proxy/API Error (${response.status}):`, data); const errorMsg = data?.error?.message || data?.message || `Request failed: ${response.status}`; let userFriendlyError = errorMsg; if (errorMsg.includes("API key not valid")) userFriendlyError = "Invalid Google AI API Key provided."; else if (response.status === 400 && errorMsg.includes("triggering safety filters")) userFriendlyError = `Request blocked by safety filter: ${errorMsg}`; else if (response.status === 429) userFriendlyError = "API Rate Limit Exceeded."; else if (response.status >= 500) userFriendlyError = "Proxy or Google AI Service Error."; else userFriendlyError = `Error (${response.status}): ${errorMsg}`; throw new Error(userFriendlyError); }

            let correctedText = "";
            let explanationText = ""; // Variable to hold explanations
            const candidate = data.candidates?.[0];

            if (candidate) {
                 if (candidate.finishReason && candidate.finishReason !== "STOP" && candidate.finishReason !== "MAX_TOKENS") { /* ... same finish reason check ... */ if (candidate.finishReason === "SAFETY") { const safetyReason = candidate.safetyRatings?.find(r => r.blocked)?.category || "Unknown"; throw new Error(`Correction stopped due to safety concerns (${safetyReason}).`); } else { throw new Error(`Correction stopped unexpectedly (${candidate.finishReason}).`); } }

                 const fullResponseText = candidate.content?.parts?.[0]?.text || "";

                 // --- PARSE RESPONSE ---
                 if (explainCorrections && fullResponseText.includes(CORRECTED_TEXT_DELIMITER) && fullResponseText.includes(EXPLANATIONS_DELIMITER)) {
                     const textStartIndex = fullResponseText.indexOf(CORRECTED_TEXT_DELIMITER) + CORRECTED_TEXT_DELIMITER.length;
                     const explanationStartIndex = fullResponseText.indexOf(EXPLANATIONS_DELIMITER); // Find start of explanations

                     if (textStartIndex > -1 && explanationStartIndex > -1 && explanationStartIndex > textStartIndex) {
                         correctedText = fullResponseText.substring(textStartIndex, explanationStartIndex).trim();
                         explanationText = fullResponseText.substring(explanationStartIndex + EXPLANATIONS_DELIMITER.length).trim();
                         console.log("Parsed Explanations:\n", explanationText);
                     } else {
                         // Delimiters found but in wrong order or incomplete
                         console.warn("Could not parse explanation structure, delimiters found out of order or incomplete. Using full response as text.");
                         correctedText = fullResponseText.trim();
                         explanationText = ""; // Clear explanation if parsing failed
                         showError("Note: Could not parse explanations from the AI response structure."); // Inform user
                     }
                 } else if (explainCorrections) {
                    // Requested explanations but delimiters weren't found
                    console.warn("Requested explanations, but delimiters not found in response. Using full response as text.");
                    correctedText = fullResponseText.trim();
                    explanationText = "";
                    showError("Note: AI did not provide explanations in the expected format."); // Inform user
                 }
                 else {
                     // Explanations not requested, use the whole text
                     correctedText = fullResponseText.trim();
                     explanationText = "";
                 }
                 // --- END PARSE RESPONSE ---

            } else if (data.promptFeedback?.blockReason) { /* ... same block reason handling ... */ throw new Error(`Request blocked before generation: ${data.promptFeedback.blockReason}`); }
            else { /* ... same unexpected structure handling ... */ console.error("Unexpected API response structure:", data); throw new Error("Could not extract corrected text (unexpected format)."); }

            // Update UI on Success
            outputCorrectedTextarea.value = correctedText;
            setTextareaDirection(outputCorrectedTextarea);
            autoResizeTextarea(outputCorrectedTextarea);
            displayReadability(outputReadability, correctedText);
            outputDiffView.innerHTML = createDiffHtml(textToCheck, correctedText);
            outputDiffContent.dir = inputDirection;
            copyBtn.disabled = !correctedText;

            // Display explanations if available
            if (explanationText) {
                displayExplanations(explanationText);
            } else {
                hideExplanations();
            }
            // Removed addToHistory call

        } catch (error) {
            /* ... same error handling ... */
            console.error("Error during grammar check:", error);
            showError(`An error occurred: ${error.message}`);
            outputCorrectedTextarea.value = "Error retrieving correction.";
            setTextareaDirection(outputCorrectedTextarea);
            autoResizeTextarea(outputCorrectedTextarea);
            outputReadability.textContent = 'Readability: --';
            outputDiffView.innerHTML = `<span style="color: var(--error-color);">Could not generate diff view due to error.</span>`;
            outputDiffContent.dir = inputDirection;
            copyBtn.disabled = true;
            hideExplanations(); // Hide explanations on error
        } finally {
            checkBtn.classList.remove('loading');
            validateForm();
        }
    }

    // Add form submit listener
    if (checkForm) checkForm.addEventListener('submit', handleGrammarCheck);
    else console.error("Check form element not found!");

    // --- Initial UI State Setup ---
    // Removed loadHistory() call
    updateInputStats();
    setTextareaDirection(outputCorrectedTextarea);
    autoResizeTextarea(inputText);
    autoResizeTextarea(outputCorrectedTextarea);
    if(outputDiffContent && inputText) outputDiffContent.dir = inputText.dir || 'ltr';
    if (outputReadability) outputReadability.textContent = 'Readability: --';
    hideExplanations(); // Ensure explanations are hidden initially

    console.log("Enhanced Grammar Checker PWA Initialized (Proxy, Formality, Conciseness, Explanations).");

})(); // End IIFE
