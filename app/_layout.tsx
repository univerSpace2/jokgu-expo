import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useFonts } from "expo-font";
import { Slot } from "expo-router";
import { useEffect } from "react";
import { View } from "react-native";
import "bootstrap/dist/css/bootstrap.min.css"; // 이 부분은 웹에서만 작동함
import * as React from "react";

// ThemeProvider를 import하기 전에 필요한 의존성 확인
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider } from "react-native-rapi-ui";

export {
  // 오류를 방지하기 위해 앱이 로드되기 전에 모든 경로를 지연시킵니다.
  ErrorBoundary,
} from "expo-router";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    ...FontAwesome.font,
  });

  // 글꼴 로딩 에러 처리
  useEffect(() => {
    if (fontError) throw fontError;
  }, [fontError]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider theme="light">
        <Slot />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
