import { Redirect } from "expo-router";
import { useState, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import * as SplashScreen from "expo-splash-screen";

// 스플래시 화면이 먼저 표시되도록 방지
SplashScreen.preventAutoHideAsync();

export default function Index() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // 1.5초 후에 리다이렉트 준비 완료 상태로 변경
    const timer = setTimeout(() => {
      setIsReady(true);
      SplashScreen.hideAsync();
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  // 준비가 완료되면 리다이렉트
  if (isReady) {
    return <Redirect href="/(tabs)/meetings" />;
  }

  // 준비가 완료되지 않았으면 빈 화면 표시 (스플래시 화면이 보임)
  return <View style={styles.container} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
