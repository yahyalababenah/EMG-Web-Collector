/* ==========================================================================
   sEMG Data Logger - ESP32-CAM (No Camera Mode)
   Target: Web Serial API Interface
   Baud Rate: 115200 | Sampling Rate: ~500Hz
   ========================================================================== */

#include <WiFi.h>

// ─── 1. تعريف الدبابيس (Pins Definition) ───────────────────────────
// استخدمنا GPIO 14 لأنه متصل بـ ADC1 (الأكثر استقراراً)
#define EMG_PIN 14  

// الليد المدمج في الجزء الخلفي من ESP32-CAM (يعمل بمنطق معكوس: LOW يعني مضاء)
#define LED_PIN 33  

// ─── 2. متغيرات التوقيت (Timing Variables) ─────────────────────────
unsigned long lastSampleTime = 0;
const unsigned long sampleInterval = 2; // 2 ملي ثانية = 500 عينة في الثانية (500Hz)

void setup() {
  // بدء الاتصال التسلسلي بسرعة مطابقة لملف الـ JavaScript
  Serial.begin(115200);

  // 🔴 خطوة حاسمة لهندسة البيانات: إطفاء الراديو لتقليل التشويش الكهربائي (Noise)
  WiFi.mode(WIFI_OFF);
  btStop(); 

  // إعداد دبابيس الإدخال والإخراج
  pinMode(EMG_PIN, INPUT);
  pinMode(LED_PIN, OUTPUT);

  // إضاءة الليد لإخبارنا أن اللوحة تعمل ومستعدة للاتصال
  digitalWrite(LED_PIN, LOW); 

  // تأخير بسيط لإعطاء فرصة للجهد الكهربائي ليستقر بعد الإقلاع
  delay(1000);
}

void loop() {
  unsigned long currentMillis = millis();

  // 🟢 خوارزمية التوقيت الصارم لضمان دقة معدل العينات (Sampling Rate)
  if (currentMillis - lastSampleTime >= sampleInterval) {
    lastSampleTime = currentMillis; // تحديث وقت آخر قراءة

    // قراءة الإشارة من الحساس (الناتج سيكون بين 0 و 4095 بسبب دقة 12-bit)
    int emgValue = analogRead(EMG_PIN);

    // إرسال البيانات بالصيغة المطلوبة: Timestamp,Raw_EMG
    Serial.print(currentMillis);
    Serial.print(",");
    Serial.println(emgValue);
  }
}
