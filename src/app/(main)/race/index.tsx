import React, { useEffect, useState } from "react";
import AuthBackground from "../../../UI/layout/backgrounds/AuthBackground";
import { debugStorage, storage } from "../../../store/bleStore";
import Podium from "../../../components/Podium/Podium";
import BottomNavigation from "../../../components/BottomNavigation/BottomNavigation";
import SpriteAnimator from "../../../components/SpriteAnimator/SpriteAnimator";
import { AVATAR_SIZE, FEMALE, MALE } from "../../../utils/constants";
import { Gender, getSelectedGender } from "../../../utils/storage";
import { View, StyleSheet, Dimensions, Text } from "react-native";
import ConnectionAlerts from "../../../components/ConnectionAlert/ConnectionAlerts";
import PaperButton from "../../../UI/PaperButton/PaperButton";
import PaperProgressBar from "../../../UI/PaperProgressBar/PaperProgressBar";
import { SESSION_CONFIG } from "../../../constants/sessionConstants";
import { textPresets } from "../../../theme";

const { width } = Dimensions.get("window");
const Main = () => {
  const [selectedGender, setSelectedGender] = useState<Gender>("male");

  function handleStart() {
    console.log("start");
  }
  useEffect(() => {
    debugStorage();
    const gender = getSelectedGender();
    console.log(gender);
    setSelectedGender(gender);
  }, [storage]);
  return (
    <AuthBackground
      isMain={true}
      isSecondary={false}
      footer={<BottomNavigation />}
    >
      <ConnectionAlerts />
      {/* <PaperButton onPress={handleClear}>clear all</PaperButton> */}
      <View style={styles.runningContainer}>
        <View style={styles.avatarContainer}>
          <SpriteAnimator
            source={
              selectedGender === "male"
                ? MALE.frontPoseSprite
                : FEMALE.frontPoseSprite
            }
            spriteData={
              selectedGender === "male"
                ? MALE.frontPoseData
                : FEMALE.frontPoseData
            }
            size={AVATAR_SIZE * 0.6}
            loop={true}
          />
        </View>
        <Podium isMain={true} />
        <View style={styles.dataContainer}>
          <PaperProgressBar progress={1} />
          {/*   hardcoded */}
          <Text style={styles.progressText}>
            0 km / {SESSION_CONFIG.maxDistance} km
          </Text>
          <Text style={styles.bestRun}>
            best run: {SESSION_CONFIG.maxDistance} km
          </Text>
          <PaperButton onPress={handleStart} variant="big" style={styles.btn}>
            Start new Race
          </PaperButton>
        </View>
      </View>
    </AuthBackground>
  );
};

const styles = StyleSheet.create({
  runningContainer: {
    position: "relative",
  },
  avatarContainer: {
    position: "relative",
    top: width / 3.8,
    left: width * 0.13,
    zIndex: 2,
  },
  dataContainer: {
    flexDirection: "column",
    alignItems: "center",
  },
  progressText: {
    ...textPresets.progressText,
  },
  bestRun: {
    ...textPresets.bestRun,
    color: "#00000099",
  },
  btn: {
    width: 230,
  },
});
export default Main;
