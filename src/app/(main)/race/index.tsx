import React, { useEffect, useState, useMemo } from "react";
import AuthBackground from "../../../UI/layout/backgrounds/AuthBackground";
import { clearStorage, debugStorage, storage } from "../../../store/bleStore";
import Podium from "../../../components/Podium/Podium";
import BottomNavigation from "../../../components/BottomNavigation/BottomNavigation";
import SpriteAnimator from "../../../components/SpriteAnimator/SpriteAnimator";
import { AVATAR_SIZE, FEMALE, MALE, CharacterAssets } from "../../../utils/constants";
import { Gender, getSelectedGender } from "../../../utils/storage";
import { View, StyleSheet, Dimensions, Text } from "react-native";
import ConnectionAlerts from "../../../components/ ConnectionAlert/ConnectionAlerts";
import { useSession } from "../../../hooks/useBleConnection/useSession";
import { colors, textPresets } from "../../../theme";
import { SESSION_CONFIG } from "../../../constants/sessionConstants";

const { width } = Dimensions.get("window");

const Main = () => {
  const [selectedGender, setSelectedGender] = useState<Gender>("male");

  // Get session state
  const session = useSession();

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

  // Get character assets based on gender
  const characterAssets: CharacterAssets = selectedGender === "male" ? MALE : FEMALE;

  // Get animation based on avatar state (from session)
  const getAvatarAnimation = useMemo(() => {
    if (!session.isActive) {
      // Not running - show standing pose
      return {
        sprite: characterAssets.standing.sprite,
        data: characterAssets.standing.data,
      };
    }

    // Running - choose animation based on stamina
    switch (session.avatarState) {
      case "exhausted":
        return {
          sprite: characterAssets.exhausted.sprite,
          data: characterAssets.exhausted.data,
        };
      case "tired":
        return {
          sprite: characterAssets.tiredRunning.sprite,
          data: characterAssets.tiredRunning.data,
        };
      case "normal":
      default:
        return {
          sprite: characterAssets.normalRunning.sprite,
          data: characterAssets.normalRunning.data,
        };
    }
  }, [session.avatarState, session.isActive, characterAssets]);

  // Format time remaining (7h - elapsed)
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    const secs = Math.floor((minutes % 1) * 60);
    return `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <AuthBackground
      isMain={true}
      isSecondary={false}
      footer={<BottomNavigation />}
    >
      <ConnectionAlerts />

      {/* Stats overlay */}
      <View style={styles.statsContainer}>
        {/* Stamina Bar */}
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Stamina</Text>
          <View style={styles.staminaBarContainer}>
            <View
              style={[
                styles.staminaBar,
                {
                  width: `${(session.stamina / SESSION_CONFIG.maxStamina) * 100}%`,
                  backgroundColor:
                    session.stamina > 200
                      ? colors.green
                      : session.stamina > 100
                      ? colors.orange
                      : colors.red,
                },
              ]}
            />
          </View>
          <Text style={styles.statValue}>
            {session.stamina.toFixed(0)} / {SESSION_CONFIG.maxStamina}
          </Text>
        </View>

        {/* Distance */}
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Distance</Text>
          <Text style={styles.statValue}>
            {session.distance.toFixed(2)} / {SESSION_CONFIG.maxDistance} km
          </Text>
        </View>

        {/* Time */}
        <View style={styles.stat}>
          <Text style={styles.statLabel}>
            {session.isActive ? "Time Remaining" : "Session Time"}
          </Text>
          <Text style={styles.statValue}>
            {session.isActive
              ? formatTime(session.remainingMinutes)
              : formatTime(session.elapsedMinutes)}
          </Text>
        </View>

        {/* Current Interval */}
        {session.isActive && (
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Interval</Text>
            <Text style={styles.statValue}>
              {session.currentInterval + 1} / {SESSION_CONFIG.totalIntervals}
            </Text>
          </View>
        )}

        {/* Avatar State Indicator */}
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Status</Text>
          <Text
            style={[
              styles.statValue,
              {
                color:
                  session.avatarState === "normal"
                    ? colors.green
                    : session.avatarState === "tired"
                    ? colors.orange
                    : colors.red,
              },
            ]}
          >
            {session.avatarState.toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Running track and avatar */}
      <View style={styles.runningContainer}>
        <View style={styles.avatarContainer}>
          <SpriteAnimator
            source={getAvatarAnimation.sprite}
            spriteData={getAvatarAnimation.data}
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
  statsContainer: {
    position: "absolute",
    top: 60,
    left: 20,
    right: 20,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderRadius: 12,
    padding: 16,
    zIndex: 10,
  },
  stat: {
    marginBottom: 12,
  },
  statLabel: {
    ...textPresets.bodySmall,
    color: colors.white,
    opacity: 0.7,
    marginBottom: 4,
  },
  statValue: {
    ...textPresets.headlineSmall,
    color: colors.white,
    fontWeight: "bold",
  },
  staminaBarContainer: {
    height: 8,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 4,
    overflow: "hidden",
    marginVertical: 4,
  },
  staminaBar: {
    height: "100%",
    borderRadius: 4,
  },
});

export default Main;
