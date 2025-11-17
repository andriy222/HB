import { base64Decode, base64Encode } from '../base64';

describe('base64', () => {
  describe('base64Encode', () => {
    it('should encode simple ASCII strings correctly', () => {
      expect(base64Encode('hello')).toBe('aGVsbG8=');
      expect(base64Encode('world')).toBe('d29ybGQ=');
      expect(base64Encode('test')).toBe('dGVzdA==');
    });

    it('should encode empty string', () => {
      expect(base64Encode('')).toBe('');
    });

    it('should encode single character', () => {
      expect(base64Encode('a')).toBe('YQ==');
      expect(base64Encode('1')).toBe('MQ==');
    });

    it('should encode numbers as strings', () => {
      expect(base64Encode('123')).toBe('MTIz');
      expect(base64Encode('42')).toBe('NDI=');
    });

    it('should encode special characters', () => {
      expect(base64Encode('!@#$%')).toBe('IUAjJCU=');
      expect(base64Encode('()[]{}')). toBe('KClbXXt9');
    });

    it('should encode strings with spaces', () => {
      expect(base64Encode('hello world')).toBe('aGVsbG8gd29ybGQ=');
      expect(base64Encode('a b c')).toBe('YSBiIGM=');
    });

    it('should encode Unicode characters correctly', () => {
      expect(base64Encode('привіт')).toBeTruthy(); // Ukrainian
      expect(base64Encode('你好')).toBeTruthy(); // Chinese
      expect(base64Encode('🚀')).toBeTruthy(); // Emoji
    });

    it('should encode multiline strings', () => {
      const multiline = 'line1\nline2\nline3';
      const encoded = base64Encode(multiline);
      expect(encoded).toBeTruthy();
      expect(encoded.length).toBeGreaterThan(0);
    });

    it('should handle long strings', () => {
      const longString = 'a'.repeat(1000);
      const encoded = base64Encode(longString);
      expect(encoded).toBeTruthy();
      expect(encoded.length).toBeGreaterThan(1000);
    });
  });

  describe('base64Decode', () => {
    it('should decode simple ASCII strings correctly', () => {
      expect(base64Decode('aGVsbG8=')).toBe('hello');
      expect(base64Decode('d29ybGQ=')).toBe('world');
      expect(base64Decode('dGVzdA==')).toBe('test');
    });

    it('should decode empty string', () => {
      expect(base64Decode('')).toBe('');
    });

    it('should decode single character', () => {
      expect(base64Decode('YQ==')).toBe('a');
      expect(base64Decode('MQ==')).toBe('1');
    });

    it('should decode numbers as strings', () => {
      expect(base64Decode('MTIz')).toBe('123');
      expect(base64Decode('NDI=')).toBe('42');
    });

    it('should decode special characters', () => {
      expect(base64Decode('IUAjJCU=')).toBe('!@#$%');
      expect(base64Decode('KClbXXt9')).toBe('()[]{}');
    });

    it('should decode strings with spaces', () => {
      expect(base64Decode('aGVsbG8gd29ybGQ=')).toBe('hello world');
      expect(base64Decode('YSBiIGM=')).toBe('a b c');
    });

    it('should handle base64 without padding', () => {
      // Some base64 implementations omit padding
      expect(base64Decode('YQ')).toBeTruthy();
      expect(base64Decode('dGVzdA')).toBeTruthy();
    });
  });

  describe('round-trip encoding/decoding', () => {
    it('should correctly round-trip simple strings', () => {
      const testStrings = ['hello', 'world', 'test', '123', 'a b c'];

      testStrings.forEach(str => {
        const encoded = base64Encode(str);
        const decoded = base64Decode(encoded);
        expect(decoded).toBe(str);
      });
    });

    it('should correctly round-trip special characters', () => {
      const testStrings = ['!@#$%^&*()', '{}[]<>', '\n\t\r', 'a\nb\tc'];

      testStrings.forEach(str => {
        const encoded = base64Encode(str);
        const decoded = base64Decode(encoded);
        expect(decoded).toBe(str);
      });
    });

    it('should correctly round-trip Unicode strings', () => {
      const testStrings = [
        'привіт світ', // Ukrainian
        '你好世界', // Chinese
        'مرحبا', // Arabic
        '🚀🎉✨', // Emojis
      ];

      testStrings.forEach(str => {
        const encoded = base64Encode(str);
        const decoded = base64Decode(encoded);
        expect(decoded).toBe(str);
      });
    });

    it('should correctly round-trip long strings', () => {
      const longString = 'The quick brown fox jumps over the lazy dog. '.repeat(100);
      const encoded = base64Encode(longString);
      const decoded = base64Decode(encoded);
      expect(decoded).toBe(longString);
    });

    it('should correctly round-trip JSON strings', () => {
      const jsonString = JSON.stringify({
        name: 'Test User',
        age: 30,
        active: true,
        data: [1, 2, 3, 4, 5],
      });

      const encoded = base64Encode(jsonString);
      const decoded = base64Decode(encoded);
      expect(decoded).toBe(jsonString);
      expect(JSON.parse(decoded)).toEqual(JSON.parse(jsonString));
    });

    it('should correctly round-trip empty string', () => {
      const encoded = base64Encode('');
      const decoded = base64Decode(encoded);
      expect(decoded).toBe('');
    });
  });

  describe('error handling', () => {
    it('should handle invalid base64 strings gracefully', () => {
      // Invalid base64 characters should be handled
      expect(() => base64Decode('!!!!')).toThrow();
    });

    it('should throw error with descriptive message on decode failure', () => {
      try {
        base64Decode('!@#$%');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Base64 decode failed');
      }
    });
  });

  describe('BLE protocol compatibility', () => {
    // Test cases specific to BLE protocol messages
    it('should encode/decode BLE protocol messages', () => {
      const bleMessages = [
        'DL,123,456,789',
        'DEV,42.195,100',
        'ACK',
        'END',
        'ERR,timeout',
      ];

      bleMessages.forEach(msg => {
        const encoded = base64Encode(msg);
        const decoded = base64Decode(encoded);
        expect(decoded).toBe(msg);
      });
    });

    it('should handle BLE data with numbers and decimals', () => {
      const bleData = 'SENSOR,12.5,34.7,56.9,100.0';
      const encoded = base64Encode(bleData);
      const decoded = base64Decode(encoded);
      expect(decoded).toBe(bleData);
    });

    it('should preserve comma-separated values', () => {
      const csv = '1,2,3,4,5,6,7,8,9,10';
      const encoded = base64Encode(csv);
      const decoded = base64Decode(encoded);
      expect(decoded).toBe(csv);
    });
  });

  describe('performance', () => {
    it('should handle encoding many strings efficiently', () => {
      const startTime = Date.now();

      for (let i = 0; i < 1000; i++) {
        base64Encode(`test string ${i}`);
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Should complete in less than 1 second
    });

    it('should handle decoding many strings efficiently', () => {
      const encoded = base64Encode('test string');
      const startTime = Date.now();

      for (let i = 0; i < 1000; i++) {
        base64Decode(encoded);
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Should complete in less than 1 second
    });
  });
});
