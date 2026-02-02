#include "security_manager.h"

// ملاحظة: في بيئة الإنتاج، يفضل تخزين المفتاح في الـ Partition المشفر للـ ESP32
const char* G80_PRIVATE_KEY = "G80_SECURE_KEY_2026_PRO"; 

String G80Security::signMessage(String payload) {
    byte hmacResult[32]; // مصفوفة لتخزين الـ Hash (256 bit)
    mbedtls_md_context_t ctx;
    mbedtls_md_type_t md_type = MBEDTLS_MD_SHA256;

    mbedtls_md_init(&ctx);
    mbedtls_md_setup(&ctx, mbedtls_md_info_from_type(md_type), 1); // 1 تعني استخدام HMAC
    mbedtls_md_hmac_starts(&ctx, (const unsigned char *) G80_PRIVATE_KEY, strlen(G80_PRIVATE_KEY));
    mbedtls_md_hmac_update(&ctx, (const unsigned char *) payload.c_str(), payload.length());
    mbedtls_md_hmac_finish(&ctx, hmacResult);
    mbedtls_md_free(&ctx);

    // تحويل المصفوفة البايتية إلى صيغة Hexadecimal لسهولة الإرسال عبر UART
    String hash = "";
    for(int i=0; i<32; i++) {
        char str[3];
        sprintf(str, "%02x", hmacResult[i]);
        hash += str;
    }
    return hash;
}

String G80Security::createSecureJSON(String command) {
    StaticJsonDocument<256> doc;
    doc["cmd"] = command;
    doc["nonce"] = esp_random(); // إضافة رقم عشوائي لمنع هجمات Replay
    doc["uptime"] = millis();

    String payload;
    serializeJson(doc, payload);
    
    String signature = signMessage(payload);
    
    // التنسيق النهائي: Payload|Signature
    return payload + "|" + signature;
}
