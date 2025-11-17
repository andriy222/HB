import { ImageBackground, View } from "react-native";
import { styles } from "./Podium.styles";

const raceWay = require("../../../assets/images/race-way.png");

interface PodiumProps {
  isMain?: boolean;
}

export default function Podium({ isMain = false }: PodiumProps) {
  if (isMain) {
    return (
      <View style={styles.mainContainer}>
        <ImageBackground
          source={raceWay}
          resizeMode="contain"
          style={styles.raceWay}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.whiteLine} />
      <View style={styles.whiteLineSecond} />
    </View>
  );
}
