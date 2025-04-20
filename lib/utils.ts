import { useFocusEffect } from "expo-router";
import { useCallback } from "react";

/**
 * 앱이 포커스(포그라운드)를 얻을 때마다 콜백 함수를 실행하는 훅
 * @param callback 앱이 포커스를 얻을 때 실행할 콜백 함수
 */
export function useAppFocus(callback: () => void) {
  useFocusEffect(
    useCallback(() => {
      // 화면이 포커스를 얻을 때 콜백 실행
      callback();

      return () => {
        // 화면이 포커스를 잃을 때 정리 작업 (필요하다면)
      };
    }, [callback])
  );
}
