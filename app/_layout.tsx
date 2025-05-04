import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useFonts } from "expo-font";
import { Slot } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import "bootstrap/dist/css/bootstrap.min.css"; // 이 부분은 웹에서만 작동함
import * as React from "react";
import * as SplashScreen from "expo-splash-screen";

// ThemeProvider를 import하기 전에 필요한 의존성 확인
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider } from "react-native-rapi-ui";

// 스플래시 스크린이 자동으로 숨겨지는 것을 방지
SplashScreen.preventAutoHideAsync();

// 스플래시 스크린 애니메이션 옵션 설정
SplashScreen.setOptions({
  duration: 1000,
  fade: true,
});

export {
  // 오류를 방지하기 위해 앱이 로드되기 전에 모든 경로를 지연시킵니다.
  ErrorBoundary,
} from "expo-router";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

export default function RootLayout() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [fontsLoaded, fontError] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    ...FontAwesome.font,
  });

  // 글꼴 로딩 에러 처리
  useEffect(() => {
    if (fontError) throw fontError;
  }, [fontError]);

  useEffect(() => {
    async function prepare() {
      try {
        // 앱 초기화 작업 (폰트 로딩은 이미 useFonts 내에서 처리됨)
        // 필요한 API 호출 등을 여기서 수행할 수 있습니다
      } catch (e) {
        console.warn(e);
      } finally {
        // 앱이 준비되었음을 설정
        if (fontsLoaded) {
          setAppIsReady(true);
        }
      }
    }

    prepare();
  }, [fontsLoaded]);

  const onLayoutRootView = useCallback(() => {
    if (appIsReady) {
      // 레이아웃이 렌더링된 후 스플래시 스크린을 숨깁니다
      SplashScreen.hide();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider theme="light">
        <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
          <Slot />
        </View>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
