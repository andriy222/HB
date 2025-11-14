import { Dimensions } from "react-native";
import { AsepriteJSON } from "../components/SpriteAnimator/SpriteAnimator";
const { width } = Dimensions.get("window");
export const AVATAR_SIZE = width * 1; 
export interface CharacterAssets {
  frontPoseSprite: string;
  frontPoseData: AsepriteJSON;
}

export const MALE: CharacterAssets = {
  frontPoseSprite: require("../../assets/exported_animations/male/Male_Standing_Frontal_Pose/Male_Standing_Frontal_Pose.png"),
  frontPoseData: require("../../assets/exported_animations/male/Male_Standing_Frontal_Pose/Male_Standing_Frontal_Pose.json"),
};



export const FEMALE: CharacterAssets = {
  frontPoseSprite: require("../../assets/exported_animations/female/Female_Standing_Frontal_Pose/Female_Standing_Frontal_Pose.png"),
  frontPoseData: require("../../assets/exported_animations/female/Female_Standing_Frontal_Pose/Female_Standing_Frontal_Pose.json"),
};