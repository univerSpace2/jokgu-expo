import { useEffect, useState, useCallback } from "react";
import {
  ScrollView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { meetingAPI } from "../../lib/api";
import { Meeting } from "../../types";
import { eventEmitter, EventTypes } from "../../lib/eventEmitter";
import { useAppFocus } from "../../lib/utils";
import { Layout, Button, Section } from "react-native-rapi-ui";

export default function MeetingsTab() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

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

  // 스타일 추가
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 16,
      backgroundColor: "#f8f9fa",
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    title: {
      fontSize: 24,
      fontWeight: "bold",
    },
    addButton: {
      backgroundColor: "#007bff",
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 4,
    },
    addButtonText: {
      color: "white",
      fontWeight: "bold",
    },
    meetingsList: {
      flex: 1,
    },
    meetingCard: {
      backgroundColor: "white",
      padding: 16,
      borderRadius: 8,
      marginBottom: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    meetingDate: {
      fontSize: 16,
      fontWeight: "bold",
      marginBottom: 8,
    },
    meetingDetails: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    meetingTime: {
      flexDirection: "row",
      alignItems: "center",
    },
    meetingLocation: {
      backgroundColor: "#f1f1f1",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    locationText: {
      fontSize: 12,
      color: "#666",
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    emptyContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 40,
    },
    emptyText: {
      fontSize: 16,
      fontWeight: "bold",
      marginBottom: 8,
    },
    emptySubText: {
      fontSize: 14,
      color: "#666",
    },
  });

  return (
    <Layout>
      <Section
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <Text size="h2" fontWeight="bold">
          모임 목록
        </Text>
        <Button
          text={"+ 새 모임"}
          onPress={() => router.push("/meetings/new")}
          size="md"
          status="info"
          style={{ borderRadius: 8 }}
        />
      </Section>

      {loading && !refreshing ? (
        <Section
          style={{ alignItems: "center", justifyContent: "center", flex: 1 }}
        >
          <Text>불러오는 중...</Text>
        </Section>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {meetings.length > 0 ? (
            meetings.map((meeting) => (
              <Section
                key={meeting.id}
                style={{
                  backgroundColor: "white",
                  padding: 16,
                  borderRadius: 12,
                  marginBottom: 14,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.08,
                  shadowRadius: 4,
                  elevation: 2,
                }}
                onTouchEnd={() => router.push(`/meetings/${meeting.id}` as any)}
              >
                <Text size="lg" fontWeight="bold" style={{ marginBottom: 8 }}>
                  {formatDate(meeting.meeting_date)}
                </Text>
                <Section
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Text>
                    {formatTime(meeting.start_time)} ~{" "}
                    {formatTime(meeting.end_time)}
                  </Text>
                  <Section
                    style={{
                      backgroundColor: "#f1f1f1",
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 12,
                    }}
                  >
                    <Text size="sm" style={{ color: "#666" }}>
                      {meeting.location}
                    </Text>
                  </Section>
                </Section>
              </Section>
            ))
          ) : (
            <Section
              style={{
                alignItems: "center",
                justifyContent: "center",
                padding: 40,
              }}
            >
              <Text size="lg" fontWeight="bold" style={{ marginBottom: 8 }}>
                모임이 없습니다
              </Text>
              <Text size="md" style={{ color: "#666" }}>
                새로운 모임을 추가해보세요.
              </Text>
            </Section>
          )}
        </ScrollView>
      )}
    </Layout>
  );
}
