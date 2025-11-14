import React, { useState } from "react";
import { View } from "react-native";
import SpriteAnimator from "../SpriteAnimator/SpriteAnimator";
import CircleButton from "../../UI/CircleButton/CircleButton";
import { styles } from "./AvatarSlider.styles";
import { AVATAR_SIZE, FEMALE, MALE } from "../../utils/constants";
import { Gender, setSelectedGender } from "../../utils/storage";

interface AvatarSliderProps {
  initialGender?: Gender;
  onGenderChange?: (gender: Gender) => void;
}

export default function AvatarSlider({
  initialGender = "male",
  onGenderChange,
}: AvatarSliderProps) {
  const [currentGender, setCurrentGender] = useState<Gender>(initialGender);

  const handleGenderChange = (newGender: Gender) => {
    setCurrentGender(newGender);
    setSelectedGender(newGender);
    onGenderChange?.(newGender);
  };

  return (
    <View style={styles.container}>
      <View style={styles.leftButton}>
        <CircleButton
          direction="left"
          onPress={() => handleGenderChange("male")}
          disabled={currentGender === "male"}
        />
      </View>

      <View style={styles.avatarContainer}>
        <View style={styles.headCircle} />

        <SpriteAnimator
          key={currentGender}
          source={
            currentGender === "male"
              ? MALE.frontPoseSprite
              : FEMALE.frontPoseSprite
          }
          spriteData={
            currentGender === "male" ? MALE.frontPoseData : FEMALE.frontPoseData
          }
          size={AVATAR_SIZE}
          loop={true}
        />

        <View style={styles.footRingOuter} />
        <View style={styles.footRingInner} />
      </View>

      <View style={styles.rightButton}>
        <CircleButton
          direction="right"
          onPress={() => handleGenderChange("female")}
          disabled={currentGender === "female"}
        />
      </View>
    </View>
  );
}
