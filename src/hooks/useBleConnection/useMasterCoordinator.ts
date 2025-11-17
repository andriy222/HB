import { Device } from "react-native-ble-plx";
import { useCoasterSession } from "./useCoasterSession";
import { useTimeSync } from "./useTimeSync";

/**
 * Master Coordinator Hook
 * 
 * Combines all logic:
 * - BLE connection
 * - Protocol handling
 * - Session management
 * - Time sync
 * - Reconnect handling
 * - Persistence
 * 
 * This is the MAIN hook for the app!
 */

interface MasterCoordinatorConfig {
  device: Device | null;
  isConnected: boolean;
  dlPerInterval?: number;
}

export function useMasterCoordinator(config: MasterCoordinatorConfig) {
  const coaster = useCoasterSession(config);

  const timeSync = useTimeSync({
    syncIntervalMinutes: 10,
    driftToleranceMs: 2000,
  });

  const getStatus = () => {
    return {
      bleReady: coaster.isBLEReady,
      bleConnected: config.isConnected,
      
      sessionActive: coaster.isSessionActive,
      stamina: coaster.session.stamina,
      distance: coaster.session.distance,
      currentInterval: coaster.session.currentInterval,
      elapsedTime: coaster.session.elapsedMinutes,
      remainingTime: coaster.session.remainingMinutes,
      avatarState: coaster.session.avatarState,
      
      protocolState: coaster.protocolState,
      dlCount: coaster.dlCount,
      
      timeVerified: timeSync.isVerified,
      timeDrift: timeSync.drift,
      
      battery: coaster.batteryLevel,
      
      reconnectCount: coaster.reconnectCount,
      missedIntervals: coaster.missedIntervals,
      
      lastError: coaster.lastError,
    };
  };


  const startRace = async () => {
    console.log("🏁 Starting race flow...");
    
    await coaster.requestLogs();
  };


  const manualSync = async () => {
    console.log("🔄 Manual sync...");
    await timeSync.manualSync();
    await coaster.sendGoalAndSync();
  };

  return {

    status: getStatus(),
    
    session: coaster.session,
    
    timeSync,
    
    startRace,
    manualSync,
    completeSession: coaster.completeSession,
    
    sendGoal: coaster.sendGoal,
    sendTimeSync: coaster.sendTimeSync,
    requestLogs: coaster.requestLogs,
    
    formatTime: coaster.session.formatTime,
    formatDistance: coaster.session.formatDistance,
    formatStamina: coaster.session.formatStamina,
  };
}