/* ==========================================================================
   sEMG Data Collector - Main Application Logic (Web Serial API & Chart.js)
   Target Model: 1D CNN - Data Science Pipeline
   ========================================================================== */

// ─── 1. تعريف عناصر الواجهة (DOM Elements) ──────────────────────────────
const btnConnect = document.getElementById('connectBtn');
const btnStart = document.getElementById('startSessionBtn');
const btnDownload = document.getElementById('downloadBtn');
const downloadArea = document.getElementById('downloadArea');

const prompterBox = document.getElementById('prompterBox');
const prompterText = document.getElementById('prompterText');
const prompterSubtext = document.getElementById('prompterSubtext');

const statusConnection = document.getElementById('connectionStatus');
const statusGesture = document.getElementById('gestureLabel');
const statusProgress = document.getElementById('trialProgress');

// ─── 2. المتغيرات العامة (Global Variables) ──────────────────────────────
let port;
let reader;
let keepReading = true;

// متغيرات حفظ البيانات (Dataset)
let masterData = []; // المصفوفة التي ستحتوي على كل البيانات لتصديرها للـ CSV
let windowBuffer = []; // نافذة منزلقة (Sliding Window) لحساب الميزات اللحظية
const WINDOW_SIZE = 100; // 100 قراءة تعادل تقريباً 200ms (على افتراض 500Hz)

// متغيرات حالة الجلسة (Session State)
let currentGestureClass = 0; // 0: Rest, 1: Grip, 2: Pinch
let isRecordingSession = false; // هل الجلسة قيد العمل الآن؟
let sessionStartTime = 0;

// ─── 3. تجهيز الرسم البياني (Chart.js Setup) ─────────────────────────────
const ctx = document.getElementById('emgChart').getContext('2d');
const emgChart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: Array(200).fill(''), // عرض 200 نقطة فقط على الشاشة لتجنب البطء
        datasets: [{
            label: 'Raw sEMG',
            data: Array(200).fill(0),
            borderColor: '#2563eb', // لون أزرق احترافي
            borderWidth: 1.5,
            pointRadius: 0, // إخفاء النقاط لتسريع الرسم
            tension: 0.1
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false, // إيقاف الأنيميشن لأن البيانات سريعة جداً (Real-time)
        scales: {
            y: { min: 0, max: 4095 }, // دقة الـ ADC الخاصة بـ ESP32
            x: { display: false } // إخفاء محور السينات
        }
    }
});

// ─── 4. الاتصال بالهاردوير (Web Serial API) ──────────────────────────────
btnConnect.addEventListener('click', async () => {
    try {
        // طلب إذن الوصول للمنفذ من المتطوع
        port = await navigator.serial.requestPort();
        // فتح المنفذ بسرعة 115200 (نفس السرعة في كود الأردوينو)
        await port.open({ baudRate: 115200 });

        statusConnection.textContent = "Connected 🟢";
        statusConnection.className = "text-xl font-bold text-green-600";
        btnConnect.disabled = true;
        btnConnect.classList.replace('bg-blue-600', 'bg-gray-400');
        btnStart.disabled = false;
        btnStart.classList.replace('bg-gray-400', 'bg-green-600');

        prompterText.textContent = "READY";
        prompterSubtext.textContent = "Press 'Start Protocol' to begin";

        // بدء حلقة القراءة في الخلفية
        readSerialData();

    } catch (error) {
        console.error("Connection Failed:", error);
        alert("Failed to connect to ESP32. Please try again.");
    }
});

// ─── 5. معالجة البيانات القادمة (Data Parsing & Feature Extraction) ──────
async function readSerialData() {
    const textDecoder = new TextDecoderStream();
    const readableStreamClosed = port.readable.pipeTo(textDecoder.writable);
    reader = textDecoder.readable.getReader();

    let buffer = ""; // لتجميع أجزاء النصوص المقطوعة

    while (keepReading) {
        const { value, done } = await reader.read();
        if (done) { reader.releaseLock(); break; }
        
        buffer += value;
        let lines = buffer.split('\n');
        buffer = lines.pop(); // الاحتفاظ بالجزء غير المكتمل للدورة القادمة

        for (let line of lines) {
            line = line.trim();
            if (!line) continue;

            // كود الـ ESP32 يرسل: "Timestamp,EMGValue"
            let parts = line.split(',');
            if (parts.length === 2) {
                let espTime = parseInt(parts[0]);
                let emgValue = parseInt(parts[1]);

                // تحديث الرسم البياني
                updateChart(emgValue);

                // إذا كانت الجلسة مستمرة، قم بتسجيل البيانات
                if (isRecordingSession) {
                    processDataPoint(espTime, emgValue);
                }
            }
        }
    }
}

function updateChart(value) {
    const dataArr = emgChart.data.datasets[0].data;
    dataArr.push(value);
    dataArr.shift(); // إزالة أقدم نقطة
    emgChart.update();
}

// ─── 6. استخراج الميزات وحفظها (Feature Extraction Pipeline) ─────────────
function processDataPoint(timestamp, emgValue) {
    // تحديث النافذة المنزلقة (Sliding Window)
    windowBuffer.push(emgValue);
    if (windowBuffer.length > WINDOW_SIZE) {
        windowBuffer.shift();
    }

    // حساب الـ RMS والـ SSI كلما اكتملت النافذة
    let rms = 0;
    let ssi = 0;
    if (windowBuffer.length === WINDOW_SIZE) {
        let sumSquares = 0;
        for (let i = 0; i < WINDOW_SIZE; i++) {
            sumSquares += Math.pow(windowBuffer[i], 2);
        }
        ssi = sumSquares;
        rms = Math.sqrt(sumSquares / WINDOW_SIZE);
    }

    // تجهيز السطر (Row) لإضافته لملف الـ CSV
    const subjectId = document.getElementById('subjectId').value;
    // الهيكل: Timestamp, Raw_EMG, Gesture_Class, Subject_ID, RMS, SSI
    masterData.push(`${timestamp},${emgValue},${currentGestureClass},${subjectId},${rms.toFixed(2)},${ssi}`);
}

// ─── 7. بروتوكول التلقين (The Prompter Protocol) ──────────────────────────
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

btnStart.addEventListener('click', async () => {
    btnStart.disabled = true;
    masterData = []; // تفريغ البيانات القديمة
    
    // إضافة ترويسة ملف الـ CSV
    masterData.push("Timestamp_ms,Raw_EMG,Gesture_Class,Subject_ID,RMS_200ms,SSI_200ms");

    const gestures = [
        { classId: 1, name: "FULL GRIP" },
        { classId: 2, name: "PINCH" }
    ];

    isRecordingSession = true;

    // حلقة الحركات (Gestures Loop)
    for (let g of gestures) {
        // 10 تكرارات لكل حركة (Trials)
        for (let trial = 1; trial <= 10; trial++) {
            statusProgress.textContent = `${trial} / 10`;
            
            // 1. مرحلة الاستعداد (Countdown)
            currentGestureClass = 0; // تُعتبر كـ Rest
            statusGesture.textContent = "Standby";
            prompterBox.className = "bg-gray-200 rounded-2xl shadow-inner h-64 flex flex-col items-center justify-center mb-6 transition-all duration-300";
            prompterText.textContent = "GET READY...";
            prompterSubtext.textContent = `Next: ${g.name}`;
            await sleep(3000);

            // 2. مرحلة الانقباض والتسجيل الفعلي (Action)
            currentGestureClass = g.classId;
            statusGesture.textContent = g.name;
            // إضافة الكلاس الخاص باللون الأخضر ونبض الشاشة (من style.css)
            prompterBox.className = "recording-active rounded-2xl h-64 flex flex-col items-center justify-center mb-6";
            prompterText.textContent = g.name;
            prompterSubtext.textContent = "CONTRACT YOUR MUSCLE NOW!";
            await sleep(3000);

            // 3. مرحلة الراحة (Rest)
            currentGestureClass = 0;
            statusGesture.textContent = "Rest";
            // إضافة الكلاس الخاص باللون الأحمر (من style.css)
            prompterBox.className = "rest-active rounded-2xl h-64 flex flex-col items-center justify-center mb-6";
            prompterText.textContent = "REST";
            prompterSubtext.textContent = "Relax your hand completely";
            await sleep(3000);
        }
    }

    // إنهاء الجلسة
    isRecordingSession = false;
    currentGestureClass = 0;
    prompterBox.className = "bg-blue-100 border-blue-500 border-4 rounded-2xl h-64 flex flex-col items-center justify-center mb-6";
    prompterText.textContent = "SESSION COMPLETE";
    prompterSubtext.textContent = "Great job! You can now download the data.";
    
    // إظهار زر تحميل الداتا سيت
    downloadArea.classList.remove('hidden');
});

// ─── 8. إنشاء وتنزيل ملف الـ CSV (Data Export) ───────────────────────────
btnDownload.addEventListener('click', () => {
    // دمج كل الأسطر مع فاصل سطر جديد
    const csvContent = masterData.join("\n");
    
    // إنشاء كائن (Blob) يحتوي على النص
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // تجهيز اسم الملف بناءً على المدخلات
    const subId = document.getElementById('subjectId').value;
    const sessId = document.getElementById('sessionId').value;
    const fileName = `Subject_${subId}_Session_${sessId}.csv`;
    
    // إنشاء عنصر رابط وهمي لمحاكاة التنزيل (Auto Download)
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});
