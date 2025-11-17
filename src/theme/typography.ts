export const typography = {
  fontFamily: {
    sora: {
      regular: 'Sora_400Regular',
      medium: 'Sora_500Medium',
      semiBold: 'Sora_600SemiBold',
      bold: 'Sora_700Bold',
    },
    inter: {
      regular: 'Inter_400Regular',
      medium: 'Inter_500Medium',
      semiBold: 'Inter_600SemiBold',
      bold: 'Inter_700Bold',
    },
  },
  fontSize: {
    xs: 10,
    sm: 12,
    md: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '4.5xl': 40,
    '5xl': 48,
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
    loose: 2,
  },
  letterSpacing: {
    tighter: -0.41,
    tight: -0.25,
    normal: 0,
    wide: 0.25,
    wider: 0.5,
  },
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semiBold: '600' as const,
    bold: '700' as const,
  },
};