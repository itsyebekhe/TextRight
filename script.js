document.addEventListener('DOMContentLoaded', () => {
    // Helper function to get elements by ID
    const getEl = (id) => document.getElementById(id);

    // --- DOM Element References ---
    const checkForm = getEl('check-form');
    const apiKeyInput = getEl('api-key');
    const inputTextarea = getEl('input-text');
    const outputCorrectedTextarea = getEl('output-corrected');
    const outputDiffDiv = getEl('output-diff');
    const checkBtn = getEl('check-btn');
    const checkBtnText = getEl('check-btn-text');
    const spinner = checkBtn.querySelector('.spinner');

    // Buttons
    const copyInputBtn = getEl('copy-input-btn');
    const clearInputBtn = getEl('clear-input-btn');
    const copyCorrectedBtn = getEl('copy-btn');
    const themeToggleBtn = getEl('theme-toggle');
    const togglePasswordBtn = getEl('toggle-password-btn');

    // Icons for password visibility
    const eyeIconOpen = getEl('eye-icon-open');
    const eyeIconClosed = getEl('eye-icon-closed');
    
    // Tabs
    const tabCorrected = getEl('tab-corrected');
    const tabDiff = getEl('tab-diff');
    const outputCorrectedContent = getEl('output-corrected-content');
    const outputDiffContent = getEl('output-diff-content');

    // Displays
    const inputStatsSpan = getEl('input-stats');
    const explanationArea = getEl('explanation-area');
    const explanationList = getEl('explanation-list');
    const errorMessageDiv = getEl('error-message');
    const successMessageDiv = getEl('success-message');

    // Checkboxes
    const saveApiKeyCheckbox = getEl('save-api-key-checkbox');
    const explainCorrectionsCheckbox = getEl('explain-corrections-check');

    // Gemini API Configuration
    const API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';

    // --- Utility Functions ---
    const showMessage = (element, message, isError = true) => {
        element.textContent = message;
        element.classList.remove('hidden');
        // Hide the other message type
        (isError ? successMessageDiv : errorMessageDiv).classList.add('hidden');
    };

    const hideMessages = () => {
        errorMessageDiv.classList.add('hidden');
        successMessageDiv.classList.add('hidden');
    };

    const setButtonState = (button, enabled) => {
        button.disabled = !enabled;
    };

    const setLoading = (isLoading) => {
        checkBtn.classList.toggle('loading', isLoading);
        spinner.classList.toggle('hidden', !isLoading);
        checkBtnText.textContent = isLoading ? 'Checking...' : 'Check Text';
        // Keep the button disabled while loading, let validateForm handle re-enabling
        setButtonState(checkBtn, !isLoading); 
        if (!isLoading) {
            validateForm(); // Re-validate to set correct button state after loading
        }
    };
    
    // --- Theme Management ---
    const applyTheme = (theme) => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
            getEl('theme-toggle').querySelector('.dark\\:hidden').classList.add('hidden');
            getEl('theme-toggle').querySelector('.dark\\:block').classList.remove('hidden');
        } else {
            document.documentElement.classList.remove('dark');
            getEl('theme-toggle').querySelector('.dark\\:hidden').classList.remove('hidden');
            getEl('theme-toggle').querySelector('.dark\\:block').classList.add('hidden');
        }
    };
    
    const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    applyTheme(savedTheme);

    themeToggleBtn.addEventListener('click', () => {
        const newTheme = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
    });

    // --- Local Storage for API Key ---
    if (localStorage.getItem('saveApiKey') === 'true') {
        apiKeyInput.value = localStorage.getItem('apiKey') || '';
        saveApiKeyCheckbox.checked = true;
    }

    saveApiKeyCheckbox.addEventListener('change', () => {
        localStorage.setItem('saveApiKey', String(saveApiKeyCheckbox.checked));
        if (saveApiKeyCheckbox.checked) {
            localStorage.setItem('apiKey', apiKeyInput.value);
        } else {
            localStorage.removeItem('apiKey');
        }
    });

    apiKeyInput.addEventListener('input', () => {
        if (saveApiKeyCheckbox.checked) {
            localStorage.setItem('apiKey', apiKeyInput.value);
        }
        validateForm();
    });

    // --- Input Text Area Logic ---
    const updateInputStats = () => {
        const text = inputTextarea.value;
        const charCount = text.length;
        const wordCount = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
        inputStatsSpan.textContent = `Words: ${wordCount} | Chars: ${charCount} / 5000`;
        setButtonState(clearInputBtn, charCount > 0);
        setButtonState(copyInputBtn, charCount > 0);
        validateForm();
    };

    inputTextarea.addEventListener('input', updateInputStats);

    // --- Button Logic ---
    const validateForm = () => {
        const hasText = inputTextarea.value.trim().length > 0;
        const hasApiKey = apiKeyInput.value.trim().length > 0;

        if (checkBtn.classList.contains('loading')) return; // Don't change state while loading

        if (!hasApiKey) {
            setButtonState(checkBtn, false);
            checkBtnText.textContent = 'Enter API Key';
        } else if (!hasText) {
            setButtonState(checkBtn, false);
            checkBtnText.textContent = 'Enter Text Above';
        } else {
            setButtonState(checkBtn, true);
            checkBtnText.textContent = 'Check Text';
        }
    };

    clearInputBtn.addEventListener('click', () => {
        inputTextarea.value = '';
        outputCorrectedTextarea.value = '';
        outputDiffDiv.innerHTML = '<div class="text-gray-500 dark:text-gray-400">Changes will be highlighted here...</div>';
        explanationArea.classList.add('hidden');
        hideMessages();
        setButtonState(copyCorrectedBtn, false);
        updateInputStats();
    });

    const showCopyFeedback = (button) => {
        const originalText = button.innerHTML;
        button.innerHTML = 'Copied!';
        setTimeout(() => {
            button.innerHTML = originalText;
        }, 2000);
    }
    
    copyInputBtn.addEventListener('click', () => navigator.clipboard.writeText(inputTextarea.value).then(() => showCopyFeedback(copyInputBtn)));
    copyCorrectedBtn.addEventListener('click', () => navigator.clipboard.writeText(outputCorrectedTextarea.value).then(() => showCopyFeedback(copyCorrectedBtn)));
    
    togglePasswordBtn.addEventListener('click', () => {
        const isPassword = apiKeyInput.type === 'password';
        apiKeyInput.type = isPassword ? 'text' : 'password';
        eyeIconOpen.classList.toggle('hidden', !isPassword);
        eyeIconClosed.classList.toggle('hidden', isPassword);
    });

    // --- Tab Switching Logic ---
    [tabCorrected, tabDiff].forEach(tab => {
        tab.addEventListener('click', (e) => {
            document.querySelector('.tab-btn.active').classList.remove('active');
            e.currentTarget.classList.add('active');
            
            document.querySelector('.output-content.active').classList.remove('active');
            const targetContentId = e.currentTarget.getAttribute('aria-controls');
            getEl(targetContentId).classList.add('active');
        });
    });

    // --- Main Form Submission ---
    checkForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideMessages();
        setLoading(true);

        const formData = new FormData(checkForm);
        const text = formData.get('text');
        const apiKey = formData.get('api_key');
        const formality = formData.get('formality');
        const makeConcise = formData.has('make_concise');
        const explainCorrections = formData.has('explain_corrections');

        let prompt = `You are an expert editor. Please correct the following text for grammar, spelling, and punctuation. Maintain the original meaning and tone.`;
        if (formality !== 'general') prompt += ` The target formality is ${formality}.`;
        if (makeConcise) prompt += ` Make the text more concise where possible without losing meaning.`;
        if (explainCorrections) {
            prompt += ` Return the result as a valid JSON object with two keys: "correctedText" (a string containing the full corrected text) and "explanations" (an array of strings, where each string is a brief explanation for a key change).`;
        } else {
            prompt += ` Just return the corrected text itself, with no extra formatting or explanation.`;
        }
        prompt += `\n\nOriginal Text:\n---\n${text}`;

        try {
            const response = await fetch(`${API_ENDPOINT}?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.3, maxOutputTokens: 4096, responseMimeType: "application/json" }
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const resultText = data.candidates[0].content.parts[0].text;
            
            let correctedText, explanations = [];

            if (explainCorrections) {
                const jsonResult = JSON.parse(resultText); // Directly parse, as we requested JSON mime type
                correctedText = jsonResult.correctedText || "";
                explanations = jsonResult.explanations || [];
            } else {
                correctedText = resultText;
            }

            outputCorrectedTextarea.value = correctedText;
            setButtonState(copyCorrectedBtn, correctedText.length > 0);
            showMessage(successMessageDiv, 'Text successfully checked!', false);
            
            // Generate and display diff
            const diff = Diff.diffWordsWithSpace(text, correctedText);
            const fragment = document.createDocumentFragment();
            diff.forEach(part => {
                const node = document.createElement(part.added ? 'ins' : part.removed ? 'del' : 'span');
                node.appendChild(document.createTextNode(part.value));
                fragment.appendChild(node);
            });
            outputDiffDiv.innerHTML = '';
            outputDiffDiv.appendChild(fragment);

            // Display explanations
            if (explainCorrections && explanations.length > 0) {
                explanationList.innerHTML = explanations.map(item => `<li class="text-gray-700 dark:text-gray-300">${item}</li>`).join('');
                explanationArea.classList.remove('hidden');
            } else {
                explanationArea.classList.add('hidden');
            }

        } catch (error) {
            console.error('Error:', error);
            let errorMessage = `An error occurred: ${error.message}.`;
            if (error instanceof SyntaxError) {
                 errorMessage += ' The AI response was not in the expected format. Try the request again.'
            }
            showMessage(errorMessageDiv, errorMessage);
        } finally {
            setLoading(false);
        }
    });
    
    // --- Keyboard Shortcut ---
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
             event.preventDefault();
             if (!checkBtn.disabled) {
                 checkBtn.click();
             }
        }
    });

    // --- Initial State Setup ---
    getEl('current-year').textContent = new Date().getFullYear();
    updateInputStats();
});