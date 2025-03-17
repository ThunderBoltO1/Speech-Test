window.onload = function() {
    // ตรวจสอบว่า responsiveVoice โหลดแล้ว
    if (typeof responsiveVoice !== "undefined") {
        console.log("ResponsiveVoice loaded successfully.");
    } else {
        console.error("ResponsiveVoice failed to load.");
    }
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