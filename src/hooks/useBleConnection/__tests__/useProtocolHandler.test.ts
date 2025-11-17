import { renderHook, act } from '@testing-library/react-native';
import { useProtocolHandler } from '../useProtocolHandler';

// Mock the BLE constants
jest.mock('../../../constants/bleConstants', () => ({
  BLE_TIMEOUTS: {
    PROTOCOL_IDLE_TIMEOUT: 3000,
  },
}));

describe('useProtocolHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('initial state', () => {
    it('should initialize with idle state', () => {
      const { result } = renderHook(() => useProtocolHandler());

      expect(result.current.state).toBe('idle');
      expect(result.current.dlCount).toBe(0);
      expect(result.current.lastError).toBeNull();
      expect(result.current.isWaitingForAck).toBe(false);
    });
  });

  describe('SDT (Start Data Transfer) handling', () => {
    it('should handle SDT command and transition to receiving state', () => {
      const onDataStart = jest.fn();
      const { result } = renderHook(() =>
        useProtocolHandler({ onDataStart })
      );

      act(() => {
        result.current.handleProtocolLine('SDT');
      });

      expect(result.current.state).toBe('receiving');
      expect(onDataStart).toHaveBeenCalledTimes(1);
    });

    it('should handle SDT with lowercase letters', () => {
      const onDataStart = jest.fn();
      const { result } = renderHook(() =>
        useProtocolHandler({ onDataStart })
      );

      act(() => {
        result.current.handleProtocolLine('sdt');
      });

      expect(result.current.state).toBe('receiving');
      expect(onDataStart).toHaveBeenCalledTimes(1);
    });

    it('should handle SDT with extra whitespace', () => {
      const onDataStart = jest.fn();
      const { result } = renderHook(() =>
        useProtocolHandler({ onDataStart })
      );

      act(() => {
        result.current.handleProtocolLine('  SDT  ');
      });

      expect(result.current.state).toBe('receiving');
      expect(onDataStart).toHaveBeenCalledTimes(1);
    });
  });

  describe('DL (Data Log) handling', () => {
    it('should count DL messages', () => {
      const { result } = renderHook(() => useProtocolHandler());

      act(() => {
        result.current.handleProtocolLine('DL,123,456,789');
      });

      expect(result.current.dlCount).toBe(1);
      expect(result.current.getDLCount()).toBe(1);
    });

    it('should increment DL count for multiple messages', () => {
      const { result } = renderHook(() => useProtocolHandler());

      act(() => {
        result.current.handleProtocolLine('DL,123,456,789');
        result.current.handleProtocolLine('DL,234,567,890');
        result.current.handleProtocolLine('DL,345,678,901');
      });

      expect(result.current.dlCount).toBe(3);
      expect(result.current.getDLCount()).toBe(3);
    });

    it('should reset idle timer on each DL message', () => {
      const { result } = renderHook(() => useProtocolHandler());

      // Start receiving
      act(() => {
        result.current.handleProtocolLine('SDT');
      });

      // Send first DL
      act(() => {
        result.current.handleProtocolLine('DL,123,456,789');
      });

      // Advance time but not past timeout
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(result.current.state).toBe('receiving');

      // Send another DL (resets timer)
      act(() => {
        result.current.handleProtocolLine('DL,234,567,890');
      });

      // Advance another 2 seconds (total would be 4s without reset, but timer was reset)
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(result.current.state).toBe('receiving');
    });

    it('should auto-complete after idle timeout', () => {
      const onDataComplete = jest.fn();
      const { result } = renderHook(() =>
        useProtocolHandler({ onDataComplete })
      );

      // Start receiving
      act(() => {
        result.current.handleProtocolLine('SDT');
      });

      // Send DL message
      act(() => {
        result.current.handleProtocolLine('DL,123,456,789');
        result.current.handleProtocolLine('DL,234,567,890');
      });

      expect(result.current.dlCount).toBe(2);

      // Advance time past idle timeout
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      expect(result.current.state).toBe('idle');
      expect(onDataComplete).toHaveBeenCalledWith(2);
    });
  });

  describe('END (End Data Transfer) handling', () => {
    it('should handle END command and transition to idle state', () => {
      const onDataComplete = jest.fn();
      const { result } = renderHook(() =>
        useProtocolHandler({ onDataComplete })
      );

      // Setup: start receiving and send some DL messages
      act(() => {
        result.current.handleProtocolLine('SDT');
        result.current.handleProtocolLine('DL,123,456,789');
        result.current.handleProtocolLine('DL,234,567,890');
      });

      expect(result.current.dlCount).toBe(2);

      // Send END command
      act(() => {
        result.current.handleProtocolLine('END');
      });

      expect(result.current.state).toBe('idle');
      expect(onDataComplete).toHaveBeenCalledWith(2);
    });

    it('should clear idle timer on END', () => {
      const onDataComplete = jest.fn();
      const { result } = renderHook(() =>
        useProtocolHandler({ onDataComplete })
      );

      act(() => {
        result.current.handleProtocolLine('SDT');
        result.current.handleProtocolLine('DL,123,456,789');
        result.current.handleProtocolLine('END');
      });

      // Advance time past idle timeout
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // onDataComplete should only be called once (from END, not from timeout)
      expect(onDataComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe('ACK handling', () => {
    it('should handle GOAL ACK when expecting it', () => {
      const onGoalAck = jest.fn();
      const { result } = renderHook(() =>
        useProtocolHandler({ onGoalAck })
      );

      act(() => {
        result.current.expectGoalAck();
        // Note: isWaitingForAck is computed from refs, so it updates immediately
      });

      act(() => {
        result.current.handleProtocolLine('ACK');
      });

      expect(onGoalAck).toHaveBeenCalledTimes(1);
    });

    it('should handle SYNC ACK when expecting it', () => {
      const onSyncAck = jest.fn();
      const { result } = renderHook(() =>
        useProtocolHandler({ onSyncAck })
      );

      act(() => {
        result.current.expectSyncAck();
      });

      expect(result.current.state).toBe('syncing');
      expect(result.current.isWaitingForAck).toBe(true);

      act(() => {
        result.current.handleProtocolLine('ACK');
      });

      expect(result.current.state).toBe('complete');
      expect(onSyncAck).toHaveBeenCalledTimes(1);
      expect(result.current.isWaitingForAck).toBe(false);
    });

    it('should handle ACK with no pending command', () => {
      const onGoalAck = jest.fn();
      const onSyncAck = jest.fn();
      const { result } = renderHook(() =>
        useProtocolHandler({ onGoalAck, onSyncAck })
      );

      act(() => {
        result.current.handleProtocolLine('ACK');
      });

      // Should not call any callbacks
      expect(onGoalAck).not.toHaveBeenCalled();
      expect(onSyncAck).not.toHaveBeenCalled();
    });

    it('should prioritize GOAL ACK over SYNC ACK', () => {
      const onGoalAck = jest.fn();
      const onSyncAck = jest.fn();
      const { result } = renderHook(() =>
        useProtocolHandler({ onGoalAck, onSyncAck })
      );

      act(() => {
        result.current.expectGoalAck();
        result.current.expectSyncAck();
      });

      act(() => {
        result.current.handleProtocolLine('ACK');
      });

      // Should call GOAL ACK first
      expect(onGoalAck).toHaveBeenCalledTimes(1);
      expect(onSyncAck).not.toHaveBeenCalled();

      // Next ACK should call SYNC ACK
      act(() => {
        result.current.handleProtocolLine('ACK');
      });

      expect(onSyncAck).toHaveBeenCalledTimes(1);
    });
  });

  describe('ERR (Error) handling', () => {
    it('should handle ERR command and transition to error state', () => {
      const onError = jest.fn();
      const { result } = renderHook(() =>
        useProtocolHandler({ onError })
      );

      act(() => {
        result.current.handleProtocolLine('ERR,timeout');
      });

      expect(result.current.state).toBe('error');
      expect(result.current.lastError).toBe(',timeout');
      expect(onError).toHaveBeenCalledWith(',timeout');
    });

    it('should handle ERR without message', () => {
      const onError = jest.fn();
      const { result } = renderHook(() =>
        useProtocolHandler({ onError })
      );

      act(() => {
        result.current.handleProtocolLine('ERR');
      });

      expect(result.current.state).toBe('error');
      expect(result.current.lastError).toBe('Unknown error');
      expect(onError).toHaveBeenCalledWith('Unknown error');
    });

    it('should handle ERR with detailed message', () => {
      const onError = jest.fn();
      const { result } = renderHook(() =>
        useProtocolHandler({ onError })
      );

      act(() => {
        result.current.handleProtocolLine('ERR,Connection lost');
      });

      expect(result.current.state).toBe('error');
      expect(result.current.lastError).toBe(',Connection lost');
      expect(onError).toHaveBeenCalledWith(',Connection lost');
    });
  });

  describe('startDataTransfer', () => {
    it('should reset DL count and transition to requesting state', () => {
      const { result } = renderHook(() => useProtocolHandler());

      // Send some DL messages first
      act(() => {
        result.current.handleProtocolLine('SDT');
        result.current.handleProtocolLine('DL,123,456,789');
      });

      expect(result.current.dlCount).toBe(1);

      // Start new data transfer
      act(() => {
        result.current.startDataTransfer();
      });

      expect(result.current.state).toBe('requesting');
      expect(result.current.dlCount).toBe(0);
      expect(result.current.getDLCount()).toBe(0);
    });
  });

  describe('reset', () => {
    it('should reset all state to initial values', () => {
      const { result } = renderHook(() => useProtocolHandler());

      // Setup: set various states
      act(() => {
        result.current.startDataTransfer();
        result.current.handleProtocolLine('SDT');
        result.current.handleProtocolLine('DL,123,456,789');
        result.current.handleProtocolLine('DL,234,567,890');
        result.current.expectGoalAck();
      });

      expect(result.current.state).not.toBe('idle');
      expect(result.current.dlCount).toBe(2);
      expect(result.current.isWaitingForAck).toBe(true);

      // Reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.state).toBe('idle');
      expect(result.current.dlCount).toBe(0);
      expect(result.current.lastError).toBeNull();
      expect(result.current.isWaitingForAck).toBe(false);
      expect(result.current.getDLCount()).toBe(0);
    });

    it('should clear idle timer on reset', () => {
      const onDataComplete = jest.fn();
      const { result } = renderHook(() =>
        useProtocolHandler({ onDataComplete })
      );

      act(() => {
        result.current.handleProtocolLine('SDT');
        result.current.handleProtocolLine('DL,123,456,789');
        result.current.reset();
      });

      // Advance time past idle timeout
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // onDataComplete should not be called because timer was cleared
      expect(onDataComplete).not.toHaveBeenCalled();
    });
  });

  describe('protocol line parsing', () => {
    it('should handle mixed case protocol commands', () => {
      const { result } = renderHook(() => useProtocolHandler());

      act(() => {
        result.current.handleProtocolLine('aCK');
      });

      // Should handle as ACK
      expect(result.current.handleProtocolLine('aCK')).toBe(true);
    });

    it('should return true for recognized commands', () => {
      const { result } = renderHook(() => useProtocolHandler());

      act(() => {
        expect(result.current.handleProtocolLine('SDT')).toBe(true);
        expect(result.current.handleProtocolLine('DL,1,2,3')).toBe(true);
        expect(result.current.handleProtocolLine('END')).toBe(true);
        expect(result.current.handleProtocolLine('ACK')).toBe(true);
        expect(result.current.handleProtocolLine('ERR')).toBe(true);
      });
    });

    it('should return false for unrecognized commands', () => {
      const { result } = renderHook(() => useProtocolHandler());

      act(() => {
        expect(result.current.handleProtocolLine('UNKNOWN')).toBe(false);
        expect(result.current.handleProtocolLine('INVALID')).toBe(false);
        expect(result.current.handleProtocolLine('123456')).toBe(false);
      });
    });

    it('should handle empty strings', () => {
      const { result } = renderHook(() => useProtocolHandler());

      act(() => {
        expect(result.current.handleProtocolLine('')).toBe(false);
        expect(result.current.handleProtocolLine('   ')).toBe(false);
      });
    });
  });

  describe('full workflow', () => {
    it('should handle complete data transfer workflow', () => {
      const callbacks = {
        onDataStart: jest.fn(),
        onDataComplete: jest.fn(),
      };
      const { result } = renderHook(() => useProtocolHandler(callbacks));

      // 1. Request data transfer
      act(() => {
        result.current.startDataTransfer();
      });
      expect(result.current.state).toBe('requesting');

      // 2. Receive SDT
      act(() => {
        result.current.handleProtocolLine('SDT');
      });
      expect(result.current.state).toBe('receiving');
      expect(callbacks.onDataStart).toHaveBeenCalledTimes(1);

      // 3. Receive multiple DL messages
      act(() => {
        result.current.handleProtocolLine('DL,100,200,300');
        result.current.handleProtocolLine('DL,101,201,301');
        result.current.handleProtocolLine('DL,102,202,302');
      });
      expect(result.current.dlCount).toBe(3);

      // 4. Receive END
      act(() => {
        result.current.handleProtocolLine('END');
      });
      expect(result.current.state).toBe('idle');
      expect(callbacks.onDataComplete).toHaveBeenCalledWith(3);
    });

    it('should handle sync workflow', () => {
      const callbacks = {
        onSyncAck: jest.fn(),
      };
      const { result } = renderHook(() => useProtocolHandler(callbacks));

      // 1. Expect sync ACK
      act(() => {
        result.current.expectSyncAck();
      });
      expect(result.current.state).toBe('syncing');

      // 2. Receive ACK
      act(() => {
        result.current.handleProtocolLine('ACK');
      });
      expect(result.current.state).toBe('complete');
      expect(callbacks.onSyncAck).toHaveBeenCalledTimes(1);
    });

    it('should handle error during data transfer', () => {
      const callbacks = {
        onDataStart: jest.fn(),
        onError: jest.fn(),
      };
      const { result } = renderHook(() => useProtocolHandler(callbacks));

      // Start data transfer
      act(() => {
        result.current.startDataTransfer();
        result.current.handleProtocolLine('SDT');
        result.current.handleProtocolLine('DL,100,200,300');
      });

      // Receive error
      act(() => {
        result.current.handleProtocolLine('ERR,timeout');
      });

      expect(result.current.state).toBe('error');
      expect(callbacks.onError).toHaveBeenCalledWith(',timeout');
    });
  });
});
