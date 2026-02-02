#ifndef CONFIG_H
#define CONFIG_H

// UART Settings
#define UART_BAUD 115200
#define RPI_UART_TX 17
#define RPI_UART_RX 16

// Power Control Pins
#define RPI_POWER_GATE_PIN 18 // MOSFET Pin to turn on RPi
#define BATTERY_SENSE_PIN 34  // ADC Pin for battery monitoring

// UI & Indicators
#define STATUS_LED 2

#endif
