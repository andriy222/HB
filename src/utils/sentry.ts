/**
 * Sentry Error Tracking Configuration
 *
 * Provides centralized error tracking and monitoring using Sentry.
 * This file should be initialized early in the app lifecycle.
 */

import * as Sentry from "@sentry/react-native";

/**
 * Initialize Sentry
 *
 * Call this function at app startup (in App.tsx or index.js)
 *
 * @param dsn - Sentry Data Source Name (get from Sentry project settings)
 * @param environment - Environment name (development, staging, production)
 */
export function initSentry(
  dsn: string = process.env.SENTRY_DSN || "",
  environment: string = __DEV__ ? "development" : "production"
) {
  if (!dsn) {
    console.warn("⚠️ Sentry DSN not configured. Error tracking disabled.");
    return;
  }

  Sentry.init({
    dsn,
    environment,

    // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
    // We recommend adjusting this value in production
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,

    // If true, Sentry will try to print out useful debugging information
    debug: __DEV__,

    // Enable automatic breadcrumbs for navigation, network, etc.
    enableAutoSessionTracking: true,
    sessionTrackingIntervalMillis: 10000,

    // Attach stack traces to messages
    attachStacktrace: true,

    // Capture unhandled promise rejections
    enableCaptureFailedRequests: true,

    // Integrate with React Navigation if available
    integrations: [
      new Sentry.ReactNativeTracing({
        tracingOrigins: ["localhost", /^\//],
        routingInstrumentation: Sentry.reactNavigationIntegration(),
      }),
    ],

    // Filter out sensitive information
    beforeSend(event, hint) {
      // Remove sensitive data from events
      if (event.request?.headers) {
        delete event.request.headers["Authorization"];
        delete event.request.headers["Cookie"];
      }

      return event;
    },
  });

  console.log("✅ Sentry initialized");
}

/**
 * Capture an exception with Sentry
 *
 * @param error - Error object or string
 * @param context - Additional context (optional)
 */
export function captureError(
  error: Error | string,
  context?: Record<string, any>
) {
  if (context) {
    Sentry.setContext("error_context", context);
  }

  if (typeof error === "string") {
    Sentry.captureMessage(error, "error");
  } else {
    Sentry.captureException(error);
  }
}

/**
 * Capture a BLE-specific error
 *
 * @param operation - BLE operation that failed (e.g., "scan", "connect", "subscribe")
 * @param error - Error object or message
 * @param deviceId - Device ID (optional)
 */
export function captureBLEError(
  operation: string,
  error: Error | string,
  deviceId?: string
) {
  const context = {
    operation,
    deviceId,
    category: "bluetooth",
  };

  captureError(error, context);
  console.error(`[BLE Error] ${operation}:`, error);
}

/**
 * Set user context for Sentry
 *
 * @param userId - User ID
 * @param userData - Additional user data (optional)
 */
export function setUserContext(
  userId: string,
  userData?: Record<string, any>
) {
  Sentry.setUser({
    id: userId,
    ...userData,
  });
}

/**
 * Add a breadcrumb to Sentry
 *
 * Breadcrumbs are useful for tracking the sequence of events leading to an error
 *
 * @param message - Breadcrumb message
 * @param category - Category (e.g., "bluetooth", "session", "ui")
 * @param level - Severity level
 * @param data - Additional data (optional)
 */
export function addBreadcrumb(
  message: string,
  category: string,
  level: "debug" | "info" | "warning" | "error" | "fatal" = "info",
  data?: Record<string, any>
) {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
  });
}

/**
 * Track a BLE event as breadcrumb
 *
 * @param event - Event name (e.g., "device_connected", "data_received")
 * @param data - Event data
 */
export function trackBLEEvent(event: string, data?: Record<string, any>) {
  addBreadcrumb(event, "bluetooth", "info", data);
}

/**
 * Track a session event as breadcrumb
 *
 * @param event - Event name (e.g., "session_started", "interval_completed")
 * @param data - Event data
 */
export function trackSessionEvent(event: string, data?: Record<string, any>) {
  addBreadcrumb(event, "session", "info", data);
}

/**
 * Clear user context (e.g., on logout)
 */
export function clearUserContext() {
  Sentry.setUser(null);
}

// Export Sentry instance for advanced usage
export { Sentry };
