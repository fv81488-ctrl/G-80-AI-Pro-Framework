#include "power_manager.h"
#include <Arduino.h>
#include "config.h"

void PowerManager::setSystemState(int state) {
    switch(state) {
        case 0: // الحالة 0: Deep Sleep (النظام بالكامل في وضع الحفظ)
            Serial.println("G-80: Entering Deep Sleep...");
            digitalWrite(RPI_POWER_GATE_PIN, LOW); // فصل الطاقة عن RPi
            esp_sleep_enable_ext0_wakeup(GPIO_NUM_33, 1); // الاستيقاظ عبر زر خارجي مثلاً
            esp_deep_sleep_start();
            break;

        case 1: // الحالة 1: Idle (ESP32 يعمل، RPi مطفأ)
            Serial.println("G-80: State 1 - AI Engine Powered OFF");
            digitalWrite(RPI_POWER_GATE_PIN, LOW);
            digitalWrite(STATUS_LED, LOW);
            break;

        case 2: // الحالة 2: AI Active (تشغيل الـ RPi للقيام بالمهام الثقيلة)
            Serial.println("G-80: State 2 - Powering ON AI Engine...");
            digitalWrite(RPI_POWER_GATE_PIN, HIGH);
            digitalWrite(STATUS_LED, HIGH); // إشارة ضوئية للعمل
            break;
            
        case 3: // الحالة 3: Communication (إرسال البيانات عبر LoRa/4G)
            // منطق إضافي لتقليل طاقة المكونات غير الضرورية أثناء البث
            Serial.println("G-80: State 3 - Data Transmission Mode");
            break;
    }
}

float PowerManager::readBatteryVoltage() {
    int raw = analogRead(BATTERY_SENSE_PIN);
    // تحويل القراءة التناظرية إلى جهد حقيقي (يعتمد على مقسم الجهد المستخدم)
    return (raw * 3.3 / 4095.0) * 2.0; 
}
