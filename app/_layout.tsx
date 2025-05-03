import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useFonts } from "expo-font";
import { Slot } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
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

// 앱이 렌더링되기 전에 스플래시 화면을 방지합니다.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    ...FontAwesome.font,
  });

  // 글꼴이 로드되면 앱을 렌더링합니다. 그렇지 않으면 스플래시 화면을 표시합니다.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
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
