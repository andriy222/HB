import React, { useEffect, useState, useMemo } from "react";
import AuthBackground from "../../../UI/layout/backgrounds/AuthBackground";
import { clearStorage, debugStorage } from "../../../store/bleStore";
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
import { View, StyleSheet, Dimensions, Text, Image } from "react-native";
import ConnectionAlerts from "../../../components/ConnectionAlert/ConnectionAlerts";
import PaperButton from "../../../UI/PaperButton/PaperButton";
import PaperProgressBar from "../../../UI/PaperProgressBar/PaperProgressBar";
import { SESSION_CONFIG } from "../../../constants/sessionConstants";
import { textPresets } from "../../../theme";
import { useSession } from "../../../hooks/useBleConnection/useSession";
import {
  getBestRun,
  getLastRaceDistance,
  setLastRaceDistance,
  clearLastRaceDistance,
} from "../../../storage/appStorage";

import { useGlobalConnectionMonitor } from "../../../hooks/useConnectionMonitor";
import { logger } from "../../../utils/logger";
import { useRouter } from "expo-router";
import { mmkvStorage } from "../../../storage/appStorage";

const trophy = require("../../../../assets/win.png");
const { width } = Dimensions.get("window");

const Main = () => {
  const router = useRouter();
  const [selectedGender, setSelectedGender] = useState<Gender>("male");
  const [bestRun, setBestRun] = useState<number>(0);
  const [lastRaceDistance, setLastRaceDistanceState] = useState<number>(0);
  const [wasActive, setWasActive] = useState(false);

  const session = useSession();
  const monitor = useGlobalConnectionMonitor();

  const isFinished = !session.isActive && lastRaceDistance > 0;

  useEffect(() => {
    const distance = getLastRaceDistance();
    setLastRaceDistanceState(distance);
  }, []);

  useEffect(() => {
    if (session.isActive && session.distance > 0) {
      setLastRaceDistance(session.distance);
      setLastRaceDistanceState(session.distance);
    }
  }, [session.isActive, session.distance]);

  useEffect(() => {
    if (wasActive && !session.isActive) {
      logger.info("🏁 Race finished! Distance:", lastRaceDistance);
    }
    setWasActive(session.isActive);
  }, [session.isActive, wasActive, lastRaceDistance]);
  useEffect(() => {
    const best = getBestRun();
    if (best) {
      setBestRun(best.distance);
    }
  }, []);

  useEffect(() => {
    debugStorage();
    const gender = getSelectedGender();
    setSelectedGender(gender);
  }, []);

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
      logger.warn("⚠️ Session already active");
      return;
    }
    logger.info("🏁 Starting new race...");
    clearLastRaceDistance();
    setLastRaceDistanceState(0);
    session.start(selectedGender);
  }

  function handleMockDrink() {
    logger.info("🗑️ Clearing all storage and resetting app...");
    debugStorage();

    // Clear MMKV storage (includes ble-onboarding)
    clearStorage();

    // Clear AsyncStorage data (gender, device, etc)
    mmkvStorage.clearAll();

    // Reset zustand stor

    debugStorage();
    logger.info("✅ Storage cleared, redirecting to welcome...");

    // Redirect to welcome screen
    setTimeout(() => {
      router.replace("/welcome");
    }, 500);
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
          {session.isActive && (
            <View style={styles.progress}>
              <PaperProgressBar progress={staminaRatio} />
              <Text style={styles.progressText}>
                {session.formatDistance(session.distance)}
                <Text style={styles.progressTextKM}>km</Text> /{" "}
                {SESSION_CONFIG.maxDistance}
                <Text style={styles.progressTextKM}>km</Text>
              </Text>
            </View>
          )}

          {isFinished && (
            <View style={styles.finish}>
              <Image source={trophy} style={styles.trophy} />
              <Text style={styles.finishDistance}>
                {session.formatDistance(lastRaceDistance)}
                <Text style={styles.finishDistanceKM}> km</Text>
              </Text>
            </View>
          )}
          <View style={styles.stat}>
            {!session.isActive && (
              <PaperButton
                onPress={handleStart}
                variant="big"
                style={styles.btn}
              >
                Start new Race
              </PaperButton>
            )}
            {bestRun > 0 && monitor.canStartRace && (
              <Text style={styles.bestRun}>
                best run: {bestRun.toFixed(2)} km
              </Text>
            )}
          </View>
          {session.isActive && typeof __DEV__ !== "undefined" && __DEV__ && (
            <PaperButton onPress={handleMockDrink} variant="big">
              +100ml (Test)
            </PaperButton>
          )}
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
  progress: {
    flexDirection: "column",
    alignItems: "center",
    gap: width * 0.05,
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
  finish: {
    alignItems: "center",
    flexDirection: "row",
    gap: width * 0.03,
  },
  trophy: {
    width: 80,
    height: 80,
  },
  finishDistance: {
    ...textPresets.progressText,
    fontSize: 48,
  },
  finishDistanceKM: {
    fontSize: 32,
    color: "#00000099",
  },
  stat: {
    flexDirection: "column",
    alignItems: "center",
    gap: width * 0.02,
  },
});

export default Main;
