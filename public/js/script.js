window.onload = function() {
    // ตรวจสอบว่า responsiveVoice โหลดแล้ว
    if (typeof responsiveVoice !== "undefined") {
        console.log("ResponsiveVoice loaded successfully.");
    } else {
        console.error("ResponsiveVoice failed to load.");
    }

    // ผูกเหตุการณ์ให้กับปุ่ม "เพิ่มปุ่มใหม่"
    document.getElementById("addButton").onclick = showModal;
};

function speakText(text) {
    // ตรวจสอบว่า responsiveVoice ถูกโหลดแล้วก่อนใช้งาน
    if (typeof responsiveVoice !== "undefined") {
        // ให้พูดข้อความ
        responsiveVoice.speak(text, "Thai Male");
    } else {
        alert("ResponsiveVoice not loaded properly.");
    }
}

// ฟังก์ชันเพื่อแสดง modal
function showModal() {
    document.getElementById('modal').classList.remove('hidden');
}

// ฟังก์ชันเพื่อปิด modal
function closeModal() {
    document.getElementById('modal').classList.add('hidden');
}

// ฟังก์ชันเพื่อเพิ่มปุ่มใหม่
function addButton() {
    const userInput = document.getElementById('buttonText').value.trim();

    if (userInput) {
        // สร้างปุ่มใหม่
        const newButton = document.createElement('button');
        newButton.textContent = userInput;
        newButton.classList.add('bg-purple-500', 'text-white', 'px-6', 'py-3', 'rounded', 'text-sm', 'sm:text-base', 'md:text-lg');
        newButton.onclick = function() {
            speakText(userInput);
        };

        // หาตำแหน่งของ button-container
        const container = document.getElementById('button-container');

        // เพิ่มปุ่มใหม่เข้าไปใน container
        container.appendChild(newButton);

        // ปิด modal
        closeModal();
    } else {
        alert("กรุณากรอกข้อความก่อน!");
    }
}