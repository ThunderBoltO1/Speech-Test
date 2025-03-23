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
let isSelectMode = false;

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
    document.getElementById('btn-delete').addEventListener('click', toggleWordSelectionMode);
    
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
        if (!data.values) {
            throw new Error('ไม่มีข้อมูลใน Google Sheets');
        }
        
        // กรองคำว่างออกก่อนแสดงผล
        const filteredWords = data.values[0].filter(word => word && word.trim() !== '');
        renderButtons(filteredWords);
    } catch (error) {
        console.error('Error loading category data:', error);
        showError('ไม่สามารถโหลดข้อมูลได้: ' + error.message);
    }
}

function renderButtons(words = []) {
    if (elements.buttonContainer) {
        // สร้าง HTML สำหรับปุ่มคำศัพท์
        elements.buttonContainer.innerHTML = words.map(word => `
            <button class="word-button flex-1 text-left bg-blue-500 text-white px-4 py-2 rounded-full m-2 hover:bg-blue-600 transition-all"
                    data-word="${word}">
                ${word}
                ${isSelectMode ? `<span class="selection-indicator ml-2">${selectedWords.includes(word) ? '✔️' : ''}</span>` : ''}
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
    }
}

// UI Functions
function setCategory(category) {
    currentCategory = category;
    // เคลียร์คำที่เลือกเมื่อเปลี่ยนหมวดหมู่ในโหมดปกติ
    if (!isSelectMode) {
        selectedWords = [];
        updateSelectionUI();
    }
    loadCategoryData();
}

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
    
    // อัปเดตเฉพาะสถานะการเลือกบนปุ่ม
    document.querySelectorAll('.word-button').forEach(button => {
        if (button.getAttribute('data-word') === word) {
            const indicator = button.querySelector('.selection-indicator');
            if (indicator) {
                indicator.textContent = selectedWords.includes(word) ? '✔️' : '';
            }
            button.classList.toggle('bg-green-500', selectedWords.includes(word)); // เปลี่ยนสีเป็นเขียว
        }
    });
}

function updateSelectionUI() {
    if (elements.selectedWordsContainer) {
        elements.selectedWordsContainer.innerHTML = selectedWords.map(word => `
            <span class="selected-word bg-green-500 text-white px-4 py-2 rounded-full inline-flex items-center m-1">
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

// Speech Functions
function speakText(text) {
    if (typeof responsiveVoice !== 'undefined') {
        // Split long text into smaller chunks (sentences)
        const sentences = text.match(/[^.!?]+[.!?]*/g) || [text];
        let index = 0;

        const speakNextSentence = () => {
            if (index < sentences.length) {
                const sentence = sentences[index].trim();
                responsiveVoice.speak(sentence, "Thai Female", {
                    onstart: () => {
                        console.log('เริ่มพูด:', sentence);
                        highlightSpeakingButton(sentence);
                    },
                    onend: () => {
                        console.log('พูดเสร็จสิ้น:', sentence);
                        removeSpeakingHighlight();
                        index++;
                        speakNextSentence(); // Speak the next sentence
                    },
                    onerror: (error) => {
                        console.error('เกิดข้อผิดพลาดในการพูด:', error);
                        showError('ไม่สามารถพูดข้อความได้: ' + (error.error || 'unknown error'));
                        removeSpeakingHighlight();
                    }
                });
            } else {
                console.log('พูดข้อความทั้งหมดเสร็จสิ้น');
            }
        };

        speakNextSentence(); // Start speaking the first sentence
    } else {
        console.error('ResponsiveVoice.js ไม่พร้อมใช้งาน');
        showError('ไม่สามารถพูดข้อความได้');
    }
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


function toggleMixingMode() {
    if (isSelectMode) {
        const mixedText = selectedWords.join(' ');
        if (mixedText.trim()) {
            speakText(mixedText);
            saveToStorage(mixedText);
        }
    }

    isSelectMode = !isSelectMode;
    updateMixingUI();

    // โหลดข้อมูลจากทุกหมวดหมู่เมื่อเข้าสู่โหมดผสมคำ
    if (isSelectMode) {
        loadAllCategoriesData();
    } else {
        loadCategoryData();
    }
}

// ฟังก์ชันใหม่สำหรับโหลดข้อมูลจากทุกหมวดหมู่
async function loadAllCategoriesData() {
    try {
        const allWords = [];
        for (const category in CATEGORY_SHEETS) {
            const sheetName = CATEGORY_SHEETS[category];
            const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${sheetName}?majorDimension=COLUMNS`;

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
            if (data.values) {
                const filteredWords = data.values[0].filter(word => word && word.trim() !== '');
                allWords.push(...filteredWords);
            }
        }
        renderButtons(allWords);
    } catch (error) {
        console.error('Error loading all categories data:', error);
        showError('ไม่สามารถโหลดข้อมูลจากทุกหมวดหมู่ได้: ' + error.message);
    }
}

async function saveToStorage(mixedText) {
    try {

        const storageSheet = CATEGORY_SHEETS['คลัง'];
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${storageSheet}?majorDimension=COLUMNS`;
        
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        const existingWords = data.values && data.values[0] ? data.values[0] : [];
        
        // ถ้าคำผสมนี้มีอยู่แล้ว ไม่ต้องบันทึกซ้ำ
        if (existingWords.includes(mixedText)) {
            console.log('คำผสมนี้มีอยู่ใน "คลัง" แล้ว');
            return;
        }
        
        // บันทึกคำผสมลงใน Sheet3 (คลัง)
        await addWordToSheet(mixedText, 'คลัง');
        showToast('บันทึกคำผสมลงในคลังสำเร็จ!');
        
    } catch (error) {
        console.error('Error saving mixed word to storage:', error);
        showError('ไม่สามารถบันทึกคำผสมลงในคลัง: ' + error.message);
    }
}

// ปรับปรุง updateMixingUI ให้เพิ่มปุ่มยกเลิกการผสมข้อความกลับมา
function updateMixingUI() {
    const mixButton = document.getElementById('btn-mix');
    const cancelMixButton = document.getElementById('btn-cancel-mix');
    const deleteButton = document.getElementById('btn-delete');

    if (isSelectMode) {
        mixButton.textContent = 'พูดคำผสม';
        mixButton.classList.remove('bg-purple-500');
        mixButton.classList.add('bg-green-500');

        cancelMixButton.classList.remove('hidden'); // แสดงปุ่มยกเลิกผสมคำ
        deleteButton.classList.add('hidden'); // ซ่อนปุ่มลบคำ
    } else {
        mixButton.textContent = 'ผสมคำ';
        mixButton.classList.remove('bg-green-500');
        mixButton.classList.add('bg-purple-500');

        cancelMixButton.classList.add('hidden'); // ซ่อนปุ่มยกเลิกผสมคำ
        deleteButton.classList.remove('hidden'); // แสดงปุ่มลบคำ
    }

    // ปิดการใช้งานปุ่มหมวดหมู่เมื่ออยู่ในโหมดผสมคำ
    document.querySelectorAll('.category-button').forEach(button => {
        button.disabled = isSelectMode;
        if (isSelectMode) {
            button.classList.add('opacity-50');
        } else {
            button.classList.remove('opacity-50');
        }
    });
}

function toggleWordSelectionMode() {
    isSelectMode = !isSelectMode;
    selectedWords = [];
    updateSelectionUI();
    updateMixResult();
    updateMixingUI();
}

// ฟังก์ชันสำหรับยกเลิกโหมดผสมคำ
function cancelMixingMode() {
    isSelectMode = false;
    selectedWords = [];
    updateSelectionUI();
    updateMixResult();
    updateMixingUI();
    loadCategoryData(); // โหลดข้อมูลหมวดหมู่ปัจจุบันใหม่
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

// Initialize
if (typeof responsiveVoice !== 'undefined') {
    responsiveVoice.setDefaultVoice("Thai Female");
}

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

// แก้ไขฟังก์ชัน deleteSelectedWords ให้ทำงานได้ไม่ว่าจะอยู่ในโหมดใด
function deleteSelectedWords() {
    if (isSelectMode) {
        // ในโหมดผสมคำ: ลบคำที่เลือกไว้
        if (selectedWords.length === 0) {
            showError('ไม่มีคำที่เลือกไว้');
            return;
        }

        if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบคำที่เลือกทั้งหมดออกจากรายการเลือก?`)) {
            return;
        }

        // ลบคำที่เลือกออกจากรายการ
        selectedWords = [];

        // อัปเดต UI
        updateSelectionUI();
        updateMixResult();
        
        // อัปเดตเครื่องหมายการเลือกบนปุ่มคำศัพท์
        document.querySelectorAll('.selection-indicator').forEach(indicator => {
            indicator.textContent = '';
        });
        
        showToast('ลบคำที่เลือกออกจากรายการเรียบร้อยแล้ว');
    } else {
        // ในโหมดปกติ: ลบคำศัพท์ออกจากหมวดหมู่
        deleteWordFromCategory();
    }
}

// ฟังก์ชันใหม่สำหรับลบคำศัพท์ออกจากหมวดหมู่
async function deleteWordFromCategory() {
    // เปิดหน้าต่างให้เลือกคำที่ต้องการลบ
    const wordToDelete = prompt('กรุณาระบุคำที่ต้องการลบออกจากหมวดหมู่:');
    
    if (!wordToDelete || wordToDelete.trim() === '') {
        return;
    }
    
    // ตรวจสอบว่าคำนี้มีอยู่ในหมวดหมู่หรือไม่
    const words = Array.from(document.querySelectorAll('.word-button'))
                      .map(button => button.getAttribute('data-word'));
    
    if (!words.includes(wordToDelete)) {
        showError('ไม่พบคำนี้ในหมวดหมู่ปัจจุบัน');
        return;
    }
    
    // ถามยืนยันก่อนลบ
    if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบคำ "${wordToDelete}" ออกจากหมวดหมู่ "${currentCategory}"?`)) {
        return;
    }
    
    try {
        await deleteWordFromSheet(wordToDelete, currentCategory);
        showToast('ลบคำศัพท์ออกจากหมวดหมู่เรียบร้อยแล้ว');
        loadCategoryData(); // โหลดข้อมูลใหม่
    } catch (error) {
        console.error('Error deleting word:', error);
        showError('เกิดข้อผิดพลาดในการลบคำศัพท์: ' + error.message);
    }
}

// ฟังก์ชันสำหรับลบคำออกจาก Sheet
async function deleteWordFromSheet(word, category) {
    const sheetName = CATEGORY_SHEETS[category];
    
    // 1. ดึงข้อมูลทั้งหมดจาก sheet
    const getUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${sheetName}?majorDimension=ROWS`;
    
    const getResponse = await fetch(getUrl, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    
    if (!getResponse.ok) {
        throw new Error(`ไม่สามารถดึงข้อมูลได้: ${getResponse.statusText}`);
    }
    
    const data = await getResponse.json();
    if (!data.values || !data.values.length) {
        throw new Error('ไม่มีข้อมูลใน Sheet');
    }
    
    // 2. กรองคำที่ต้องการลบออก
    const updatedRows = data.values.filter(row => row[0] !== word);
    
    // 3. อัปเดต sheet ด้วยข้อมูลใหม่
    const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${sheetName}!A1:Z${updatedRows.length}?valueInputOption=USER_ENTERED`;
    
    const updateResponse = await fetch(updateUrl, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            values: updatedRows
        })
    });
    
    if (!updateResponse.ok) {
        throw new Error(`ไม่สามารถอัปเดตข้อมูลได้: ${updateResponse.statusText}`);
    }
    
    // 4. เคลียร์ข้อมูลเก่าที่อาจเหลืออยู่ในแถวล่างสุด
    if (updatedRows.length < data.values.length) {
        const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${sheetName}!A${updatedRows.length + 1}:Z${data.values.length}:clear`;
        
        const clearResponse = await fetch(clearUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        
        if (!clearResponse.ok) {
            console.warn('ไม่สามารถเคลียร์ข้อมูลเก่าได้', clearResponse.statusText);
        }
    }
}