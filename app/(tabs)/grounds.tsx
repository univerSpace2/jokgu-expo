import { useEffect, useState, useCallback } from "react";
import {
  ScrollView,
  View,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { groundAPI, jokguGroundTypeAPI } from "../../lib/api";
import { JokguGround, JokguGroundType } from "../../types";
import { eventEmitter, EventTypes } from "../../lib/eventEmitter";
import { useAppFocus } from "../../lib/utils";
import {
  Layout,
  Button,
  Section,
  Text,
  TopNav,
  useTheme,
  themeColor,
} from "react-native-rapi-ui";
import { Ionicons } from "@expo/vector-icons";

export default function GroundsScreen() {
  const [grounds, setGrounds] = useState<JokguGround[]>([]);
  const [groundTypes, setGroundTypes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const { theme, isDarkmode } = useTheme();

  const fetchGroundTypes = useCallback(async () => {
    try {
      const types = await jokguGroundTypeAPI.getAll();
      const typesMap: Record<string, string> = {};
      types.forEach((type) => {
        typesMap[type.id] = type.type_name;
      });
      setGroundTypes(typesMap);
    } catch (error) {
      console.error("족구장 타입 조회 중 오류 발생:", error);
    }
  }, []);

  const fetchGrounds = useCallback(async () => {
    try {
      setLoading(true);
      const data = await groundAPI.getAll();
      setGrounds(data);
    } catch (error) {
      console.error("경기장 목록 조회 중 오류 발생:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 앱이 포커스를 얻을 때 데이터를 자동으로 새로고침
  useAppFocus(fetchGrounds);

  useEffect(() => {
    fetchGrounds();
    fetchGroundTypes();

    // 이벤트 구독 설정
    const unsubscribe = eventEmitter.on(EventTypes.GROUND_CHANGED, () => {
      fetchGrounds();
    });

    // 컴포넌트 언마운트 시 구독 해제
    return () => {
      unsubscribe();
    };
  }, [fetchGrounds, fetchGroundTypes]);

  const handleOpenReservationLink = async (link: string) => {
    if (link) {
      try {
        const canOpen = await Linking.canOpenURL(link);
        if (canOpen) {
          await Linking.openURL(link);
        } else {
          Alert.alert("오류", "예약 링크를 열 수 없습니다.");
        }
      } catch (error) {
        console.error("예약 링크 열기 오류:", error);
        Alert.alert("오류", "예약 링크를 여는데 실패했습니다.");
      }
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchGrounds();
      await fetchGroundTypes();
    } finally {
      setRefreshing(false);
    }
  }, [fetchGrounds, fetchGroundTypes]);

  return (
    <Layout>
      <TopNav
        middleContent="경기장 목록"
        middleTextStyle={{
          fontSize: 24,
          fontWeight: "bold",
          color: isDarkmode ? themeColor.white : themeColor.black,
        }}
        rightContent={
          <Button
            status="primary"
            size="md"
            text="새 경기장"
            onPress={() => router.push("/grounds/new")}
            style={{
              paddingHorizontal: 4,
              minWidth: 80,
              borderRadius: 8,
              marginRight: 5,
            }}
          />
        }
        leftContent={
          <Ionicons
            name="refresh-outline"
            size={20}
            color={isDarkmode ? themeColor.white : themeColor.black}
            onPress={onRefresh}
          />
        }
        backgroundColor={isDarkmode ? themeColor.dark : themeColor.white}
        borderColor={isDarkmode ? themeColor.dark200 : themeColor.gray200}
      />

      {loading && !refreshing ? (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: isDarkmode
              ? themeColor.dark100
              : themeColor.gray100,
          }}
        >
          <Text>불러오는 중...</Text>
        </View>
      ) : (
        <ScrollView
          style={{
            flex: 1,
            backgroundColor: isDarkmode
              ? themeColor.dark100
              : themeColor.gray100,
            padding: 16,
          }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {grounds.length > 0 ? (
            grounds.map((ground) => (
              <TouchableOpacity
                key={ground.id}
                onPress={() => router.push(`/grounds/${ground.id}` as any)}
                style={{ marginBottom: 16 }}
                activeOpacity={0.7}
              >
                <Section
                  style={{
                    backgroundColor: isDarkmode
                      ? themeColor.dark
                      : themeColor.white,
                    padding: 16,
                    borderRadius: 16,
                    shadowColor: isDarkmode ? "#000" : "#888",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: isDarkmode ? 0.2 : 0.08,
                    shadowRadius: 8,
                    elevation: 3,
                    borderWidth: 1,
                    borderColor: isDarkmode
                      ? themeColor.dark200
                      : themeColor.gray200,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 8,
                    }}
                  >
                    <Text
                      fontWeight="bold"
                      size="h3"
                      style={{
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
                      }}
                    >
                      <Text
                        size="sm"
                        style={{
                          color: ground.reservation_required
                            ? "#f43f5e"
                            : "#22c55e",
                          fontWeight: "bold",
                        }}
                      >
                        {ground.reservation_required
                          ? "예약필수"
                          : "예약불필요"}
                      </Text>
                    </View>
                  </View>

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
                      color={
                        isDarkmode ? themeColor.gray400 : themeColor.gray500
                      }
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      size="md"
                      style={{
                        color: isDarkmode
                          ? themeColor.gray400
                          : themeColor.gray500,
                      }}
                    >
                      {ground.location}
                    </Text>
                  </View>

                  <View style={{ flexDirection: "row", marginTop: 8 }}>
                    {ground.is_indoor !== undefined && (
                      <View
                        style={{
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          backgroundColor: ground.is_indoor
                            ? isDarkmode
                              ? "rgba(59, 130, 246, 0.2)"
                              : "rgba(59, 130, 246, 0.1)"
                            : isDarkmode
                            ? "rgba(245, 158, 11, 0.2)"
                            : "rgba(245, 158, 11, 0.1)",
                          borderRadius: 4,
                          marginRight: 8,
                        }}
                      >
                        <Text
                          size="sm"
                          style={{
                            color: ground.is_indoor ? "#3b82f6" : "#f59e0b",
                          }}
                        >
                          {ground.is_indoor ? "실내" : "실외"}
                        </Text>
                      </View>
                    )}

                    {ground.f_jokgu_ground_type &&
                      groundTypes[ground.f_jokgu_ground_type] && (
                        <View
                          style={{
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            backgroundColor: isDarkmode
                              ? "rgba(139, 92, 246, 0.2)"
                              : "rgba(139, 92, 246, 0.1)",
                            borderRadius: 4,
                            marginRight: 8,
                          }}
                        >
                          <Text size="sm" style={{ color: "#8b5cf6" }}>
                            {groundTypes[ground.f_jokgu_ground_type]}
                          </Text>
                        </View>
                      )}

                    {ground.reservation_link && (
                      <TouchableOpacity
                        style={{
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          backgroundColor: isDarkmode
                            ? "rgba(14, 165, 233, 0.2)"
                            : "rgba(14, 165, 233, 0.1)",
                          borderRadius: 4,
                          flexDirection: "row",
                          alignItems: "center",
                        }}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleOpenReservationLink(ground.reservation_link!);
                        }}
                      >
                        <Ionicons
                          name="link-outline"
                          size={14}
                          color="#0ea5e9"
                          style={{ marginRight: 4 }}
                        />
                        <Text size="sm" style={{ color: "#0ea5e9" }}>
                          예약하기
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </Section>
              </TouchableOpacity>
            ))
          ) : (
            <View
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                padding: 40,
                marginTop: 50,
              }}
            >
              <Ionicons
                name="map-outline"
                size={60}
                color={isDarkmode ? themeColor.dark200 : themeColor.gray}
                style={{ marginBottom: 16, opacity: 0.6 }}
              />
              <Text
                size="lg"
                fontWeight="bold"
                style={{
                  marginBottom: 8,
                  color: isDarkmode ? themeColor.white : themeColor.black,
                }}
              >
                등록된 경기장이 없습니다.
              </Text>
              <Text
                size="md"
                style={{
                  color: isDarkmode ? themeColor.gray400 : themeColor.gray500,
                  textAlign: "center",
                  marginBottom: 20,
                }}
              >
                새로운 경기장을 추가해보세요!
              </Text>
              <Button
                text="+ 새 경기장 추가"
                onPress={() => router.push("/grounds/new")}
                status="primary"
                size="lg"
                style={{ borderRadius: 12 }}
              />
            </View>
          )}
        </ScrollView>
      )}
    </Layout>
  );
}
