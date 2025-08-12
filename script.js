document.addEventListener('DOMContentLoaded', () => {
    // --- Element Selectors ---
    const getEl = (id) => document.getElementById(id);
    const inputText = getEl('input-text');
    const inputStats = getEl('input-stats');
    const checkBtn = getEl('check-btn');
    const checkBtnText = getEl('check-btn-text');
    const spinner = getEl('spinner');
    const clearInputBtn = getEl('clear-input-btn');
    const resultsCard = getEl('results-card');
    const messageArea = getEl('message-area');
    const outputCorrected = getEl('output-corrected');
    const outputDiff = getEl('output-diff');
    const copyOutputBtn = getEl('copy-output-btn');
    const explanationArea = getEl('explanation-area');
    const explanationList = getEl('explanation-list');
    const tabCorrected = getEl('tab-corrected');
    const tabDiff = getEl('tab-diff');
    const panelCorrected = getEl('panel-corrected');
    const panelDiff = getEl('panel-diff');
    const formalitySelect = getEl('formality-select');
    const concisenessCheck = getEl('conciseness-check');
    const explainCorrectionsCheck = getEl('explain-corrections-check');
    const themeToggle = getEl('theme-toggle');
    const settingsBtn = getEl('settings-btn');
    const settingsModal = getEl('settings-modal');
    const closeModalBtn = getEl('close-modal-btn');
    const apiKeyInput = getEl('api-key-input');
    const modalOverlay = settingsModal.querySelector('.modal-overlay');

    // --- Constants and State ---
    const API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';
    const MAX_CHARS = 5000;
    let apiKey = localStorage.getItem('googleApiKey') || '';

    // --- Core Functions ---
    const updateButtonState = () => {
        if (spinner.classList.contains('hidden')) {
            const hasText = inputText.value.trim().length > 0;
            const hasApiKey = apiKey.trim().length > 0;
            let btnText = "Check Text";
            let disabled = false;

            if (!hasApiKey) {
                btnText = "API Key Required";
                disabled = true;
            } else if (!hasText) {
                btnText = "Enter Text to Check";
                disabled = true;
            }
            checkBtnText.textContent = btnText;
            checkBtn.disabled = disabled;
        }
    };

    const showMessage = (message, type = 'danger') => {
        const colors = type === 'danger'
            ? 'bg-danger-50 text-danger-700 dark:bg-danger-900 dark:text-danger-100'
            : 'bg-success-50 text-success-700 dark:bg-success-900 dark:text-success-100';
        messageArea.innerHTML = `<div class="${colors} p-3 rounded-lg text-sm transition-all">${message}</div>`;
    };

    const setLoading = (isLoading) => {
        checkBtn.disabled = isLoading;
        spinner.classList.toggle('hidden', !isLoading);
        checkBtnText.textContent = isLoading ? 'Checking...' : 'Check Text';
        if (!isLoading) {
            updateButtonState();
        }
    };

    const applyTheme = (theme) => {
        const sunIcon = `<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>`;
        const moonIcon = `<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>`;
        document.documentElement.className = theme === 'dark' ? 'dark' : 'light';
        themeToggle.innerHTML = theme === 'dark' ? sunIcon : moonIcon;
    };

    // --- Main API Call Logic (FIXED PROMPT) ---
    const handleApiCheck = async () => {
        if (inputText.value.length > MAX_CHARS) {
            showMessage(`Text exceeds the maximum length of ${MAX_CHARS} characters.`);
            return;
        }
        setLoading(true);
        messageArea.innerHTML = '';
        resultsCard.classList.add('hidden');

        const text = inputText.value;
        const formality = formalitySelect.value;
        const makeConcise = concisenessCheck.checked;
        const explainCorrections = explainCorrectionsCheck.checked;

        // --- NEW, STRICTER PROMPT TO PREVENT TRANSLATION ---
        let prompt = `You are a strict proofreading assistant. Your only task is to correct grammar, spelling, and punctuation errors.

**CRITICAL RULES:**
1.  **DO NOT TRANSLATE.** You must respond in the exact same language as the original text provided below.
2.  Preserve the original meaning of the text. Do not add new ideas or remove essential information.
3.  Maintain original formatting like line breaks unless a correction requires it.

**OPTIONS:**`;

        if (formality !== 'general' || makeConcise) {
            if (formality !== 'general') {
                prompt += `\n- Adjust the tone for a '${formality}' style, but stay in the original language.`;
            }
            if (makeConcise) {
                prompt += `\n- Make the text more concise where possible without losing meaning.`;
            }
        } else {
            prompt += `\n- No special options selected. Perform standard corrections only.`;
        }

        prompt += "\n\n**OUTPUT FORMAT:**";
        if (explainCorrections) {
            prompt += `\nReturn a single, valid JSON object with two keys: "correctedText" (the corrected string) and "explanations" (an array of strings explaining the main changes).`;
        } else {
            prompt += `\nReturn ONLY the corrected text as a raw string, with no additional commentary or formatting.`;
        }
        prompt += `\n\n--- ORIGINAL TEXT TO CORRECT ---\n${text}`;
        // --- END OF NEW PROMPT ---

        try {
            const response = await fetch(`${API_ENDPOINT}?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.2,
                        maxOutputTokens: 4096,
                        responseMimeType: explainCorrections ? "application/json" : "text/plain",
                    }
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error?.message || `Request failed with status: ${response.status}`);
            }

            const responseData = await response.json();
            const resultText = responseData.candidates[0].content.parts[0].text;
            let correctedText = "";
            let explanations = [];

            if (explainCorrections) {
                const jsonResult = JSON.parse(resultText);
                correctedText = jsonResult.correctedText || "";
                explanations = jsonResult.explanations || [];
            } else {
                correctedText = resultText;
            }

            outputCorrected.textContent = correctedText;
            outputDiff.innerHTML = '';
            const diff = Diff.diffWords(text, correctedText);
            const fragment = document.createDocumentFragment();
            diff.forEach(part => {
                const el = document.createElement(part.added ? 'ins' : part.removed ? 'del' : 'span');
                el.appendChild(document.createTextNode(part.value));
                fragment.appendChild(el);
            });
            outputDiff.appendChild(fragment);

            if (explainCorrections && explanations.length > 0) {
                explanationList.innerHTML = explanations.map(item => `<li>${item.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</li>`).join('');
                explanationArea.classList.remove('hidden');
            } else {
                explanationArea.classList.add('hidden');
            }
            resultsCard.classList.remove('hidden');
            showMessage('Check complete!', 'success');
        } catch (error) {
            console.error('Error:', error);
            let userMessage = `An error occurred: ${error.message}. Please check your API key and try again.`;
            if (error instanceof SyntaxError) {
                userMessage = "The AI returned an invalid response. Please try again.";
            }
            showMessage(userMessage);
        } finally {
            setLoading(false);
        }
    };

    // --- Initialization and Event Listeners ---
    function init() {
        const openModal = () => settingsModal.classList.remove('hidden');
        const closeModal = () => {
            const newApiKey = apiKeyInput.value.trim();
            if (newApiKey) {
                localStorage.setItem('googleApiKey', newApiKey);
                apiKey = newApiKey;
            }
            settingsModal.classList.add('hidden');
            updateButtonState();
        };
        settingsBtn.addEventListener('click', openModal);
        closeModalBtn.addEventListener('click', closeModal);
        modalOverlay.addEventListener('click', closeModal);

        themeToggle.addEventListener('click', () => {
            const isDark = document.documentElement.classList.contains('dark');
            const newTheme = isDark ? 'light' : 'dark';
            localStorage.setItem('theme', newTheme);
            applyTheme(newTheme);
        });

        inputText.addEventListener('input', () => {
            const charCount = inputText.value.length;
            inputStats.textContent = `${charCount} / ${MAX_CHARS} characters`;
            inputStats.classList.toggle('text-red-500', charCount > MAX_CHARS);
            clearInputBtn.disabled = charCount === 0;
            updateButtonState();
        });

        clearInputBtn.addEventListener('click', () => {
            inputText.value = '';
            resultsCard.classList.add('hidden');
            messageArea.innerHTML = '';
            inputText.dispatchEvent(new Event('input'));
        });

        const switchTab = (activeTab) => {
            const isCorrected = activeTab === 'corrected';
            panelCorrected.classList.toggle('hidden', !isCorrected);
            panelDiff.classList.toggle('hidden', isCorrected);
            tabCorrected.classList.toggle('border-primary-500', isCorrected);
            tabCorrected.classList.toggle('text-primary-600', isCorrected);
            tabCorrected.classList.toggle('border-transparent', !isCorrected);
            tabCorrected.classList.toggle('text-gray-500', !isCorrected);
            tabDiff.classList.toggle('border-primary-500', !isCorrected);
            tabDiff.classList.toggle('text-primary-600', !isCorrected);
            tabDiff.classList.toggle('border-transparent', isCorrected);
            tabDiff.classList.toggle('text-gray-500', isCorrected);
        };
        tabCorrected.addEventListener('click', () => switchTab('corrected'));
        tabDiff.addEventListener('click', () => switchTab('diff'));

        checkBtn.addEventListener('click', handleApiCheck);

        copyOutputBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(outputCorrected.textContent).then(() => {
                const originalTitle = copyOutputBtn.title;
                copyOutputBtn.title = 'Copied!';
                setTimeout(() => { copyOutputBtn.title = originalTitle; }, 2000);
            });
        });

        const initialTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        applyTheme(initialTheme);
        apiKeyInput.value = apiKey;
        updateButtonState();
        inputText.dispatchEvent(new Event('input'));

        if (!apiKey) {
            showMessage('Welcome! Please enter your Google AI API key in the settings to get started.');
        }
    }

    // Run the application
    init();
});