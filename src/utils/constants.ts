import { Dimensions } from "react-native";
import { AsepriteJSON } from "../components/SpriteAnimator/SpriteAnimator";

const { width } = Dimensions.get("window");

export const AVATAR_SIZE = width;

export interface CharacterAssets {
  frontPoseSprite: string;
  frontPoseData: AsepriteJSON;
  // Running states
  normalRunning: { sprite: string; data: AsepriteJSON };
  tiredRunning: { sprite: string; data: AsepriteJSON };
  exhausted: { sprite: string; data: AsepriteJSON };
  // Standing states
  standing: { sprite: string; data: AsepriteJSON };
}

export const MALE: CharacterAssets = {
  frontPoseSprite: require("../../assets/exported_animations/male/Male_Standing_Frontal_Pose/Male_Standing_Frontal_Pose.png"),
  frontPoseData: require("../../assets/exported_animations/male/Male_Standing_Frontal_Pose/Male_Standing_Frontal_Pose.json"),

  normalRunning: {
    sprite: require("../../assets/exported_animations/male/Male_Normal_Running/Male_Normal_Running.png"),
    data: require("../../assets/exported_animations/male/Male_Normal_Running/Male_Normal_Running.json"),
  },

  tiredRunning: {
    sprite: require("../../assets/exported_animations/male/Male_Tired_Running/Male_Tired_Running.png"),
    data: require("../../assets/exported_animations/male/Male_Tired_Running/Male_Tired_Running.json"),
  },

  exhausted: {
    sprite: require("../../assets/exported_animations/male/Male_Exhausted/Male_Exhausted.png"),
    data: require("../../assets/exported_animations/male/Male_Exhausted/Male_Exhausted.json"),
  },

  standing: {
    sprite: require("../../assets/exported_animations/male/Male_Standing/Male_Standing.png"),
    data: require("../../assets/exported_animations/male/Male_Standing/Male_Standing.json"),
  },
};

export const FEMALE: CharacterAssets = {
  frontPoseSprite: require("../../assets/exported_animations/female/Female_Standing_Frontal_Pose/Female_Standing_Frontal_Pose.png"),
  frontPoseData: require("../../assets/exported_animations/female/Female_Standing_Frontal_Pose/Female_Standing_Frontal_Pose.json"),

  normalRunning: {
    sprite: require("../../assets/exported_animations/female/Female_Normal_Running/Female_Normal_Running.png"),
    data: require("../../assets/exported_animations/female/Female_Normal_Running/Female_Normal_Running.json"),
  },

  tiredRunning: {
    sprite: require("../../assets/exported_animations/female/Female_Tired_Running/Female_Tired_Running.png"),
    data: require("../../assets/exported_animations/female/Female_Tired_Running/Female_Tired_Running.json"),
  },

  exhausted: {
    sprite: require("../../assets/exported_animations/female/Female_Exhausted/Female_Exhausted.png"),
    data: require("../../assets/exported_animations/female/Female_Exhausted/Female_Exhausted.json"),
  },

  standing: {
    sprite: require("../../assets/exported_animations/female/Female_Standing/Female_Standing.png"),
    data: require("../../assets/exported_animations/female/Female_Standing/Female_Standing.json"),
  },
};