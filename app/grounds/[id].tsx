import React, { useEffect, useState } from "react";
import { View, Share, Linking, Alert, ScrollView } from "react-native";
import { useLocalSearchParams, Stack, useRouter } from "expo-router";
import { groundAPI } from "../../lib/api";
import { JokguGround } from "../../types";
import {
  Layout,
  Text,
  Button,
  Section,
  TopNav,
  themeColor,
  useTheme,
} from "react-native-rapi-ui";
import { Ionicons } from "@expo/vector-icons";

export default function GroundDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [ground, setGround] = useState<JokguGround | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { isDarkmode } = useTheme();

  useEffect(() => {
    const fetchGround = async () => {
      try {
        setLoading(true);
        if (id) {
          const data = await groundAPI.getById(id);
          setGround(data);
        }
      } catch (error) {
        console.error("경기장 정보 조회 중 오류 발생:", error);
        Alert.alert("오류", "경기장 정보를 불러오는데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchGround();
  }, [id]);

  const handleCopyAddress = async () => {
    if (ground?.location) {
      try {
        await Share.share({
          message: ground.location,
        });
      } catch (error) {
        console.error("주소 공유 중 오류 발생:", error);
        Alert.alert("오류", "주소 복사에 실패했습니다.");
      }
    }
  };

  const handleOpenMap = async () => {
    if (ground?.location) {
      try {
        const mapUrl = `https://maps.google.com/?q=${encodeURIComponent(
          ground.location
        )}`;
        const canOpen = await Linking.canOpenURL(mapUrl);

        if (canOpen) {
          await Linking.openURL(mapUrl);
        } else {
          Alert.alert("오류", "지도 앱을 열 수 없습니다.");
        }
      } catch (error) {
        console.error("지도 앱 열기 오류:", error);
        Alert.alert("오류", "지도 앱을 여는데 실패했습니다.");
      }
    }
  };

  const handleOpenReservationLink = async () => {
    if (ground?.reservation_link) {
      try {
        const canOpen = await Linking.canOpenURL(ground.reservation_link);

        if (canOpen) {
          await Linking.openURL(ground.reservation_link);
        } else {
          Alert.alert("오류", "예약 링크를 열 수 없습니다.");
        }
      } catch (error) {
        console.error("예약 링크 열기 오류:", error);
        Alert.alert("오류", "예약 링크를 여는데 실패했습니다.");
      }
    }
  };

  const handleEditGround = () => {
    // 추후 경기장 수정 기능 구현 시 활성화
    // 현재는 지원하지 않는 기능
    Alert.alert("알림", "아직 지원하지 않는 기능입니다.");
  };

  return (
    <Layout>
      <TopNav
        leftContent={
          <Ionicons
            name="chevron-back"
            size={20}
            color={isDarkmode ? themeColor.white : themeColor.black}
          />
        }
        leftAction={() => router.back()}
        middleContent="경기장 정보"
        middleTextStyle={{
          fontSize: 20,
          fontWeight: "bold",
          color: isDarkmode ? themeColor.white : themeColor.black,
        }}
        backgroundColor={isDarkmode ? themeColor.dark : themeColor.white}
        borderColor={isDarkmode ? themeColor.dark200 : themeColor.gray200}
      />

      <ScrollView
        style={{
          flex: 1,
          backgroundColor: isDarkmode ? themeColor.dark100 : themeColor.gray100,
          padding: 16,
        }}
      >
        {loading ? (
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              padding: 20,
            }}
          >
            <Text>불러오는 중...</Text>
          </View>
        ) : ground ? (
          <>
            <Section
              style={{
                marginBottom: 16,
                padding: 16,
                borderRadius: 16,
                backgroundColor: isDarkmode
                  ? themeColor.dark
                  : themeColor.white,
                borderWidth: 1,
                borderColor: isDarkmode
                  ? themeColor.dark200
                  : themeColor.gray200,
              }}
            >
              <Text
                fontWeight="bold"
                size="h2"
                style={{
                  marginBottom: 8,
                  color: isDarkmode ? themeColor.white : themeColor.black,
                }}
              >
                {ground.name}
              </Text>

              <View
                style={{
                  backgroundColor: ground.reservation_required
                    ? isDarkmode
                      ? "rgba(244, 63, 94, 0.2)"
                      : "rgba(244, 63, 94, 0.1)"
                    : isDarkmode
                    ? "rgba(34, 197, 94, 0.2)"
                    : "rgba(34, 197, 94, 0.1)",
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 16,
                  alignSelf: "flex-start",
                  marginBottom: 16,
                }}
              >
                <Text
                  size="sm"
                  style={{
                    color: ground.reservation_required ? "#f43f5e" : "#22c55e",
                    fontWeight: "bold",
                  }}
                >
                  {ground.reservation_required ? "예약필수" : "예약불필요"}
                </Text>
              </View>

              <View style={{ marginBottom: 16 }}>
                <Text
                  size="sm"
                  style={{
                    marginBottom: 4,
                    color: isDarkmode ? themeColor.gray300 : themeColor.gray500,
                    fontWeight: "bold",
                  }}
                >
                  위치
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 4,
                  }}
                >
                  <Ionicons
                    name="location-outline"
                    size={16}
                    color={isDarkmode ? themeColor.gray400 : themeColor.gray500}
                    style={{ marginRight: 4 }}
                  />
                  <Text
                    style={{
                      flex: 1,
                      color: isDarkmode ? themeColor.white : themeColor.black,
                    }}
                  >
                    {ground.location}
                  </Text>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    marginTop: 8,
                  }}
                >
                  <Button
                    text="주소 복사"
                    onPress={handleCopyAddress}
                    leftContent={
                      <Ionicons name="copy-outline" size={16} color="white" />
                    }
                    style={{ marginRight: 8, flex: 1 }}
                    outline
                    size="sm"
                  />
                  <Button
                    text="지도에서 보기"
                    onPress={handleOpenMap}
                    leftContent={
                      <Ionicons name="map-outline" size={16} color="white" />
                    }
                    style={{ flex: 1 }}
                    size="sm"
                  />
                </View>
              </View>

              {ground.is_indoor !== undefined && (
                <View style={{ marginBottom: 16 }}>
                  <Text
                    size="sm"
                    style={{
                      marginBottom: 4,
                      color: isDarkmode
                        ? themeColor.gray300
                        : themeColor.gray500,
                      fontWeight: "bold",
                    }}
                  >
                    시설 유형
                  </Text>
                  <Text
                    style={{
                      color: isDarkmode ? themeColor.white : themeColor.black,
                    }}
                  >
                    {ground.is_indoor ? "실내" : "실외"}
                  </Text>
                </View>
              )}

              {ground.price_info && (
                <View style={{ marginBottom: 16 }}>
                  <Text
                    size="sm"
                    style={{
                      marginBottom: 4,
                      color: isDarkmode
                        ? themeColor.gray300
                        : themeColor.gray500,
                      fontWeight: "bold",
                    }}
                  >
                    가격 정보
                  </Text>
                  <Text
                    style={{
                      color: isDarkmode ? themeColor.white : themeColor.black,
                    }}
                  >
                    {ground.price_info}
                  </Text>
                </View>
              )}

              {ground.reservation_required && (
                <View style={{ marginBottom: 16 }}>
                  <Text
                    size="sm"
                    style={{
                      marginBottom: 4,
                      color: isDarkmode
                        ? themeColor.gray300
                        : themeColor.gray500,
                      fontWeight: "bold",
                    }}
                  >
                    예약 방법
                  </Text>
                  <Text
                    style={{
                      color: isDarkmode ? themeColor.white : themeColor.black,
                      marginBottom: 8,
                    }}
                  >
                    {ground.reservation_method || "정보 없음"}
                  </Text>

                  {ground.reservation_link && (
                    <Button
                      text="예약 페이지로 이동"
                      onPress={handleOpenReservationLink}
                      leftContent={
                        <Ionicons name="open-outline" size={16} color="white" />
                      }
                      style={{ alignSelf: "flex-start" }}
                      size="sm"
                    />
                  )}
                </View>
              )}
            </Section>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginTop: 16,
              }}
            >
              <Button
                status="primary"
                text="수정하기"
                onPress={handleEditGround}
                style={{ flex: 1, marginRight: 8 }}
                outline
              />
              <Button
                status="danger"
                text="뒤로가기"
                onPress={() => router.back()}
                style={{ flex: 1 }}
                outline
              />
            </View>
          </>
        ) : (
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              padding: 20,
            }}
          >
            <Text>경기장 정보를 찾을 수 없습니다.</Text>
            <Button
              text="뒤로 가기"
              onPress={() => router.back()}
              style={{ marginTop: 16 }}
            />
          </View>
        )}
      </ScrollView>
    </Layout>
  );
}
