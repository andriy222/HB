import React, { useEffect, useState, useMemo } from "react";
import AuthBackground from "../../../UI/layout/backgrounds/AuthBackground";
import { clearStorage, debugStorage, storage } from "../../../store/bleStore";
import Podium from "../../../components/Podium/Podium";
import BottomNavigation from "../../../components/BottomNavigation/BottomNavigation";
import SpriteAnimator from "../../../components/SpriteAnimator/SpriteAnimator";
import {
  AVATAR_SIZE,
  FEMALE,
  MALE,
  AvatarAnimation,
} from "../../../utils/constants";
import { Gender, getSelectedGender } from "../../../utils/storage";
import { View, StyleSheet, Dimensions, Text } from "react-native";
import ConnectionAlerts from "../../../components/ConnectionAlert/ConnectionAlerts";
import PaperButton from "../../../UI/PaperButton/PaperButton";
import PaperProgressBar from "../../../UI/PaperProgressBar/PaperProgressBar";
import { SESSION_CONFIG } from "../../../constants/sessionConstants";
import { textPresets } from "../../../theme";
import { useSession } from "../../../hooks/useBleConnection/useSession";
import { getBestRun } from "../../../storage/appStorage";

const { width } = Dimensions.get("window");

const Main = () => {
  const [selectedGender, setSelectedGender] = useState<Gender>("male");
  const [bestRun, setBestRun] = useState<number>(0);

  const session = useSession();
  function clear() {
    clearStorage();
  }
  useEffect(() => {
    const best = getBestRun();
    if (best) {
      setBestRun(best.distance);
    }
  }, []);

  useEffect(() => {
    debugStorage();
    const gender = getSelectedGender();
    console.log(gender);
    setSelectedGender(gender);
  }, [storage]);

  const avatarAnimation: AvatarAnimation = useMemo(() => {
    const character = selectedGender === "male" ? MALE : FEMALE;

    if (!session.isActive) {
      return {
        sprite: character.frontPoseSprite,
        data: character.frontPoseData,
      };
    }

    switch (session.avatarState) {
      case "normal":
        return character.normalRunning;
      case "tired":
        return character.tiredRunning;
      case "exhausted":
        return character.exhausted;
      default:
        return {
          sprite: character.frontPoseSprite,
          data: character.frontPoseData,
        };
    }
  }, [selectedGender, session.avatarState, session.isActive]);

  const staminaRatio = session.stamina / SESSION_CONFIG.maxStamina;

  function handleStart() {
    if (session.isActive) {
      console.log("⚠️ Session already active");
      return;
    }
    console.log("🏁 Starting new race...");
    session.start(selectedGender);
  }

  function handleMockDrink() {
    if (!session.isActive) {
      console.log("⚠️ No active session");
      return;
    }
    console.log("💧 Mock: Adding 100ml");
    session.recordDrink(100);
  }

  return (
    <AuthBackground
      isMain={true}
      isSecondary={false}
      footer={<BottomNavigation />}
    >
      <ConnectionAlerts />
      <View style={styles.runningContainer}>
        <View style={styles.avatarContainer}>
          <SpriteAnimator
            source={avatarAnimation.sprite}
            spriteData={avatarAnimation.data}
            size={AVATAR_SIZE * 0.6}
            loop={true}
          />
        </View>
        <Podium isMain={true} />
        <View style={styles.dataContainer}>
          <PaperProgressBar progress={staminaRatio} />
          <Text style={styles.progressText}>
            {session.formatDistance(session.distance)}
            <Text style={styles.progressTextKM}>km</Text> /
            {SESSION_CONFIG.maxDistance}
            <Text style={styles.progressTextKM}>km</Text>
          </Text>
          {/* <Text style={styles.staminaText}>
            Stamina: {session.formatStamina(session.stamina)}
          </Text> */}
          {bestRun > 0 && (
            <Text style={styles.bestRun}>
              best run: {bestRun.toFixed(2)} km
            </Text>
          )}
          {session.isActive && (
            <Text style={styles.timeText}>
              Time: {session.formatTime(session.elapsedMinutes)} /{" "}
              {session.formatTime(SESSION_CONFIG.duration)}
            </Text>
          )}
          {!session.isActive && (
            <PaperButton
              onPress={handleStart}
              variant="big"
              style={styles.btn}
              disabled={session.isActive}
            >
              Start new Race
            </PaperButton>
          )}
          {/* Mock button for testing */}

          {session.isActive && typeof __DEV__ !== "undefined" && __DEV__ && (
            <PaperButton onPress={handleMockDrink} variant="big">
              +100ml (Test)
            </PaperButton>
          )}
          {/* <PaperButton onPress={clear}>clearStorage</PaperButton> */}
        </View>
      </View>
    </AuthBackground>
  );
};

const styles = StyleSheet.create({
  runningContainer: {
    position: "relative",
    bottom: 80,
  },
  avatarContainer: {
    position: "relative",
    top: width / 3.8,
    left: width * 0.13,
    zIndex: 2,
  },
  dataContainer: {
    position: "relative",
    bottom: width * 0.1,
    flexDirection: "column",
    alignItems: "center",
    gap: width * 0.05,
  },
  progressText: {
    ...textPresets.progressText,
  },
  staminaText: {
    ...textPresets.progressText,
    fontSize: 14,
    marginTop: 5,
  },
  timeText: {
    ...textPresets.progressText,
    fontSize: 14,
    marginTop: 5,
    color: "#00000066",
  },
  bestRun: {
    ...textPresets.bestRun,
    color: "#00000099",
  },
  btn: {
    width: 230,
    borderRadius: 32,
  },
  progressTextKM: {
    fontSize: 20,
    color: "#00000099",
  },
});
export default Main;
