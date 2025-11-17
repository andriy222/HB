import React, { useEffect, useState } from "react";
import AuthBackground from "../../../UI/layout/backgrounds/AuthBackground";
import { clearStorage, debugStorage, storage } from "../../../store/bleStore";
import Podium from "../../../components/Podium/Podium";
import BottomNavigation from "../../../components/BottomNavigation/BottomNavigation";
import SpriteAnimator from "../../../components/SpriteAnimator/SpriteAnimator";
import { AVATAR_SIZE, FEMALE, MALE } from "../../../utils/constants";
import { Gender, getSelectedGender } from "../../../utils/storage";
import { View, StyleSheet, Dimensions } from "react-native";
import ConnectionAlerts from "../../../components/ ConnectionAlert/ConnectionAlerts";
import PaperButton from "../../../UI/PaperButton/PaperButton";

const { width } = Dimensions.get("window");
const Main = () => {
  const [selectedGender, setSelectedGender] = useState<Gender>("male");

  function handleClear() {
    clearStorage();
    debugStorage();
  }

  useEffect(() => {
    debugStorage();
    const gender = getSelectedGender();
    console.log(gender);
    // Use 'male' as default if no gender selected
    setSelectedGender(gender || 'male');
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
});
export default Main;
