import { useEffect, useState, useCallback } from "react";
import {
  ScrollView,
  StyleSheet,
  View,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { meetingAPI } from "../../lib/api";
import { Meeting } from "../../types";
import { eventEmitter, EventTypes } from "../../lib/eventEmitter";
import { useAppFocus } from "../../lib/utils";
import {
  Layout,
  Button,
  Section,
  Text,
  TopNav,
  themeColor,
  useTheme,
} from "react-native-rapi-ui";
import { Ionicons } from "@expo/vector-icons";

export default function MeetingsTab() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const { theme, isDarkmode } = useTheme();

  const fetchMeetings = useCallback(async () => {
    try {
      setLoading(true);
      const data = await meetingAPI.getAll();
      setMeetings(data);
    } catch (error) {
      console.error("모임 목록 조회 중 오류 발생:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 앱이 포커스를 얻을 때 데이터를 자동으로 새로고침
  useAppFocus(fetchMeetings);

  useEffect(() => {
    fetchMeetings();

    // 이벤트 구독 설정
    const unsubscribe = eventEmitter.on(EventTypes.MEETING_CHANGED, () => {
      fetchMeetings();
    });

    // 컴포넌트 언마운트 시 구독 해제
    return () => {
      unsubscribe();
    };
  }, [fetchMeetings]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchMeetings();
    } finally {
      setRefreshing(false);
    }
  }, [fetchMeetings]);

  // 날짜 포맷 함수
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short",
    });
  };

  // 시간 포맷 함수
  const formatTime = (timeString: string | null) => {
    if (!timeString) return "-"; // null이나 빈 문자열인 경우 "-" 반환
    const [hours, minutes] = timeString.split(":");
    return `${hours}:${minutes}`;
  };

  return (
    <Layout>
      <TopNav
        middleContent="모임"
        middleTextStyle={{
          fontSize: 20,
          fontWeight: "bold",
          color: isDarkmode ? themeColor.white : themeColor.black,
        }}
        rightContent={
          <Button
            status="primary"
            size="md"
            text="새 모임"
            onPress={() => router.push("/meetings/new")}
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
          {meetings.length > 0 ? (
            meetings.map((meeting) => (
              <TouchableOpacity
                key={meeting.id}
                onPress={() => router.push(`/meetings/${meeting.id}` as any)}
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
                  <View style={{ marginBottom: 12 }}>
                    <Text
                      fontWeight="bold"
                      size="xl"
                      style={{ color: themeColor.primary, marginBottom: 4 }}
                    >
                      {formatDate(meeting.meeting_date)}
                    </Text>
                  </View>

                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                      }}
                    >
                      <Ionicons
                        name="time-outline"
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
                        {formatTime(meeting.start_time)} ~{" "}
                        {meeting.end_time ? formatTime(meeting.end_time) : "-"}
                      </Text>
                    </View>

                    <View
                      style={{
                        backgroundColor: isDarkmode
                          ? themeColor.primary + "30"
                          : themeColor.primary + "20",
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 16,
                        flexDirection: "row",
                        alignItems: "center",
                      }}
                    >
                      <Ionicons
                        name="location-outline"
                        size={16}
                        color={themeColor.primary}
                        style={{ marginRight: 4 }}
                      />
                      <Text
                        size="sm"
                        style={{
                          color: themeColor.primary,
                        }}
                      >
                        {meeting.location}
                      </Text>
                    </View>
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
                name="calendar-outline"
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
                모임이 없습니다
              </Text>
              <Text
                size="md"
                style={{
                  color: isDarkmode ? themeColor.gray400 : themeColor.gray500,
                  textAlign: "center",
                  marginBottom: 20,
                }}
              >
                새로운 모임을 추가해보세요.
              </Text>
              <Button
                text="+ 새 모임 추가"
                onPress={() => router.push("/meetings/new")}
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
