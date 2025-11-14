import { View, StyleSheet, Dimensions } from "react-native";
import { Text } from "react-native-paper";
import React, { useEffect, useState } from "react";
import AuthBackground from "../../../UI/layout/backgrounds/AuthBackground";
import { getSelectedGender, Gender } from "../../../utils/storage";
import { colors, mixins, textPresets } from "../../../theme";
import Podium from "../../../components/Podium/Podium";
import PaperButton from "../../../UI/PaperButton/PaperButton";
import SpriteAnimator from "../../../components/SpriteAnimator/SpriteAnimator";
import { AVATAR_SIZE, FEMALE, MALE } from "../../../utils/constants";
import ConnectionModal from "../../../UI/ConnectionModal/ConnectionModal";
import { useRouter } from "expo-router";
import { useBleStore } from "../../../store/bleStore";
import { useBleScan } from "../../../hooks/useScanDevices";

const { height } = Dimensions.get("window");

const Start = () => {
  const router = useRouter();
  const { setOnboardingComplete, setLastDevice } = useBleStore();
  const { linkUp, connectedDevice } = useBleScan();
  const [selectedGender, setSelectedGender] = useState<Gender>("male");
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    console.log("🔗 linkUp:", linkUp);
    console.log(
      "📱 connectedDevice:",
      connectedDevice?.name,
      connectedDevice?.id
    );
  }, [linkUp, connectedDevice]);

  function handleStart() {
    console.log("▶️ Start button pressed");
    console.log("🔗 Current linkUp:", linkUp);
    console.log("📱 Current device:", connectedDevice?.name);

    if (linkUp && connectedDevice) {
      console.log("✅ Connected, going to main");
      router.push("/main");
    } else {
      console.log("⚠️ Not connected, showing modal");
      setModalVisible(true);
    }
  }

  const handleComplete = () => {
    console.log("🎉 Connection complete!");
    console.log("🔗 linkUp after complete:", linkUp);
    console.log("📱 device after complete:", connectedDevice?.name);

    setOnboardingComplete();

    if (connectedDevice) {
      setLastDevice(connectedDevice.id);
    }

    setModalVisible(false);

    setTimeout(() => {
      console.log("🚀 Navigating to /main");
      router.push("/main");
    }, 300);
  };

  useEffect(() => {
    const loadGender = async () => {
      const gender = await getSelectedGender();
      console.log("Selected gender:", gender);
      setSelectedGender(gender);
    };

    loadGender();
  }, []);

  return (
    <AuthBackground showTitle={false}>
      <View style={styles.container}>
        <View style={styles.textContainer}>
          <Text variant="headlineLarge">Welcome to Hybit!</Text>
          <Text style={styles.bodyText}>Start your day</Text>
        </View>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
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
              size={AVATAR_SIZE}
            />
          </View>
          <View style={styles.bottomAvatarShadow} />
          <Podium />
        </View>
        <PaperButton variant="big" onPress={handleStart}>
          Start
        </PaperButton>
      </View>
      <ConnectionModal
        visible={modalVisible}
        onDismiss={() => setModalVisible(false)}
        onComplete={() => {
          handleComplete;
        }}
      />
    </AuthBackground>
  );
};
const styles = StyleSheet.create({
  container: {
    ...mixins.flexCenterColumn,
    gap: height * 0.05,
  },
  textContainer: {
    ...mixins.flexCenterColumn,
    gap: height * 0.025,
  },
  avatarContainer: {
    ...mixins.flexCenterColumn,
    zIndex: 0,
  },
  avatar: {
    position: "relative",
    top: height * 0.05,
    zIndex: 1,
  },
  bottomAvatarShadow: {
    position: "absolute",
    bottom: height * 0.035,
    width: AVATAR_SIZE * 0.5,
    height: AVATAR_SIZE * 0.035,
    backgroundColor: "#0000002E",
  },
  bodyText: {
    ...textPresets.startBodyText,
    color: colors.text.primary,
  },
});
export default Start;
