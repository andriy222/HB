import React, { useEffect, useRef, useState } from "react";
import { View, Image } from "react-native";

interface AsepriteFrame {
  filename: string;
  frame: { x: number; y: number; w: number; h: number };
  duration: number;
}

export interface AsepriteJSON {
  frames: AsepriteFrame[];
  meta: {
    size: { w: number; h: number };
  };
}
interface SpriteAnimatorProps {
  source: any;
  spriteData: AsepriteJSON;
  size?: number;
  loop?: boolean;
}

export default function SpriteAnimator({
  source,
  spriteData,
  size = 200,
  loop = true,
}: SpriteAnimatorProps) {
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Reset frame index when spriteData changes
  useEffect(() => {
    setCurrentFrameIndex(0);
  }, [spriteData]);

  useEffect(() => {
    if (!spriteData?.frames || spriteData.frames.length === 0) return;

    const frame = spriteData.frames[currentFrameIndex];
    if (!frame) return; // Safety check

    const duration = frame.duration || 100;

    timerRef.current = setTimeout(() => {
      setCurrentFrameIndex((prev) => {
        const next = (prev + 1) % spriteData.frames.length;
        if (!loop && next === 0) return prev;
        return next;
      });
    }, duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentFrameIndex, spriteData, loop]);

  // Safety checks
  if (!spriteData?.frames || spriteData.frames.length === 0) {
    return null;
  }

  const currentFrame = spriteData.frames[currentFrameIndex];
  if (!currentFrame) {
    return null;
  }

  const frameW = currentFrame.frame.w;
  const frameH = currentFrame.frame.h;
  const scale = size / frameW;

  return (
    <View
      style={[
        {
          width: frameW * scale,
          height: frameH * scale,
          overflow: "hidden",
        },
      ]}
    >
      <Image
        source={source}
        style={{
          width: spriteData.meta.size.w * scale,
          height: spriteData.meta.size.h * scale,
          marginLeft: -currentFrame.frame.x * scale,
          marginTop: -currentFrame.frame.y * scale,
        }}
      />
    </View>
  );
}
