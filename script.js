(() => { // IIFE to avoid polluting global scope
    // --- DOM Elements ---
    const checkForm = document.getElementById('check-form');
    const inputText = document.getElementById('input-text');
    const outputCorrectedTextarea = document.getElementById('output-corrected');
    const outputDiffView = document.getElementById('output-diff');
    const charCounter = document.getElementById('char-counter');
    const apiKeyInput = document.getElementById('api-key');
    const modelSelect = document.getElementById('model');
    const errorDiv = document.getElementById('error');
    const checkBtn = document.getElementById('check-btn');
    const copyBtn = document.getElementById('copy-btn');
    const themeToggleBtn = document.getElementById('theme-toggle');
    const togglePasswordBtn = document.getElementById('toggle-password-btn');
    const eyeIconOpen = document.getElementById('eye-icon-open'); // SVG Icon
    const eyeIconClosed = document.getElementById('eye-icon-closed'); // SVG Icon
    const saveApiKeyCheckbox = document.getElementById('save-api-key-checkbox');
    const saveModelCheckbox = document.getElementById('save-model-checkbox');
    const currentYearSpan = document.getElementById('current-year');
    const htmlElement = document.documentElement;
    const tabCorrected = document.getElementById('tab-corrected');
    const tabDiff = document.getElementById('tab-diff');
    const outputCorrectedContent = document.getElementById('output-corrected-content');
    const outputDiffContent = document.getElementById('output-diff-content'); // Div containing the diff view

    // --- Constants & Config ---
    const MAX_CHARS = 5000;
    const LS_PREFIX = 'EnhancedGrammarChecker_';
    const LS_API_KEY = LS_PREFIX + 'APIKey';
    const LS_MODEL = LS_PREFIX + 'Model';
    const LS_THEME = LS_PREFIX + 'Theme';
    const DEFAULT_MODEL = 'gemini-1.5-flash-latest';
    const PROXY_URL = 'https://middleman.yebekhe.workers.dev'; // <-- Your Proxy URL
    // Regex to check if the first non-whitespace character is in a common RTL script block
    const RTL_CHAR_REGEX = /^[\u0600-\u06FF\u0590-\u05FF]/; // Arabic and Hebrew ranges
    // API Key is loaded from storage or input
    let GEMINI_API_KEY = "";

    // --- Initial Setup ---
    if (currentYearSpan) currentYearSpan.textContent = new Date().getFullYear();

    // --- PWA Service Worker Registration ---
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js', { scope: '/' })
                .then(registration => console.log('ServiceWorker registration successful with scope: ', registration.scope))
                .catch(error => console.log('ServiceWorker registration failed: ', error));
        });
    }

    // --- Helper Function for Direction ---
    function setTextareaDirection(element) { // Renamed to handle both textarea and div
        if (!element) return;
        let text = "";
        if(element.tagName === 'TEXTAREA') {
            text = element.value.trimStart();
        } else if (element.tagName === 'DIV') {
             // For DIV, direction logic might be simpler or based on input
             // For now, we'll set it directly in handleGrammarCheck based on input
            return; // Handled elsewhere for DIV
        } else {
            return; // Only handle TEXTAREA here
        }

        if (text && RTL_CHAR_REGEX.test(text[0])) {
            element.dir = 'rtl';
        } else {
            element.dir = 'ltr';
        }
    }

    // --- Theme Handling ---
    // ... (Theme functions remain the same - applyTheme, toggleTheme, listeners) ...
    function applyTheme(theme) {
        htmlElement.classList.toggle('dark-mode', theme === 'dark');
        themeToggleBtn.textContent = theme === 'dark' ? '🌙' : '☀️';
        themeToggleBtn.title = `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`;
        try {
            const primaryColor = getComputedStyle(htmlElement).getPropertyValue('--primary-color').trim();
            document.querySelector('meta[name="theme-color"]').setAttribute('content', primaryColor);
            const rgbMatch = primaryColor.match(/(\d+),\s*(\d+),\s*(\d+)/);
             if(rgbMatch) {
                 const rgb = `${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}`;
                 htmlElement.style.setProperty('--primary-color-rgb', rgb);
             } else {
                 console.warn("Could not parse primary color for RGB variable", primaryColor);
             }
        } catch (e) {
            console.error("Error applying theme colors:", e);
        }
    }
    function toggleTheme() {
        const newTheme = htmlElement.classList.contains('dark-mode') ? 'light' : 'dark';
        localStorage.setItem(LS_THEME, newTheme);
        applyTheme(newTheme);
    }
    const savedTheme = localStorage.getItem(LS_THEME);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(savedTheme || (prefersDark ? 'dark' : 'light'));
    themeToggleBtn.addEventListener('click', toggleTheme);
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        if (!localStorage.getItem(LS_THEME)) applyTheme(e.matches ? 'dark' : 'light');
    });


    // --- API Key Visibility ---
    // ... (togglePasswordVisibility function and initial state check remain the same) ...
    function togglePasswordVisibility() {
         const isPassword = apiKeyInput.type === 'password';
         apiKeyInput.type = isPassword ? 'text' : 'password';
         if (eyeIconOpen && eyeIconClosed) {
            eyeIconOpen.style.display = isPassword ? 'block' : 'none';
            eyeIconClosed.style.display = isPassword ? 'none' : 'block';
         }
    }
    if (apiKeyInput.type === 'text') {
        if(eyeIconOpen) eyeIconOpen.style.display = 'block';
        if(eyeIconClosed) eyeIconClosed.style.display = 'none';
    } else {
        if(eyeIconOpen) eyeIconOpen.style.display = 'none';
        if(eyeIconClosed) eyeIconClosed.style.display = 'block';
    }
    if(togglePasswordBtn) {
      togglePasswordBtn.addEventListener('click', togglePasswordVisibility);
    }


    // --- Input Validation & Char Counter ---
    // ... (validateForm and updateCharCounter functions remain the same) ...
    function validateForm() {
        const text = inputText ? inputText.value.trim() : '';
        const key = apiKeyInput ? apiKeyInput.value.trim() : '';
        const isValid = text.length > 0 && text.length <= MAX_CHARS && key.length > 0;
        if (checkBtn) checkBtn.disabled = !isValid;
        return isValid;
    }
    function updateCharCounter() {
         if (!inputText || !charCounter) return;
         const len = inputText.value.length;
         charCounter.textContent = `${len} / ${MAX_CHARS}`;
         charCounter.classList.toggle('limit-exceeded', len > MAX_CHARS);
         setTextareaDirection(inputText);
         validateForm();
    }
    if(inputText) inputText.addEventListener('input', updateCharCounter);
    if(apiKeyInput) apiKeyInput.addEventListener('input', validateForm);

    // --- Settings Persistence ---
    // ... (saveSetting, removeSetting, loadSetting functions and listeners remain the same) ...
    function saveSetting(key, value) { try { localStorage.setItem(key, value); } catch(e) { console.warn("LocalStorage Save Error:", e); } }
    function removeSetting(key) { try { localStorage.removeItem(key); } catch(e) { console.warn("LocalStorage Remove Error:", e); } }
    function loadSetting(key, element, defaultValue = '', isCheckbox = false) {
        if (!element) return false;
        try {
            const savedValue = localStorage.getItem(key);
            if (savedValue !== null) {
                if (isCheckbox) element.checked = (savedValue === 'true');
                else if (element.tagName === 'SELECT') {
                    if ([...element.options].some(opt => opt.value === savedValue)) element.value = savedValue;
                     else { removeSetting(key); if (defaultValue) element.value = defaultValue; return false; }
                } else if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') element.value = savedValue;
                else return false;
                return true;
            } else if (defaultValue && !isCheckbox && (element.tagName === 'SELECT' || element.tagName === 'INPUT' || element.tagName === 'TEXTAREA')) {
                 element.value = defaultValue; // Set default for inputs/select if no saved value
            }
        } catch(e) { console.warn("LocalStorage Load Error:", e); if (defaultValue && !isCheckbox && (element.tagName === 'SELECT' || element.tagName === 'INPUT' || element.tagName === 'TEXTAREA')) element.value = defaultValue; }
        return false;
    }
    // Load saved settings
    const keyLoaded = loadSetting(LS_API_KEY, apiKeyInput); if (keyLoaded && saveApiKeyCheckbox) saveApiKeyCheckbox.checked = true;
    const modelLoaded = loadSetting(LS_MODEL, modelSelect, DEFAULT_MODEL); if (modelLoaded && saveModelCheckbox) saveModelCheckbox.checked = true;
    // Add listeners for saving settings
     if (saveApiKeyCheckbox) saveApiKeyCheckbox.addEventListener('change', () => { if (saveApiKeyCheckbox.checked) { if (apiKeyInput) saveSetting(LS_API_KEY, apiKeyInput.value); } else { removeSetting(LS_API_KEY); } });
     if (apiKeyInput) apiKeyInput.addEventListener('input', () => { if (saveApiKeyCheckbox && saveApiKeyCheckbox.checked) saveSetting(LS_API_KEY, apiKeyInput.value); });
     if (saveModelCheckbox) saveModelCheckbox.addEventListener('change', () => { if (saveModelCheckbox.checked) { if (modelSelect) saveSetting(LS_MODEL, modelSelect.value); } else { removeSetting(LS_MODEL); } });
     if (modelSelect) modelSelect.addEventListener('change', () => { if (saveModelCheckbox && saveModelCheckbox.checked) saveSetting(LS_MODEL, modelSelect.value); });

    // --- Tab Switching ---
    // ... (switchTab function and listeners remain the same) ...
    function switchTab(targetTab) {
        const isActiveCorrected = targetTab === tabCorrected;
        if(tabCorrected) { tabCorrected.classList.toggle('active', isActiveCorrected); tabCorrected.setAttribute('aria-selected', isActiveCorrected); }
        if(tabDiff) { tabDiff.classList.toggle('active', !isActiveCorrected); tabDiff.setAttribute('aria-selected', !isActiveCorrected); }
        if(outputCorrectedContent) outputCorrectedContent.classList.toggle('active', isActiveCorrected);
        if(outputDiffContent) outputDiffContent.classList.toggle('active', !isActiveCorrected);
    }
    if(tabCorrected) tabCorrected.addEventListener('click', () => switchTab(tabCorrected));
    if(tabDiff) tabDiff.addEventListener('click', () => switchTab(tabDiff));

    // --- Copy Output ---
    // ... (copyOutput function and listener remain the same) ...
     function copyOutput() {
         if (!outputCorrectedTextarea || !copyBtn) return;
         const textToCopy = outputCorrectedTextarea.value;
         if (textToCopy && navigator.clipboard) {
             navigator.clipboard.writeText(textToCopy).then(() => {
                 copyBtn.textContent = 'Copied!'; copyBtn.disabled = true;
                 setTimeout(() => { copyBtn.textContent = 'Copy'; copyBtn.disabled = !outputCorrectedTextarea.value; }, 2000);
             }).catch(err => { console.error('Copy failed:', err); showError('Failed to copy text.'); });
         } else if (!navigator.clipboard) { showError('Clipboard API not available.'); }
    }
    if(copyBtn) copyBtn.addEventListener('click', copyOutput);

     // --- Show/Hide Error ---
    // ... (showError function remains the same) ...
     function showError(message) {
        if (!errorDiv) return;
        errorDiv.textContent = message || '';
        errorDiv.classList.toggle('visible', !!message);
    }

    // --- Generate Diff HTML ---
    // ... (createDiffHtml function remains the same) ...
     function createDiffHtml(original, corrected) {
        if (typeof Diff === 'undefined' || !Diff || typeof Diff.diffWords !== 'function') { console.error("jsdiff library (Diff object) is not available!"); return '<span style="color: var(--error-color);">Error: Diff library not loaded. Cannot show changes.</span>'; }
        try {
            const diff = Diff.diffWords(original, corrected); let html = '';
            diff.forEach((part) => { const value = part.value.replace(/</g, "<").replace(/>/g, ">"); const valueWithBreaks = value.replace(/\n/g, '<br>');
                if (part.added) html += `<ins>${valueWithBreaks}</ins>`; else if (part.removed) html += `<del>${valueWithBreaks}</del>`; else html += `<span>${valueWithBreaks}</span>`; });
            return html;
        } catch (error) { console.error("Error during diff generation:", error); return `<span style="color: var(--error-color);">Error generating diff view: ${error.message}</span>`; }
    }


    // --- Grammar Check API Call (MODIFIED TO USE PROXY) ---
    async function handleGrammarCheck(event) {
        event.preventDefault();

        // --- UI & Validation Setup ---
        if (!checkBtn || !copyBtn || !outputCorrectedTextarea || !outputDiffView || !outputDiffContent || !inputText || !apiKeyInput) {
            console.error("Essential UI elements missing for grammar check."); showError("UI Error: Cannot perform check."); return;
        }
        if (!validateForm()) { showError('Please enter text (up to 5000 chars) and your API key.'); return; }

        showError(''); checkBtn.disabled = true; checkBtn.classList.add('loading');
        copyBtn.disabled = true; outputCorrectedTextarea.value = 'Checking...';
        outputDiffView.innerHTML = 'Checking...';
        setTextareaDirection(outputCorrectedTextarea);
        const inputDirection = inputText.dir || 'ltr'; // Get input direction
        outputDiffContent.dir = inputDirection; // Set initial diff direction

        // --- API & Proxy Setup ---
        GEMINI_API_KEY = apiKeyInput.value.trim();
        if (!GEMINI_API_KEY) { showError("API Key is missing."); checkBtn.classList.remove('loading'); validateForm(); return; }

        const textToCheck = inputText.value;
        const selectedModel = modelSelect ? modelSelect.value : DEFAULT_MODEL;
        // Construct the *TARGET* Google API URL (as required by the proxy)
        const targetGoogleApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${GEMINI_API_KEY}`;

        // --- Prepare Request Body for Proxy ---
        const googleApiPayload = {
            contents: [{ role: "user", parts: [{ text: `Please proofread and correct the following text for grammar, spelling, and punctuation errors.\nStrictly preserve the original formatting, including line breaks, paragraph structure, and indentation, as much as possible.\nOnly return the corrected text, without any conversational introductions, explanations, apologies, or concluding remarks like "Here is the corrected text:".\n\n--- START TEXT ---\n${textToCheck}\n--- END TEXT ---` }] }],
            generationConfig: { temperature: 0.2, response_mime_type: "text/plain" },
            safetySettings: [
                 { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }, { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                 { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }, { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
            ]
        };

        // Body for the PROXY includes the target endpoint and the Google payload
        const proxyRequestBody = {
            endpoint: targetGoogleApiUrl,
            ...googleApiPayload // Spread the Google API payload into the proxy request body
        };

        // --- Fetch via Proxy ---
        try {
            console.log("Sending request via proxy:", PROXY_URL);
            const response = await fetch(PROXY_URL, { // <-- Target the PROXY URL
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(proxyRequestBody), // <-- Send the combined body
            });

            // The rest of the response handling remains the same, as the proxy
            // should forward Google's response status and body.
            const data = await response.json();

            if (!response.ok) {
                console.error(`Proxy/API Error Response (${response.status}):`, data);
                const errorMsg = data?.error?.message || data?.message || `Request failed: ${response.status} ${response.statusText}`; // Look for 'message' too from proxy errors
                let userFriendlyError = errorMsg;
                 if (errorMsg.includes("API key not valid")) userFriendlyError = "Invalid Google AI API Key provided.";
                 else if (response.status === 400 && errorMsg.includes("triggering safety filters")) userFriendlyError = `Request blocked by safety filter: ${errorMsg}`;
                 else if (response.status === 429) userFriendlyError = "API Rate Limit Exceeded. Please wait and try again.";
                 else if (response.status >= 500) userFriendlyError = "Proxy or Google AI Service Error. Please try again later.";
                 else userFriendlyError = `Error (${response.status}): ${errorMsg}`;
                throw new Error(userFriendlyError);
            }

            // --- Process Successful Response ---
            let correctedText = "";
            const candidate = data.candidates?.[0];
             if (candidate) {
                 if (candidate.finishReason && candidate.finishReason !== "STOP" && candidate.finishReason !== "MAX_TOKENS") {
                     if (candidate.finishReason === "SAFETY") { const safetyReason = candidate.safetyRatings?.find(r => r.blocked)?.category || "Unknown"; throw new Error(`Correction stopped due to safety concerns (${safetyReason}).`); }
                     else { throw new Error(`Correction stopped unexpectedly (${candidate.finishReason}).`); }
                 }
                 correctedText = candidate.content?.parts?.[0]?.text?.trim() || "";
             } else if (data.promptFeedback?.blockReason) { throw new Error(`Request blocked before generation: ${data.promptFeedback.blockReason}`); }
             else { console.error("Unexpected API response structure via proxy:", data); throw new Error("Could not extract corrected text from API response (unexpected format)."); }

            // --- Update UI ---
            if (correctedText) {
                outputCorrectedTextarea.value = correctedText;
                setTextareaDirection(outputCorrectedTextarea);
                outputDiffView.innerHTML = createDiffHtml(textToCheck, correctedText);
                outputDiffContent.dir = inputDirection; // Set diff view direction
                copyBtn.disabled = false;
            } else {
                 outputCorrectedTextarea.value = (textToCheck === correctedText) ? "No corrections detected." : "Received empty correction from API.";
                 setTextareaDirection(outputCorrectedTextarea);
                 outputDiffView.innerHTML = "<span>No changes detected or empty response received.</span>";
                 outputDiffContent.dir = inputDirection; // Set diff view direction
                 copyBtn.disabled = true;
            }

        } catch (error) {
            // --- Handle Fetch/Processing Errors ---
            console.error("Error during grammar check via proxy:", error);
            showError(`An error occurred: ${error.message}`);
            outputCorrectedTextarea.value = "Error retrieving correction.";
            setTextareaDirection(outputCorrectedTextarea);
            outputDiffView.innerHTML = `<span style="color: var(--error-color);">Could not generate diff view due to error.</span>`;
            outputDiffContent.dir = inputDirection; // Set diff direction even on error
            copyBtn.disabled = true;
        } finally {
            // --- Cleanup ---
            checkBtn.classList.remove('loading');
            validateForm();
        }
    }

    // --- Add Form Submit Listener ---
    if (checkForm) {
        checkForm.addEventListener('submit', handleGrammarCheck);
    } else {
        console.error("Check form element not found!");
    }

    // --- Initial UI State Setup ---
    updateCharCounter(); // Set initial counter, direction, validation
    setTextareaDirection(outputCorrectedTextarea); // Set initial output direction
    if(outputDiffContent && inputText) outputDiffContent.dir = inputText.dir || 'ltr'; // Set initial diff view direction

    console.log("Enhanced Grammar Checker PWA Initialized (Proxy Mode).");

})(); // End IIFE