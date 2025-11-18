/**
 * Base64 Encoding/Decoding Utilities with Fallbacks
 *
 * Provides cross-platform base64 encoding/decoding with proper fallbacks
 * for environments where atob/btoa are not available.
 */

/**
 * Decode Base64 to UTF-8 string
 *
 * This function provides a robust base64 decode implementation with fallbacks:
 * 1. Try native atob (available in modern environments)
 * 2. Fallback to manual decoding if atob is not available
 *
 * @param base64 - Base64 encoded string
 * @returns Decoded UTF-8 string
 */
export function base64Decode(base64: string): string {
  // Validate input
  if (!base64 || typeof base64 !== "string") {
    throw new Error("Base64 decode failed: input must be a non-empty string");
  }

  // Basic base64 format validation
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
  if (!base64Regex.test(base64)) {
    throw new Error("Base64 decode failed: invalid base64 format");
  }

  try {
    // Method 1: Try native atob (most common)
    if (typeof atob === "function") {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return new TextDecoder("utf-8").decode(bytes);
    }

    // Method 2: Fallback - manual base64 decode
    return manualBase64Decode(base64);
  } catch (error) {
    console.error("Failed to decode base64:", error);
    throw new Error(`Base64 decode failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Encode UTF-8 string to Base64
 *
 * This function provides a robust base64 encode implementation with fallbacks:
 * 1. Try native btoa (available in modern environments)
 * 2. Fallback to manual encoding if btoa is not available
 *
 * @param str - UTF-8 string to encode
 * @returns Base64 encoded string
 */
export function base64Encode(str: string): string {
  // Validate input
  if (str === null || str === undefined) {
    throw new Error("Base64 encode failed: input cannot be null or undefined");
  }

  if (typeof str !== "string") {
    throw new Error("Base64 encode failed: input must be a string");
  }

  try {
    // Method 1: Try native btoa (most common)
    if (typeof btoa === "function") {
      // For Unicode strings, we need to encode properly
      const encoder = new TextEncoder();
      const bytes = encoder.encode(str);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    }

    // Method 2: Fallback - manual base64 encode
    return manualBase64Encode(str);
  } catch (error) {
    console.error("Failed to encode base64:", error);
    throw new Error(`Base64 encode failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Manual Base64 decode implementation
 * Used as fallback when atob is not available
 */
function manualBase64Decode(base64: string): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let output = "";
  let buffer = 0;
  let bits = 0;

  for (let i = 0; i < base64.length; i++) {
    const char = base64[i];
    if (char === "=") break;

    const value = chars.indexOf(char);
    if (value === -1) continue;

    buffer = (buffer << 6) | value;
    bits += 6;

    if (bits >= 8) {
      bits -= 8;
      output += String.fromCharCode((buffer >> bits) & 0xff);
    }
  }

  return output;
}

/**
 * Manual Base64 encode implementation
 * Used as fallback when btoa is not available
 */
function manualBase64Encode(str: string): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);

  let output = "";
  let buffer = 0;
  let bits = 0;

  for (let i = 0; i < bytes.length; i++) {
    buffer = (buffer << 8) | bytes[i];
    bits += 8;

    while (bits >= 6) {
      bits -= 6;
      output += chars[(buffer >> bits) & 0x3f];
    }
  }

  if (bits > 0) {
    buffer <<= 6 - bits;
    output += chars[buffer & 0x3f];
  }

  // Add padding
  while (output.length % 4 !== 0) {
    output += "=";
  }

  return output;
}
