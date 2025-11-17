import React, { useEffect, useState, useMemo, useRef } from "react";
import AuthBackground from "../../../UI/layout/backgrounds/AuthBackground";
import { debugStorage, storage } from "../../../store/bleStore";
import Podium from "../../../components/Podium/Podium";
import BottomNavigation from "../../../components/BottomNavigation/BottomNavigation";
import SpriteAnimator from "../../../components/SpriteAnimator/SpriteAnimator";
import { AVATAR_SIZE, FEMALE, MALE, AvatarAnimation } from "../../../utils/constants";
import { Gender, getSelectedGender } from "../../../utils/storage";
import { View, StyleSheet, Dimensions, Text } from "react-native";
import ConnectionAlerts from "../../../components/ConnectionAlert/ConnectionAlerts";
import PaperButton from "../../../UI/PaperButton/PaperButton";
import PaperProgressBar from "../../../UI/PaperProgressBar/PaperProgressBar";
import { SESSION_CONFIG } from "../../../constants/sessionConstants";
import { textPresets } from "../../../theme";
import { useSession } from "../../../hooks/useBleConnection/useSession";
import { getBestRun } from "../../../storage/appStorage";
import SessionResult from "../../../components/SessionResult/SessionResult";

const { width } = Dimensions.get("window");

interface SessionResultData {
  distance: number;
  stamina: number;
  duration: number;
  isNewBest: boolean;
}

const Main = () => {
  const [selectedGender, setSelectedGender] = useState<Gender>("male");
  const [bestRun, setBestRun] = useState<number>(0);
  const [showResult, setShowResult] = useState(false);
  const [sessionResult, setSessionResult] = useState<SessionResultData | null>(null);
  const prevIsActiveRef = useRef<boolean>(false);

  const session = useSession();

  // Load best run on mount
  useEffect(() => {
    const best = getBestRun();
    if (best) {
      setBestRun(best.distance);
    }
  }, []);

  // Update gender on mount
  useEffect(() => {
    debugStorage();
    const gender = getSelectedGender();
    console.log(gender);
    setSelectedGender(gender);
  }, [storage]);

  // Detect when session ends and show result modal
  useEffect(() => {
    // Session just ended (was active, now inactive)
    if (prevIsActiveRef.current && !session.isActive && session.session?.isComplete) {
      const currentBest = getBestRun();
      const isNewBest = currentBest ? session.distance > bestRun : false;

      setSessionResult({
        distance: session.distance,
        stamina: session.stamina,
        duration: session.elapsedMinutes,
        isNewBest,
      });
      setShowResult(true);

      // Update best run display
      if (isNewBest || !currentBest) {
        setBestRun(session.distance);
      }
    }
    prevIsActiveRef.current = session.isActive;
  }, [session.isActive, session.session?.isComplete, session.distance, session.stamina, session.elapsedMinutes, bestRun]);

  // Get avatar animation based on stamina state
  const avatarAnimation: AvatarAnimation = useMemo(() => {
    const character = selectedGender === "male" ? MALE : FEMALE;

    if (!session.isActive) {
      // Show standing pose when not running
      return {
        sprite: character.frontPoseSprite,
        data: character.frontPoseData,
      };
    }

    // Show running animation based on stamina state
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

  // Calculate stamina ratio for progress bar (0-1)
  const staminaRatio = session.stamina / SESSION_CONFIG.maxStamina;

  function handleStart() {
    if (session.isActive) {
      console.log("⚠️ Session already active");
      return;
    }
    console.log("🏁 Starting new race...");
    session.start(selectedGender);
  }

  // Mock function for testing - adds 100ml to current session
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
            {session.formatDistance(session.distance)} / {SESSION_CONFIG.maxDistance} km
          </Text>
          <Text style={styles.staminaText}>
            Stamina: {session.formatStamina(session.stamina)}
          </Text>
          {bestRun > 0 && (
            <Text style={styles.bestRun}>
              best run: {bestRun.toFixed(2)} km
            </Text>
          )}
          {session.isActive && (
            <Text style={styles.timeText}>
              Time: {session.formatTime(session.elapsedMinutes)} / {session.formatTime(SESSION_CONFIG.duration)}
            </Text>
          )}
          <PaperButton
            onPress={handleStart}
            variant="big"
            style={styles.btn}
            disabled={session.isActive}
          >
            {session.isActive ? "Race in Progress..." : "Start new Race"}
          </PaperButton>
          {/* Mock button for testing */}
          {session.isActive && (typeof __DEV__ !== 'undefined' && __DEV__) && (
            <PaperButton
              onPress={handleMockDrink}
              variant="big"
              style={[styles.btn, styles.mockBtn]}
            >
              +100ml (Test)
            </PaperButton>
          )}
        </View>
      </View>
      {sessionResult && (
        <SessionResult
          visible={showResult}
          distance={sessionResult.distance}
          stamina={sessionResult.stamina}
          duration={sessionResult.duration}
          isNewBest={sessionResult.isNewBest}
          onClose={() => setShowResult(false)}
        />
      )}
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
  },
  mockBtn: {
    marginTop: 10,
    backgroundColor: "#4CAF50",
  },
});
export default Main;
