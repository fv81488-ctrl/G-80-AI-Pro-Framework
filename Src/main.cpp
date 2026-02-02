#include <Arduino.h>
#include "config.h"
#include "security_manager.h"
#include "power_manager.h"

// إنشاء كائنات من الفئات التي صممناها
G80Security security;
PowerManager power;

// متغير لحفظ الحالة الحالية للنظام (يبدأ بالحالة 1: Idle)
int currentSystemState = 1;

void setup() {
    // 1. تهيئة قنوات الاتصال
    Serial.begin(115200); // للتصحيح (Debug)
    Serial2.begin(UART_BAUD, SERIAL_8N1, RPI_UART_RX, RPI_UART_TX); // الاتصال مع RPi

    // 2. تهيئة الدبابيس (Pins)
    pinMode(RPI_POWER_GATE_PIN, OUTPUT);
    pinMode(STATUS_LED, OUTPUT);
    
    // تأكد أن الـ RPi مطفأ في البداية (State 1)
    power.setSystemState(1);
    
    Serial.println("G-80 AI Pro: System Initialized. State 1: Idle.");
}

void loop() {
    // مثال: محاكاة استقبال أمر من الواجهة الرسومية لتشغيل الذكاء الاصطناعي
    // في الواقع، هذا سيأتي من ضغطة زر على الشاشة (LVGL)
    if (Serial.available()) {
        char input = Serial.read();
        
        if (input == 'W') { // 'W' لـ Wake Up
            Serial.println("Action: Waking up AI Engine...");
            
            // الانتقال إلى الحالة 2: تشغيل الـ Raspberry Pi
            currentSystemState = 2;
            power.setSystemState(currentSystemState);
            
            // إرسال أمر البدء المشفر (Secure JSON Packet)
            String secureCmd = security.createSecureJSON("START_INFERENCE");
            
            // ننتظر قليلاً حتى يقلع الـ RPi (كما ورد في تجارب البحث)
            delay(15000); 
            
            Serial2.println(secureCmd);
            Serial.println("Secure Command Sent: " + secureCmd);
        }
        
        if (input == 'S') { // 'S' لـ Sleep
            Serial.println("Action: Entering Power Saving Mode...");
            currentSystemState = 0;
            power.setSystemState(currentSystemState);
        }
    }

    // وميض بسيط لليد لبيان أن الـ ESP32 يعمل (Always-on)
    digitalWrite(STATUS_LED, HIGH);
    delay(100);
    digitalWrite(STATUS_LED, LOW);
    delay(900);
}
