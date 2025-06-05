// Configuration
const CLIENT_ID = '271962080875-dr9uild15rad3n86816nmfq5ms7mj95o.apps.googleusercontent.com';
const REDIRECT_URI = 'https://speech-test-git-test-preview-thunderbolto1s-projects.vercel.app';
const SPREADSHEET_ID = '1XuZ7o1fcZ6Y01buC6J9Aep_tU7H9XFLt8ZUVPPrp340';
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';
const CATEGORY_SHEETS = {
    'ทั่วไป': 'common',
    'ความต้องการ': 'demand',
    'คลัง': 'storage',
};

// State
let accessToken = null;
let tokenExpiry = null;
let currentCategory = 'ทั่วไป';
let selectedWords = [];
let isSelectMode = false;

// เพิ่มตัวแปรสำหรับเลือกเครื่อง
let selectedDevice = 1; // 1 = เครื่องนี้, 2 = อีกเครื่อง

// DOM Elements
const elements = {
    modal: document.getElementById('modal'),
    buttonContainer: document.getElementById('button-container'),
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
    document.getElementById('btn-mix').addEventListener('click', toggleMixingMode);
    document.getElementById('btn-delete').addEventListener('click', deleteSelectedWord);

    const cancelMixButton = document.getElementById('btn-cancel-mix');
    if (cancelMixButton) {
        cancelMixButton.addEventListener('click', cancelMixingMode);
    }

    const cancelDeleteButton = document.getElementById('btn-cancel-delete');
    if (cancelDeleteButton) {
        cancelDeleteButton.addEventListener('click', cancelDeleteMode);
    }

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
        authenticate();
    }
}

function authenticate() {
    const state = Math.random().toString(36).substring(2);
    localStorage.setItem('oauth_state', state);
    
    const authUrl = `https://accounts.google.com/o/oauth2/auth?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=token&scope=${encodeURIComponent(SCOPES)}&state=${state}`;
    window.location.href = authUrl;
}

// Data Functions
async function loadInitialData() {
    try {
        await loadCategoryData();
    } catch (error) {
        showError('ไม่สามารถโหลดข้อมูลเริ่มต้นได้');
    }
}

async function loadCategoryData() {
    const sheetName = CATEGORY_SHEETS[currentCategory];
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${sheetName}?majorDimension=COLUMNS`;
    
    try {
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                showError('การยืนยันตัวตนล้มเหลว กรุณาล็อกอินใหม่');
                authenticate();
                return;
            }
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        const filteredWords = data.values ? data.values[0].filter(word => word && word.trim() !== '') : [];
        renderButtons(filteredWords);
    } catch (error) {
        console.error('Error loading category data:', error);
        showError('ไม่สามารถโหลดข้อมูลได้: ' + error.message);
        renderButtons([]); // Render an empty state if the sheet is empty or an error occurs
    }
}

function renderButtons(words = []) {
    if (elements.buttonContainer) {
        // สร้าง HTML สำหรับปุ่มคำศัพท์
        elements.buttonContainer.innerHTML = words.map(word => `
            <button class="word-button flex-1 text-center bg-blue-500 text-white text-4xl px-6 py-10 rounded-lg m-2 hover:bg-blue-600 transition-all${isSelectMode ? ' cursor-pointer' : ''}"
                    data-word="${word}" 
                    draggable="true">
                ${word}
                ${isSelectMode ? `<span class="selection-indicator ml-2 text-green-500">${selectedWords.includes(word) ? '✔️' : ''}</span>` : ''}
            </button>
        `).join('');
        
        // เพิ่ม event listeners หลังจากสร้าง DOM elements
        document.querySelectorAll('.word-button').forEach(button => {
            button.addEventListener('click', () => {
                const word = button.getAttribute('data-word');
                if (isSelectMode) {
                    toggleWordSelection(word);
                } else {
                    speakText(word);
                }
            });
        });

        initializeDragAndDrop();
    }
}

// UI Functions
// Update setCategory to not clear selectedWords when switching categories
function setCategory(category) {
    currentCategory = category;
    loadCategoryData();
}

// Modify toggleWordSelection to ensure words from different categories can be selected
function toggleWordSelection(word) {
    if (!isSelectMode) return;
    
    const index = selectedWords.indexOf(word);
    if (index > -1) {
        selectedWords.splice(index, 1);
    } else {
        selectedWords.push(word);
    }
    
    updateSelectionUI();
    updateMixResult();
    
    // Update selection indicators across all categories
    document.querySelectorAll('.word-button').forEach(button => {
        const buttonWord = button.getAttribute('data-word');
        const indicator = button.querySelector('.selection-indicator');
        if (indicator) {
            indicator.textContent = selectedWords.includes(buttonWord) ? '✔️' : '';
        }
    });
}

function updateSelectionUI() {
    if (elements.selectedWordsContainer) {
        elements.selectedWordsContainer.innerHTML = selectedWords.map(word => `
            <span class="selected-word bg-green-500 text-white text-xl px-4 py-2 rounded-full inline-flex items-center m-1">
                ${word}
                <button class="ml-2 hover:text-gray-200" onclick="removeSelectedWord('${word}')">&times;</button>
            </span>
        `).join('');
    }
}

// เพิ่มฟังก์ชันใหม่สำหรับลบคำจาก selected words
function removeSelectedWord(word) {
    const index = selectedWords.indexOf(word);
    if (index > -1) {
        selectedWords.splice(index, 1);
    }
    
    updateSelectionUI();
    updateMixResult();
    
    // อัปเดตเฉพาะสถานะการเลือกบนปุ่ม
    document.querySelectorAll('.word-button').forEach(button => {
        if (button.getAttribute('data-word') === word) {
            const indicator = button.querySelector('.selection-indicator');
            if (indicator) {
                indicator.textContent = '';
            }
        }
    });
}

function updateMixResult(text = '') {
    if (elements.mixResult) {
        elements.mixResult.textContent = text || selectedWords.join(' ') || 'ยังไม่ได้เลือกคำ';
    }
}

// Helper function to detect language (Thai or English)
function detectLanguage(text) {
    // Check for Thai characters
    const thaiRegex = /[\u0E00-\u0E7F]/;
    return thaiRegex.test(text) ? 'th' : 'en';
}

// Speech Functions
function initializeVoice() {
    if (typeof responsiveVoice === 'undefined') {
        console.error('ResponsiveVoice failed to load');
        return false;
    }
    try {
        // ตั้งค่าเสียงเริ่มต้นเป็นผู้ชาย
        responsiveVoice.setDefaultVoice("Thai Male");
        responsiveVoice.setDefaultRate(0.9);
        responsiveVoice.setDefaultPitch(1.1);
        responsiveVoice.setDefaultVolume(1);

        // เตรียม voice cache
        window._voices = {
            thai: { name: "Thai Male", loaded: false },
            english: { name: "US English Male", loaded: false }
        };

        // preload voices
        responsiveVoice.speak("", "Thai Male", { volume: 0, onend: () => window._voices.thai.loaded = true });
        responsiveVoice.speak("", "US English Male", { volume: 0, onend: () => window._voices.english.loaded = true });

        return true;
    } catch (error) {
        console.error('Voice initialization failed:', error);
        return false;
    }
}

function speakText(text, skipSend = false) {
    try {
        if (selectedDevice === 2 && !skipSend && ws && ws.readyState === 1) {
            // ถ้าเลือกเครื่อง 2 ให้ส่งข้อความไปอีกเครื่อง
            ws.send(JSON.stringify({ type: 'speak', text }));
            highlightSpeakingButton(text);
            setTimeout(removeSpeakingHighlight, 1500); // แสดง effect สั้นๆ
            return;
        }

        if (responsiveVoice) {
            highlightSpeakingButton(text);
            const isThai = isThaiText(text);
            const voice = isThai ? 'Thai Male' : 'UK English Male';
            responsiveVoice.speak(text, voice, {
                onend: removeSpeakingHighlight,
                onerror: (error) => {
                    console.error('Speech error:', error);
                    removeSpeakingHighlight();
                },
                rate: 1.0,
                pitch: 1.0,
                volume: 1.0
            });
        } else {
            console.warn('ResponsiveVoice not available');
            if ('speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.lang = isThaiText(text) ? 'th-TH' : 'en-US';
                utterance.onend = removeSpeakingHighlight;
                speechSynthesis.speak(utterance);
            }
        }
    } catch (error) {
        console.error('Error in speakText:', error);
        showError('Error speaking text');
    }
}

function isThaiText(text) {
    return /[\u0E00-\u0E7F]/.test(text);
}

function highlightSpeakingButton(text) {
    document.querySelectorAll('.word-button').forEach(button => {
        if (button.getAttribute('data-word') === text) {
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

async function toggleMixingMode() {
    const cancelMixButton = document.getElementById('btn-cancel-mix');
    let mixedText = '';

    if (isSelectMode) {
        mixedText = selectedWords.join(' ');
        if (mixedText.trim()) {
            try {
                // Save mixed text to the storage sheet first
                await saveMixedTextToStorage(mixedText);
                showToast('บันทึกคำผสมสำเร็จ!');
                
                // Speak the mixed text after saving
                speakText(mixedText);
                
                // Update the mix result display
                updateMixResult(mixedText);
            } catch (error) {
                console.error('Error saving mixed text:', error);
                showError('เกิดข้อผิดพลาดในการบันทึกคำผสม: ' + error.message);
            }
        }
        
        // Clear selection after speaking
        selectedWords = [];
        updateSelectionUI();
    }

    isSelectMode = !isSelectMode;
    updateMixingUI();

    // Show or hide the cancel mix button
    if (isSelectMode) {
        cancelMixButton.classList.remove('hidden');
    } else {
        cancelMixButton.classList.add('hidden');
    }

    // Only reload category data if we're exiting mix mode
    if (!isSelectMode) {
        loadCategoryData();
    }
}

async function saveMixedTextToStorage(mixedText) {
    const sheetName = CATEGORY_SHEETS['คลัง']; // Use the 'storage' sheet
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${sheetName}!A:A:append?valueInputOption=USER_ENTERED`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            values: [[mixedText]]
        })
    });

    if (!response.ok) {
        if (response.status === 401) {
            showError('การยืนยันตัวตนล้มเหลว กรุณาล็อกอินใหม่');
            authenticate();
            return;
        }
        throw new Error(`ไม่สามารถบันทึกข้อมูลได้: ${response.statusText}`);
    }
}

function cancelMixingMode() {
    isSelectMode = false;
    selectedWords = [];
    updateSelectionUI();
    updateMixResult();
    updateMixingUI();

    // Hide the cancel mix button
    document.getElementById('btn-cancel-mix').classList.add('hidden');
}

// Modify updateMixingUI to handle the cancel mix button
function updateMixingUI() {
    const mixButton = document.getElementById('btn-mix');
    

    if (isSelectMode) {
        mixButton.textContent = 'พูดคำผสม';
        mixButton.classList.remove('bg-purple-500');
        mixButton.classList.add('bg-green-500');

    
    } else {
        mixButton.textContent = 'ผสมคำ';
        mixButton.classList.remove('bg-green-500');
        mixButton.classList.add('bg-purple-500');

        
    }

    document.querySelectorAll('.category-button').forEach(button => {
        button.disabled = false;
        button.classList.remove('opacity-50');
    });
}

// Error Handling
function showError(message) {
    const errorToast = document.createElement('div');
    errorToast.className = 'fixed bottom-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg z-50';
    errorToast.textContent = message;
    
    document.body.appendChild(errorToast);
    
    setTimeout(() => {
        errorToast.remove();
    }, 5000);
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}


function preloadVoices() {
    // Preload Thai voice
    responsiveVoice.speak("", "Thai Male", { 
        volume: 0,
        onend: () => window._voices.thai.loaded = true 
    });
    
    // Preload English voice
    responsiveVoice.speak("", "US English Male", { 
        volume: 0,
        onend: () => window._voices.english.loaded = true 
    });
}

// Initialize voice on page load
document.addEventListener('DOMContentLoaded', () => {
    const voiceInitialized = initializeVoice();
    if (!voiceInitialized) {
        console.warn('Voice functionality may be limited due to initialization issues');
    }
});

// Add New Word
async function addNewWord() {
    const newWord = elements.newWordInput.value.trim();
    
    if (!newWord) {
        showError('กรุณากรอกคำศัพท์');
        return;
    }

    // รวบรวมคำศัพท์ทั้งหมดจากปุ่มที่แสดงอยู่
    const words = Array.from(document.querySelectorAll('.word-button'))
                      .map(button => button.getAttribute('data-word'));
    
    if (words.includes(newWord)) {
        showError('คำนี้มีอยู่แล้วในระบบ');
        return;
    }

    try {
        await addWordToSheet(newWord, currentCategory);
        showToast('เพิ่มคำศัพท์สำเร็จ!');
        closeModal();
        loadCategoryData();
    } catch (error) {
        showError('เกิดข้อผิดพลาดในการบันทึกคำใหม่: ' + error.message);
        console.error('Error adding new word:', error);
    }
}

async function addWordToSheet(word, category) {
    const sheetName = CATEGORY_SHEETS[category];
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${sheetName}!A:A:append?valueInputOption=USER_ENTERED`;
    
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            values: [[word]]
        })
    });
    
    if (!response.ok) {
        if (response.status === 401) {
            showError('การยืนยันตัวตนล้มเหลว กรุณาล็อกอินใหม่');
            authenticate();
            return;
        }
        throw new Error(`ไม่สามารถบันทึกข้อมูลได้: ${response.statusText}`);
    }
}

// Delete Selected Words
function toggleDeleteMode() {
    isSelectMode = !isSelectMode;

    // Update the delete button text and style
    const deleteButton = document.getElementById('btn-delete');
    const cancelDeleteButton = document.getElementById('btn-cancel-delete');

    if (isSelectMode) {
        deleteButton.textContent = 'ยืนยันลบ';
        deleteButton.classList.remove('bg-red-500');
        deleteButton.classList.add('bg-yellow-500');
        cancelDeleteButton.classList.remove('hidden'); // Show cancel delete button
    } else {
        deleteButton.textContent = 'ลบ';
        deleteButton.classList.remove('bg-yellow-500');
        deleteButton.classList.add('bg-red-500');
        cancelDeleteButton.classList.add('hidden'); // Hide cancel delete button
        selectedWords = []; // Clear selected words when exiting delete mode
        updateSelectionUI();
        updateMixResult();
    }

    // Reload category data to show or hide selection indicators
    loadCategoryData();
}

// Add a function to handle canceling delete mode
function cancelDeleteMode() {
    if (isSelectMode) {
        toggleDeleteMode(); // Exit delete mode
    }
}

// Add event listener for the cancel delete button
document.getElementById('btn-cancel-delete').addEventListener('click', cancelDeleteMode);

async function deleteSelectedWord() {
    if (!isSelectMode) {
        toggleDeleteMode(); // Enter select mode if not already in it
        return;
    }

    // Confirm deletion
    if (selectedWords.length === 0) {
        showError('ไม่มีคำที่เลือกไว้');
        return;
    }

    if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบคำที่เลือกทั้งหมด?`)) {
        return;
    }

    try {
        // Delete selected words from Google Sheets
        for (const word of selectedWords) {
            await deleteWordFromSheet(word, currentCategory);
        }

        // Clear selected words
        selectedWords = [];

        // Exit delete mode
        toggleDeleteMode();

        // Reload data and update UI
        loadCategoryData();
        showToast('ลบคำที่เลือกสำเร็จ!');
    } catch (error) {
        showError('เกิดข้อผิดพลาดในการลบคำ: ' + error.message);
        console.error('Error deleting words:', error);
    }
}

async function deleteWordFromSheet(word, category) {
    const sheetName = CATEGORY_SHEETS[category];
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}:batchUpdate`;

    // Fetch the row index of the word to delete
    const getUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${sheetName}?majorDimension=ROWS`;
    const getResponse = await fetch(getUrl, {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    });

    if (!getResponse.ok) {
        throw new Error(`ไม่สามารถดึงข้อมูลได้: ${getResponse.statusText}`);
    }

    const data = await getResponse.json();
    const rowIndex = data.values.findIndex(row => row.includes(word));

    if (rowIndex === -1) {
        throw new Error(`ไม่พบคำที่ต้องการลบ: ${word}`);
    }

    // Prepare the batchUpdate request to delete the row
    const requestBody = {
        requests: [
            {
                deleteDimension: {
                    range: {
                        sheetId: await getSheetId(sheetName),
                        dimension: "ROWS",
                        startIndex: rowIndex,
                        endIndex: rowIndex + 1
                    }
                }
            }
        ]
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        if (response.status === 401) {
            showError('การยืนยันตัวตนล้มเหลว กรุณาล็อกอินใหม่');
            authenticate();
            return;
        }
        throw new Error(`ไม่สามารถลบข้อมูลได้: ${response.statusText}`);
    }
}

async function getSheetId(sheetName) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}`;
    const response = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    });

    if (!response.ok) {
        throw new Error(`ไม่สามารถดึงข้อมูล Sheet ID ได้: ${response.statusText}`);
    }

    const data = await response.json();
    const sheet = data.sheets.find(sheet => sheet.properties.title === sheetName);

    if (!sheet) {
        throw new Error(`ไม่พบ Sheet: ${sheetName}`);
    }

    return sheet.properties.sheetId;
}

// Replace the old drag and drop implementation with this improved version
function initializeDragAndDrop() {
    const container = elements.buttonContainer;
    let draggedElement = null;

    container.addEventListener('dragstart', (e) => {
        if (!e.target.classList.contains('word-button')) return;
        draggedElement = e.target;
        e.target.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', e.target.getAttribute('data-word'));
    });

    container.addEventListener('dragend', (e) => {
        if (!e.target.classList.contains('word-button')) return;
        e.target.classList.remove('dragging');
        draggedElement = null;
        saveWordOrder();
    });

    container.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (!draggedElement) return;

        const targetButton = e.target.closest('.word-button');
        if (!targetButton || targetButton === draggedElement) return;

        const boundingRect = targetButton.getBoundingClientRect();
        const isAfter = e.clientY > boundingRect.top + boundingRect.height / 2;

        if (isAfter) {
            targetButton.parentNode.insertBefore(draggedElement, targetButton.nextSibling);
        } else {
            targetButton.parentNode.insertBefore(draggedElement, targetButton);
        }
    });
}

// Add new function to save word order
async function saveWordOrder() {
    const words = Array.from(elements.buttonContainer.querySelectorAll('.word-button'))
        .map(button => button.getAttribute('data-word'));

    const sheetName = CATEGORY_SHEETS[currentCategory];
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${sheetName}!A1:A${words.length}?valueInputOption=RAW`;

    try {
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                range: `${sheetName}!A1:A${words.length}`,
                majorDimension: "ROWS",
                values: words.map(word => [word])
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || response.statusText);
        }

        // แสดง toast เมื่อบันทึกสำเร็จ
        showToast('บันทึกลำดับคำสำเร็จ');
    } catch (error) {
        console.error('Error saving word order:', error);
        showError('ไม่สามารถบันทึกลำดับคำได้: ' + error.message);
    }
}

// Update the CSS for better drag and drop visual feedback
const dragDropStyles = `
    .word-button {
        cursor: grab;
        touch-action: none;
        user-select: none;
    }
    .word-button:active {
        cursor: grabbing;
    }
    .word-button.dragging {
        opacity: 0.7;
        cursor: grabbing;
        background-color: #2563eb;
        transform: scale(1.02);
        z-index: 1000;
    }
`;

// Remove existing style element if it exists
const existingStyle = document.querySelector('style[data-dragdrop-styles]');
if (existingStyle) {
    existingStyle.remove();
}

// Add new style element
const styleElement = document.createElement('style');
styleElement.setAttribute('data-dragdrop-styles', '');
styleElement.textContent = dragDropStyles;
document.head.appendChild(styleElement);

// UI สำหรับเลือกเครื่อง (เพิ่มใน DOM ตามต้องการ)
function renderDeviceSelector() {
    const container = document.createElement('div');
    container.className = 'fixed top-4 right-4 z-50 flex gap-2';
    container.innerHTML = `
        <button id="device-1-btn" class="px-4 py-2 rounded bg-blue-500 text-white ${selectedDevice === 1 ? 'font-bold ring-2 ring-blue-300' : ''}">เครื่อง 1</button>
        <button id="device-2-btn" class="px-4 py-2 rounded bg-green-500 text-white ${selectedDevice === 2 ? 'font-bold ring-2 ring-green-300' : ''}">เครื่อง 2</button>
    `;
    document.body.appendChild(container);

    document.getElementById('device-1-btn').onclick = () => {
        selectedDevice = 1;
        updateDeviceSelectorUI();
    };
    document.getElementById('device-2-btn').onclick = () => {
        selectedDevice = 2;
        updateDeviceSelectorUI();
    };
}

function updateDeviceSelectorUI() {
    document.getElementById('device-1-btn').classList.toggle('font-bold', selectedDevice === 1);
    document.getElementById('device-1-btn').classList.toggle('ring-2', selectedDevice === 1);
    document.getElementById('device-1-btn').classList.toggle('ring-blue-300', selectedDevice === 1);

    document.getElementById('device-2-btn').classList.toggle('font-bold', selectedDevice === 2);
    document.getElementById('device-2-btn').classList.toggle('ring-2', selectedDevice === 2);
    document.getElementById('device-2-btn').classList.toggle('ring-green-300', selectedDevice === 2);
}

// เรียก renderDeviceSelector เมื่อโหลดหน้า
document.addEventListener('DOMContentLoaded', () => {
    // ...existing code...
    renderDeviceSelector();
    // ...existing code...
});

// เพิ่ม WebSocket สำหรับสื่อสารข้ามเครื่อง
let ws;
function setupWebSocket() {
    // เปลี่ยน URL ให้ตรงกับ server ของคุณ (เช่น ws://your-server:port)
    ws = new WebSocket('wss://your-websocket-server-url');
    ws.onopen = () => console.log('WebSocket connected');
    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.type === 'speak' && selectedDevice === 1) {
                // ถ้าเครื่องนี้คือเครื่อง 1 ให้พูดข้อความที่รับมา
                speakText(data.text, true); // true = ข้ามการส่งซ้ำ
            }
        } catch (e) {
            console.error('WebSocket message error:', e);
        }
    };
    ws.onerror = (e) => console.error('WebSocket error:', e);
    ws.onclose = () => setTimeout(setupWebSocket, 3000); // auto reconnect
}
setupWebSocket();