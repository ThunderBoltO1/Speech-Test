// Google Sheets API Key และ File ID
const apiKey = "AIzaSyBxfc4DKunSNuWQ8KwNcID8mcADK7udhPI"; // API Key ของคุณ
const sheetId = "1YY1a1drCnfXrSNWrGBgrMaMlFQK5rzBOEoeMhW9MYm8"; // ใส่ ID ของ Google Sheets ของคุณ

// ฟังก์ชันที่ใช้ในการเพิ่มข้อมูลใน Google Sheets
function addDataToSheet(text) {
    const sheetUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Sheet1:append?valueInputOption=RAW&key=${apiKey}`;
    
    const data = {
        values: [
            [text]  // เพิ่มข้อมูลลงในแถวใหม่
        ]
    };

    fetch(sheetUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(data => {
        console.log("Data added to Google Sheets:", data);
    })
    .catch(error => console.error("Error adding data to Google Sheets:", error));
}

// ฟังก์ชันสำหรับเพิ่มปุ่มใหม่
function addButton() {
    const userInput = document.getElementById('buttonText').value.trim();

    if (userInput) {
        // สร้างปุ่มใหม่
        const newButton = document.createElement('button');
        newButton.textContent = userInput;
        newButton.classList.add('bg-blue-500', 'text-white', 'px-6', 'py-3', 'rounded', 'text-sm', 'sm:text-base', 'md:text-lg');
        newButton.onclick = function() {
            speakText(userInput);
        };

        // หาตำแหน่งของ button-container
        const container = document.getElementById('button-container');

        // เพิ่มปุ่มใหม่เข้าไปใน container
        container.appendChild(newButton);

        // ปิด modal
        closeModal();

        // ล้างค่าในฟอร์ม
        document.getElementById('buttonText').value = '';

        // บันทึกข้อมูลลง Google Sheets
        addDataToSheet(userInput);
    } else {
        alert("กรุณากรอกข้อความก่อน!");
    }
}

// ฟังก์ชันแสดง modal
function showModal() {
    document.getElementById('modal').classList.remove('hidden');
}

// ฟังก์ชันปิด modal
function closeModal() {
    document.getElementById('modal').classList.add('hidden');
}

// ฟังก์ชันสำหรับพูดข้อความ
function speakText(text) {
    if (typeof responsiveVoice !== "undefined") {
        responsiveVoice.speak(text, "Thai Male");
    } else {
        alert("ResponsiveVoice not loaded properly.");
    }
}