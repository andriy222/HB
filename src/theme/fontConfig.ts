import { MD3Typescale } from "react-native-paper/lib/typescript/types";
import { typography } from "./typography";


export const fontConfig: MD3Typescale = {
    //logo
  displayLarge: {
    fontFamily: typography.fontFamily.sora.medium,
    fontSize: 48,
    fontWeight: "400",
    letterSpacing: 5,
    lineHeight: 0,
  },

  displayMedium: {
    fontFamily: typography.fontFamily.sora.medium,
    fontSize: 24,
    fontWeight: "500",
    letterSpacing: 0,
    lineHeight: 0,
  },

  displaySmall: {
    fontFamily: typography.fontFamily.sora.bold,
    fontSize: 36,
    fontWeight: "400",
    letterSpacing: 0,
    lineHeight: 44,
  },
  headlineLarge: {
    fontFamily: typography.fontFamily.sora.medium,
    fontSize: 32,
    fontWeight: "400",
    letterSpacing: 0,
    lineHeight: 0,
  },
  headlineMedium: {
    fontFamily: typography.fontFamily.sora.semiBold,
    fontSize: 28,
    fontWeight: "400",
    letterSpacing: 0,
    lineHeight: 36,
  },
  headlineSmall: {
    fontFamily: typography.fontFamily.sora.semiBold,
    fontSize: 24,
    fontWeight: "400",
    letterSpacing: 0,
    lineHeight: 32,
  },
  //forgot your password
  titleLarge: {
    fontFamily: typography.fontFamily.sora.medium,
    fontSize: 24,
    fontWeight: "500",
    letterSpacing: 0,
    lineHeight: 0,
  },
  titleMedium: {
    fontFamily: typography.fontFamily.sora.medium,
    fontSize: 16,
    fontWeight: "500",
    letterSpacing: 0.15,
    lineHeight: 24,
  },
  titleSmall: {
    fontFamily: typography.fontFamily.sora.medium,
    fontSize: 14,
    fontWeight: "500",
    letterSpacing: 0.1,
    lineHeight: 20,
  },
  labelLarge: {
    fontFamily: typography.fontFamily.sora.medium,
    fontSize: 14,
    fontWeight: "500",
    letterSpacing: 0.1,
    lineHeight: 20,
  },
  // signup input labels 
  labelMedium: {
    fontFamily: typography.fontFamily.sora.medium,
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.4,
    lineHeight: 22,
  },

  labelSmall: {
    fontFamily: typography.fontFamily.sora.medium,
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 0.5,
    lineHeight: 16,
  },
  //forgetpassword body text
  bodyLarge: {
    fontFamily: typography.fontFamily.sora.medium,
    fontSize: 16,
    fontWeight: "500",
    letterSpacing: 0,
    lineHeight: 0,
  },

  // links and placeholders
  bodyMedium: {
    fontFamily: typography.fontFamily.inter.regular,
    fontSize: 12,
    fontWeight: "400",
    letterSpacing: 0.4,
    lineHeight: 22,
  },
  //errors input
  bodySmall: {
    fontFamily: typography.fontFamily.inter.medium,
    fontWeight: "500",
    fontSize: 8,
    lineHeight: 12,
    letterSpacing: -0.5, 
  },
  default: {
    fontFamily: typography.fontFamily.inter.regular,
    fontWeight: "400",
    letterSpacing: 0.5,
  },

};


