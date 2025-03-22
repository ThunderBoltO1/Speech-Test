// Configuration
const CLIENT_ID = '271962080875-dr9uild15rad3n86816nmfq5ms7mj95o.apps.googleusercontent.com';
const REDIRECT_URI = 'https://speech-test-nine.vercel.app';
const SPREADSHEET_ID = '1XuZ7o1fcZ6Y01buC6J9Aep_tU7H9XFLt8ZUVPPrp340';
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';
const CATEGORY_SHEETS = {
    'ทั่วไป': 'Sheet1',
    'ความต้องการ': 'Sheet2',
    'คลัง': 'Sheet3'
};

// State
let accessToken = null;
let tokenExpiry = null;
let currentCategory = 'ทั่วไป';
let selectedWords = [];

// DOM Elements
const elements = {
    modal: document.getElementById('modal'),
    mixModal: document.getElementById('mix-modal'),
    buttonContainer: document.getElementById('button-container'),
    wordButtonsContainer: document.getElementById('word-buttons-container'),
    selectedWordsContainer: document.getElementById('selected-words-container'),
    mixResult: document.getElementById('mix-result'),
    newWordInput: document.getElementById('new-word-input')
};

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.category-button').forEach(button => {
        button.addEventListener('click', () => setCategory(button.dataset.category));
    });
    
    document.getElementById('btn-add').addEventListener('click', openModal);
    document.getElementById('btn-mix').addEventListener('click', openMixModal);
    
    handleAuthResponse();
});

// Authentication Functions
function handleAuthResponse() {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    
    if (hashParams.has('access_token')) {
        processTokenResponse(hashParams);
    } else {
        checkLocalStorageToken();
    }
}

function processTokenResponse(params) {
    const storedState = localStorage.getItem('oauth_state');
    const state = params.get('state');
    
    if (state !== storedState) {
        showError('การตรวจสอบความปลอดภัยล้มเหลว');
        return;
    }
    
    accessToken = params.get('access_token');
    const expiresIn = parseInt(params.get('expires_in')) * 1000;
    tokenExpiry = Date.now() + expiresIn;
    
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('token_expiry', tokenExpiry);
    
    window.history.replaceState({}, document.title, window.location.pathname);
    loadInitialData();
}

function checkLocalStorageToken() {
    const token = localStorage.getItem('access_token');
    const expiry = localStorage.getItem('token_expiry');
    
    if (token && expiry && Date.now() < expiry) {
        accessToken = token;
        loadInitialData();
    } else {
        startOAuthFlow();
    }
}

function startOAuthFlow() {
    const state = Math.random().toString(36).substr(2);
    localStorage.setItem('oauth_state', state);
    
    const authUrl = new URL('https://accounts.google.com/o/oauth2/auth');
    authUrl.searchParams.set('client_id', CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.set('response_type', 'token');
    authUrl.searchParams.set('scope', SCOPES);
    authUrl.searchParams.set('state', state);
    
    window.location.href = authUrl;
}

// Data Functions
async function loadInitialData() {
    try {
        await loadCategoryData();
        await loadWordsForMixing();
    } catch (error) {
        showError('ไม่สามารถโหลดข้อมูลเริ่มต้นได้');
    }
}

async function loadCategoryData() {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${CATEGORY_SHEETS[currentCategory]}?majorDimension=COLUMNS`;
    
    const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    
    const data = await response.json();
    renderButtons(data.values[0]);
}

function renderButtons(words = []) {
    elements.buttonContainer.innerHTML = words.map(word => `
        <button class="word-button bg-blue-500 text-white px-4 py-2 rounded m-2 hover:bg-blue-600 transition-all"
                data-word="${word}"
                onclick="speakText('${word}')">
            ${word}
        </button>
    `).join('');
}

async function loadWordsForMixing() {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${CATEGORY_SHEETS[currentCategory]}?majorDimension=COLUMNS`;
    
    const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    
    const data = await response.json();
    renderWordSelectionButtons(data.values[0]);
}

function renderWordSelectionButtons(words = []) {
    elements.wordButtonsContainer.innerHTML = words.map(word => `
        <button class="word-select-button px-4 py-2 rounded m-1 transition-all 
                    ${selectedWords.includes(word) ? 'bg-green-500' : 'bg-blue-500'} 
                    hover:bg-blue-600 text-white"
                onclick="toggleWordSelection('${word}')">
            ${word}
        </button>
    `).join('');
}

// UI Functions
function setCategory(category) {
    currentCategory = category;
    selectedWords = [];
    updateSelectionUI();
    loadCategoryData();
}

function toggleWordSelection(word) {
    const index = selectedWords.indexOf(word);
    
    if (index > -1) {
        selectedWords.splice(index, 1);
    } else {
        selectedWords.push(word);
    }
    
    updateSelectionUI();
}

function updateSelectionUI() {
    renderWordSelectionButtons();
    elements.selectedWordsContainer.innerHTML = selectedWords.map(word => `
        <span class="selected-word bg-green-500 text-white px-2 py-1 rounded m-1">
            ${word}
            <button class="ml-2 hover:text-gray-200" onclick="toggleWordSelection('${word}')">&times;</button>
        </span>
    `).join('');
}

// Speech Functions
function speakText(text) {
    responsiveVoice.speak(text, "Thai Female", {
        onstart: () => highlightSpeakingButton(text),
        onend: () => removeSpeakingHighlight()
    });
}

function highlightSpeakingButton(text) {
    document.querySelectorAll('.word-button').forEach(button => {
        if (button.dataset.word === text) {
            button.classList.add('ring-4', 'ring-blue-300');
        }
    });
}

function removeSpeakingHighlight() {
    document.querySelectorAll('.word-button').forEach(button => {
        button.classList.remove('ring-4', 'ring-blue-300');
    });
}

// Modal Functions
function openModal() {
    elements.modal.classList.remove('hidden');
}

function closeModal() {
    elements.modal.classList.add('hidden');
    elements.newWordInput.value = '';
}

function openMixModal() {
    elements.mixModal.classList.remove('hidden');
}

function closeMixModal() {
    elements.mixModal.classList.add('hidden');
}

// Error Handling
function showError(message) {
    const errorToast = document.createElement('div');
    errorToast.className = 'fixed bottom-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg';
    errorToast.textContent = message;
    
    document.body.appendChild(errorToast);
    
    setTimeout(() => {
        errorToast.remove();
    }, 5000);
}

// Initialize
if (typeof responsiveVoice !== 'undefined') {
    responsiveVoice.setDefaultVoice("Thai Female");
}