/**
 * Mock Coaster Device
 *
 * Simulates Hybit NeuraFlow coaster for testing without hardware
 *
 * Features:
 * - Generates realistic DL lines
 * - Simulates drinking patterns
 * - Responds to commands (GET ALL, GOAL, SYNC)
 * - Battery simulation
 */

import logger from "../../utils/logger";

export class MockCoaster {
  private logs: string[] = [];
  private battery = 85;
  private isConnected = false;
  private dataCallback?: (line: string) => void;

  /**
   * Start mock coaster
   */
  connect(onData: (line: string) => void) {
    this.isConnected = true;
    this.dataCallback = onData;
    logger.ble("🔌 [MOCK] Coaster connected");
  }

  /**
   * Disconnect
   */
  disconnect() {
    this.isConnected = false;
    this.dataCallback = undefined;
    logger.ble("🔌 [MOCK] Coaster disconnected");
  }

  /**
   * Handle command from app
   */
  handleCommand(command: string) {
    logger.ble("📥 [MOCK] Received command:", command);

    if (command.startsWith("GET ALL")) {
      this.sendAllLogs();
    } else if (command.startsWith("GOAL")) {
      this.sendLine("ACK");
    } else if (command.startsWith("SYNC")) {
      this.sendLine("ACK");
    }
  }

  /**
   * Generate realistic hydration logs
   */
  generateLogs(count: number = 100) {
    this.logs = [];

    for (let i = 0; i < count; i++) {
      // Simulate varying hydration (20-60ml per period)
      const ml = Math.floor(Math.random() * 40 + 20);
      const timestamp = this.formatTimestamp(
        Date.now() - (count - i) * 10 * 60 * 1000
      );
      this.logs.push(`DL ${i} ${ml} ${timestamp}`);
    }

    logger.ble(`📊 [MOCK] Generated ${count} logs`);
  }

  /**
   * Send all logs to app
   */
  private sendAllLogs() {
    if (!this.dataCallback) return;

    // Send SDT (Start Data Transfer)
    this.sendLine("SDT");

    // Send all DL lines with realistic delay
    this.logs.forEach((log, index) => {
      setTimeout(() => {
        this.sendLine(log);
      }, index * 50); // 50ms between logs
    });

    // Send END after all logs
    setTimeout(() => {
      this.sendLine("END");

      // Send battery status
      setTimeout(() => {
        this.sendLine(`DEV ${this.battery}`);
      }, 100);
    }, this.logs.length * 50 + 200);
  }

  /**
   * Simulate drinking (add new log)
   */
  simulateDrink(ml: number = 40) {
    const index = this.logs.length;
    const timestamp = this.formatTimestamp(Date.now());
    const log = `DL ${index} ${ml} ${timestamp}`;

    this.logs.push(log);
    this.sendLine(log);

    logger.ble(`💧 [MOCK] Simulated drink: ${ml}ml`);
  }

  /**
   * Simulate battery drain
   */
  drainBattery(amount: number = 1) {
    this.battery = Math.max(0, this.battery - amount);
    this.sendLine(`DEV ${this.battery}`);
  }

  /**
   * Send line to app
   */
  private sendLine(line: string) {
    if (this.dataCallback && this.isConnected) {
      this.dataCallback(line);
    }
  }

  /**
   * Format timestamp (YYMMDDhhmmss)
   */
  private formatTimestamp(ms: number): string {
    const d = new Date(ms);
    const YY = String(d.getFullYear() % 100).padStart(2, "0");
    const MM = String(d.getMonth() + 1).padStart(2, "0");
    const DD = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    return `${YY}${MM}${DD}${hh}${mm}${ss}`;
  }

  /**
   * Get current state
   */
  getState() {
    return {
      connected: this.isConnected,
      logCount: this.logs.length,
      battery: this.battery,
    };
  }
}

// Singleton instance
export const mockCoaster = new MockCoaster();
