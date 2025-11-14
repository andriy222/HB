import { ImageBackground } from "react-native";
import { styles } from "./SplashScreen.styles";
const backgroundImage = require("../../../../assets/images/background.png");

export default function SplashScreen() {
  return (
    <ImageBackground
      source={backgroundImage}
      style={styles.splash}
      resizeMode="cover"
    />
  );
}
