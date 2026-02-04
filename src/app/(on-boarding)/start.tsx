import { View, StyleSheet, Dimensions } from "react-native";
import { Text } from "react-native-paper";
import React, { useEffect, useState } from "react";
import AuthBackground from "../../UI/layout/backgrounds/AuthBackground";
import { getSelectedGender, Gender } from "../../utils/storage";
import { colors, mixins, textPresets } from "../../theme";
import Podium from "../../components/Podium/Podium";
import PaperButton from "../../UI/PaperButton/PaperButton";
import SpriteAnimator from "../../components/SpriteAnimator/SpriteAnimator";
import { AVATAR_SIZE, FEMALE, MALE } from "../../utils/constants";
import ConnectionModal from "../../UI/ConnectionModal/ConnectionModal";
import { useRouter } from "expo-router";
import { useBleStore } from "../../store/bleStore";
import { useBleScan } from "../../hooks/useScanDevices";
import { useBleScanWithMock } from "../../hooks/MockBleProvider/useBleScanWithMock";
import { logger } from "../../utils/logger";

const { height } = Dimensions.get("window");

const Start = () => {
  const router = useRouter();
  const { setOnboardingComplete } = useBleStore();
  const { linkUp, connectedDevice } = useBleScanWithMock();
  const [selectedGender, setSelectedGender] = useState<Gender>("male");
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    logger.debug("🔗 linkUp:", linkUp);
    logger.debug("📱 connectedDevice:", connectedDevice?.name);
  }, [linkUp, connectedDevice]);

  function handleStart() {
    logger.debug("▶️ Start button pressed");
    logger.debug("🔗 Current linkUp:", linkUp);
    logger.debug("📱 Current device:", connectedDevice?.name);

    if (linkUp && connectedDevice) {
      logger.info("✅ Connected, completing onboarding and going to main");
      setOnboardingComplete();
      router.push("/(main)/race");
    } else {
      logger.warn("⚠️ Not connected, showing modal");
      setModalVisible(true);
    }
  }

  const handleComplete = () => {
    logger.debug("🎉 Connection complete!");
    logger.debug("🔗 linkUp after complete:", linkUp);
    logger.debug("📱 device after complete:", connectedDevice?.name);

    setOnboardingComplete();

    setModalVisible(false);

    setTimeout(() => {
      router.push("/(main)/race");
    }, 300);
  };

  useEffect(() => {
    const gender = getSelectedGender();
    setSelectedGender(gender);
  }, []);

  return (
    <AuthBackground showTitle={false}>
      <View style={styles.container}>
        <View style={styles.textContainer}>
          <Text variant="headlineLarge">Welcome to Hybit!</Text>
          <Text style={styles.bodyText}>
            {linkUp
              ? `Connected to ${connectedDevice?.name || "device"}`
              : "Start your day"}
          </Text>
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
        onDismiss={() => {
          logger.debug("❌ Modal dismissed");
          setModalVisible(false);
        }}
        onComplete={handleComplete}
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
