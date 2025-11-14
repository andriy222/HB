import { StyleSheet } from 'react-native';
import { colors, textPresets } from '../../theme';
export const styles = StyleSheet.create({
  button: {
    width: 216,
    height: 39,
    borderRadius: 19.5,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2
  },

  fullWidth: {
    width: "100%",
  },

  pressed: {
    opacity: 0.8,
  },

  disabled: {
    opacity: 0.5,
  },

  primary: {
    backgroundColor: colors.primary,
    borderBottomWidth:4
  },
  secondary: {
    backgroundColor: colors.white,
    borderBottomWidth:4,
    borderColor: colors.black,
  },
  outline: {
    backgroundColor: "transparent",
    borderColor: colors.black,
  },
  big: {
    width: 169,
    height: 57,
    backgroundColor: colors.primary, 
    borderLeftWidth: 4,
    borderBottomWidth: 4,
    paddingRight: 4, 
    paddingTop: 4,
  },
  text: {
    ...textPresets.button,
  },

  primaryText: {
    color: colors.black,
  },
  secondaryText: {
    color: colors.black,
  },
  outlineText: {
    color: colors.black,
  },
  textWrapper: {
  position: "absolute",
  width: "100%",
  height: "100%",
  justifyContent: "center",
  alignItems: "center",
  paddingRight: 2, 
  paddingTop: 2,   
},
  bigText: {
    color: colors.black,
    ...textPresets.bigBtnText,
  },
});