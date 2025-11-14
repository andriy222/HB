import React from "react";
import { View } from "react-native";
import { Text } from "react-native-paper";
import { styles } from "./Label.styles";

const Label = () => {
  return (
    <View style={styles.labelBox}>
      <Text variant="displayMedium">Choose your avatar</Text>
    </View>
  );
};

export default Label;
