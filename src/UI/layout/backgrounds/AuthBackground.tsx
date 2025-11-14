import React, { ReactNode } from "react";
import {
  View,
  ScrollView,
  StatusBar,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { styles } from "./AuthBackgrounds.styles";

const backgroundImage = require("../../../../assets/images/background.png");

interface AuthLayoutProps {
  children: ReactNode;
  title?: string;
  showTitle?: boolean;
  isSecondary?: boolean;
}

export default function AuthBackground({
  children,
  showTitle = true,
  isSecondary = true,
}: AuthLayoutProps) {
  return (
    <ImageBackground
      source={backgroundImage}
      style={styles.background}
      resizeMode="cover"
    >
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
          keyboardVerticalOffset={0}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {showTitle && (
                <View
                  style={
                    isSecondary
                      ? styles.titleContainer
                      : styles.titleContainerSecondary
                  }
                >
                  <Text
                    style={isSecondary ? styles.title : styles.titleSecondary}
                  >
                    hybit
                    <Text
                      style={
                        isSecondary
                          ? styles.titlePurple
                          : styles.subTitleSecondary
                      }
                    >
                      .com
                    </Text>
                  </Text>
                </View>
              )}

              <View style={styles.contentContainer}>{children}</View>
            </ScrollView>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
}
