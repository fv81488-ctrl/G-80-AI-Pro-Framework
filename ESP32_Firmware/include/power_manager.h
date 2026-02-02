class PowerManager {
public:
    void setSystemState(int state) {
        switch(state) {
            case 0: // Deep Sleep
                esp_deep_sleep_start();
                break;
            case 1: // Idle (RPi OFF, UI ON)
                digitalWrite(RPI_POWER_GATE_PIN, LOW);
                break;
            case 2: // AI Active (RPi ON)
                digitalWrite(RPI_POWER_GATE_PIN, HIGH);
                break;
        }
    }
};
