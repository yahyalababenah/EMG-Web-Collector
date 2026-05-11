# 🦾 sEMG Data Acquisition System for 1D CNN


[![Web Serial API](https://img.shields.io/badge/Web-Serial_API-green.svg)]()
[![Target](https://img.shields.io/badge/Target-AI_Expo_Jordan_2026-gold.svg)]()

أداة ويب مدمجة (Web-based Embedded Tool) احترافية لجمع وتسجيل بيانات الإشارات العضلية الكهربائية السطحية (sEMG) بدقة عالية. تم هندسة هذا النظام خصيصاً لبناء قاعدة بيانات (Dataset) نظيفة وموسومة تلقائياً، لتكون جاهزة لتدريب نماذج الذكاء الاصطناعي (وتحديداً 1D CNN) للتمييز بين حركات اليد الأساسية كخطوة أولى في تطوير الأطراف الصناعية الذكية.

## 🎯 الميزات الرئيسية (Key Features)
* **دقة العتاد القصوى:** استغلال المحول التناظري (12-bit ADC) في لوحة ESP32-CAM للحصول على 4096 مستوى من تفاصيل الإشارة.
* **أتمتة التجربة:** واجهة ويب تحتوي على "مُلقّن بصري" (Prompter) لتوجيه المتطوعين، مما يضمن التزامن المطلق بين الحركة الفعلية وتسجيل البيانات.
* **هندسة الميزات اللحظية (Real-time Feature Engineering):** حساب الميزات الرياضية (RMS و SSI) عبر نوافذ زمنية منزلقة (Sliding Windows) أثناء عملية التسجيل.
* **التصنيف التلقائي (Auto-Labeling):** وسم البيانات تلقائياً وتصنيفها إلى 3 فئات:
  * `Class 0`: وضع الراحة (Rest)
  * `Class 1`: الانقباض الكامل / القبض (Full Grip)
  * `Class 2`: القرص بأصبعين (Pinch)

## 🛠️ المتطلبات (Requirements)
**العتاد (Hardware):**
* لوحة **ESP32-CAM** (مُستخدمة كمتحكم فقط لضمان دقة القراءة).
* حساس **MyoWare Muscle Sensor** (أحادي القناة - Single Channel).
* مبرمج **FTDI Adapter** (لرفع الكود ونقل البيانات).

**البرمجيات (Software):**
* متصفح يدعم تقنية Web Serial API (مثل Google Chrome أو Microsoft Edge).
* بيئة Arduino IDE.

## 📂 هيكلية المشروع (Project Structure)
```text
📁 sEMG-Web-Collector/
│
├── 📄 index.html          # واجهة المستخدم والمُلقّن البصري
├── 📄 style.css           # التنسيقات الحركية للتنبيهات البصرية
├── 📄 app.js              # معالجة البيانات، إدارة المنافذ، وإنشاء الـ CSV
│
├── 📁 firmware/           
│   └── 📄 esp32_logger.ino # كود ESP32-CAM (تردد أخذ العينات 500Hz)
│
└── 📄 README.md           # التوثيق
🚀 طريقة التشغيل (How to Use)
1. إعداد العتاد (Hardware Setup)
قم بتوصيل مخرج الحساس بالدبوس GPIO 14 في لوحة الـ ESP32-CAM.

استخدم الـ FTDI لرفع كود firmware/esp32_logger.ino عبر Arduino IDE (تأكد من اختيار لوحة AI Thinker ESP32-CAM).

ملاحظة فنية: الكود يقوم بإيقاف الـ WiFi والبلوتوث برمجياً لتقليل التشويش الكهرومغناطيسي وضمان استقرار إشارة الـ Analog.

2. بدء جمع البيانات (Data Collection)
افتح ملف index.html في المتصفح.

أدخل المعرف الخاص بالمتطوع (Subject ID) ورقم الجلسة (Session).

اضغط على Connect ESP32 واسمح للمتصفح بالوصول إلى المنفذ الصحيح (COM Port).

اضغط Start Protocol واتبع تعليمات الشاشة (اللون الأخضر = اقبض، اللون الأحمر = استرح).

عند اكتمال الجلسة (10 تكرارات لكل حركة)، سيقوم النظام تلقائياً بتوليد وتحميل ملف الـ CSV.

📊 هيكل البيانات الناتجة (Dataset Schema)
الملفات الناتجة تكون خفيفة ونظيفة تماماً، ومبنية بالأعمدة التالية لتسهيل إدخالها إلى مكتبة Pandas:
Timestamp_ms, Raw_EMG, Gesture_Class, Subject_ID, RMS_200ms, SSI_200ms

تم التطوير بواسطة:
Yahya Lababneh Data Science & Artificial Intelligence
Al al-Bayt University
