import { colors } from "./colors";
import { typography } from "./typography";
// TODO should be customed according project needs

export const textPresets = {
  // Button text (Sora Medium 16px)
  button: {
    fontFamily: typography.fontFamily.sora.medium,
    fontSize: typography.fontSize.base, 
    lineHeight: 22,
    letterSpacing: typography.letterSpacing.tighter, 
    textAlign: 'center' as const,
    fontWeight: typography.fontWeight.medium,
  },

  // Input label (Sora Medium 12px)
  inputLabel: {
    fontFamily: typography.fontFamily.sora.medium,
    fontSize: typography.fontSize.sm,
    lineHeight: 22,
    letterSpacing: typography.letterSpacing.tighter, 
    fontWeight: typography.fontWeight.medium,
  },

  // Input placeholder (Inter Regular 12px)
  inputPlaceholder: {
    fontFamily: typography.fontFamily.inter.regular,
    fontSize: typography.fontSize.sm, 
    lineHeight: 22,
    letterSpacing: typography.letterSpacing.tighter, 
    fontWeight: typography.fontWeight.regular,
  },

  // Input text (Inter Regular 12px)
  inputText: {
    fontFamily: typography.fontFamily.inter.regular,
    fontSize: typography.fontSize.sm, 
    lineHeight: 22,
    letterSpacing: typography.letterSpacing.tighter,
    fontWeight: typography.fontWeight.regular,
  },

  // Heading 
  heading: {
    fontFamily: typography.fontFamily.sora.bold,
    fontSize: typography.fontSize['2xl'],
    lineHeight: 32,
    letterSpacing: typography.letterSpacing.tight,
    fontWeight: typography.fontWeight.bold,
  },

  // Logo text
  logo: {
    fontFamily: typography.fontFamily.sora.medium,
    fontSize: typography.fontSize['5xl'],
    letterSpacing: typography.letterSpacing.wider,
    fontWeight: typography.fontWeight.regular,
  },

  titleSecondary: {
    fontFamily: typography.fontFamily.sora.medium,
    fontWeight: typography.fontWeight.medium,
    letterSpacing: typography.letterSpacing.normal,
    lineHeight:100,
    fontSize:typography.fontSize['2xl'],
    color: colors.text.primary
  },
  subTitleSecondary: {
    fontFamily: typography.fontFamily.sora.medium,
    fontWeight: typography.fontWeight.medium,
    letterSpacing: typography.letterSpacing.normal,
    lineHeight: 100,
    fontSize:typography.fontSize['2xl'],
    color: colors.text.gray
  },
  // Body text 
  body: {
    fontFamily: typography.fontFamily.inter.regular,
    fontSize: typography.fontSize.base,
    lineHeight: 24,
    letterSpacing: typography.letterSpacing.normal,
    fontWeight: typography.fontWeight.regular,
  },

  // Caption
  caption: {
    fontFamily: typography.fontFamily.inter.regular,
    fontSize: typography.fontSize.xs, // 10px
    lineHeight: 16,
    letterSpacing: typography.letterSpacing.normal,
    fontWeight: typography.fontWeight.regular,
  },

  // Link text
  link: {
    fontFamily: typography.fontFamily.inter.medium,
    fontSize: typography.fontSize.md, // 14px
    lineHeight: 20,
    letterSpacing: typography.letterSpacing.normal,
    fontWeight: typography.fontWeight.medium,
    textDecorationLine: 'underline' as const,
  },
  labelText: {
    fontFamily: typography.fontFamily.sora.medium,
    fontWeight: typography.fontWeight.medium,
    fontSize: typography.fontSize["2xl"], 
    lineHeight: 0,
    letterSpacing: typography.letterSpacing.normal,
    textAlign: "center" as const,
  },
  onBoardingBodyText: {
    fontFamily: typography.fontFamily.sora.regular,
    fontWeight: typography.fontWeight.regular,
    fontSize: typography.fontSize.base, 
    letterSpacing: typography.letterSpacing.normal,
    textAlign: "center" as const,
  },
  startBodyText: {
    fontFamily: typography.fontFamily.sora.medium,
    fontWeight: typography.fontWeight.medium,
    fontSize: typography.fontSize.base, 
    letterSpacing: typography.letterSpacing.normal,
  },
  bigBtnText: {
    fontFamily: typography.fontFamily.sora.medium,
    fontWeight: typography.fontWeight.medium,
    letterSpacing: typography.letterSpacing.tighter,
    fontSize: typography.fontSize["2xl"], 
    lineHeight: 22
  },
  //modalTitle 
  modalTitle: {
    fontFamily: typography.fontFamily.sora.medium,
    fontWeight: typography.fontWeight.medium,
    letterSpacing: typography.letterSpacing.normal,
    fontSize: typography.fontSize["2xl"], 
    lineHeight: 0,
    textAlign: "center" as const,
    color: colors.text.primary
  },
  modalTextPrimary: {
    fontFamily: typography.fontFamily.sora.medium,
    fontWeight: typography.fontWeight.medium,
    letterSpacing: typography.letterSpacing.normal,
    fontSize: typography.fontSize.md, 
    lineHeight: 0,
    textAlign: "center" as const,
    color: colors.text.primary
  },

  modalSubtitle: {
    fontFamily: typography.fontFamily.sora.regular,
    fontWeight: typography.fontWeight.regular,
    letterSpacing: typography.letterSpacing.normal,
    fontSize: typography.fontSize.base, 
    lineHeight: "126%",
    textAlign: "center" as const,
    color: colors.text.primary
  },
  modalTextSecondary: {
    fontFamily: typography.fontFamily.inter.regular,
    fontWeight: typography.fontWeight.regular,
    fontSize: typography.fontSize.md, 
    lineHeight: "121%",
    letterSpacing: typography.letterSpacing.normal,
    textAlign: "center" as const,
    colors: colors.text.secondaryGray
  },
  coasterText: {
    fontFamily: typography.fontFamily.sora.medium,
    fontWeight: typography.fontWeight.medium,
    fontSize: typography.fontSize.xl, 
    letterSpacing: typography.letterSpacing.normal,
    colors: colors.text.primary
  },
  coasterTextSecondary: {
    fontFamily: typography.fontFamily.sora.medium,
    fontWeight: typography.fontWeight.medium,
    fontSize: typography.fontSize.base,
    letterSpacing: typography.letterSpacing.normal,
    colors: colors.text.primary
  },
  connectionLabel: {
    fontFamily: typography.fontFamily.inter.semiBold,
    fontWeight: typography.fontWeight.semiBold,
    lineHeight: 1.21,
    fontSize: typography.fontSize.md,
  },

  progressText: {
    fontFamily: typography.fontFamily.sora.medium,
    fontWeight: typography.fontWeight.medium,
    fontSize: typography.fontSize["4.5xl"],
    // lineHeight: "22px",
    letterSpacing: typography.letterSpacing.normal,
  },
  bestRun: {
    fontFamily: typography.fontFamily.sora.medium,
    fontWeight: typography.fontWeight.medium,
    fontSize: typography.fontSize.base,
    letterSpacing: typography.letterSpacing.normal,
  }
};


export const defaultTextStyle = textPresets.inputText;