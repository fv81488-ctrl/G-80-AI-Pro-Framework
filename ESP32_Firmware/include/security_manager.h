#include <mbedtls/md.h>
#include <ArduinoJson.h> // لمعالجة رسائل JSON كما ذكرت في البحث

class G80Security {
private:
    const char* _key = "YOUR_SUPER_SECRET_KEY_2026"; // يجب إخفاؤه في ملف خاص

public:
    String signMessage(String payload) {
        byte hmacResult[32];
        mbedtls_md_context_t ctx;
        mbedtls_md_init(&ctx);
        mbedtls_md_setup(&ctx, mbedtls_md_info_from_type(MBEDTLS_MD_SHA256), 1);
        mbedtls_md_hmac_starts(&ctx, (const unsigned char *) _key, strlen(_key));
        mbedtls_md_hmac_update(&ctx, (const unsigned char *) payload.c_str(), payload.length());
        mbedtls_md_hmac_finish(&ctx, hmacResult);
        mbedtls_md_free(&ctx);

        String hash = "";
        for(int i=0; i<32; i++){
            char str[3];
            sprintf(str, "%02x", hmacResult[i]);
            hash += str;
        }
        return hash;
    }

    String createSecureJSON(String command) {
        StaticJsonDocument<200> doc;
        doc["cmd"] = command;
        doc["ts"] = millis(); // Timestamp لمنع هجمات Replay
        String payload;
        serializeJson(doc, payload);
        
        String signature = signMessage(payload);
        return payload + "|" + signature; // التنسيق الذي سيستقبله الـ RPi
    }
};
