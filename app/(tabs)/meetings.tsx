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

  useEffect(() => {
    fetchMeetings();
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
  const formatTime = (timeString: string) => {
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
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>모임 목록</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push("/meetings/new")}
        >
          <Text style={styles.addButtonText}>+ 새 모임</Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <Text>불러오는 중...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.meetingsList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {meetings.length > 0 ? (
            meetings.map((meeting) => (
              <TouchableOpacity
                key={meeting.id}
                style={styles.meetingCard}
                onPress={() => router.push(`/meetings/${meeting.id}` as any)}
              >
                <Text style={styles.meetingDate}>
                  {formatDate(meeting.meeting_date)}
                </Text>
                <View style={styles.meetingDetails}>
                  <View style={styles.meetingTime}>
                    <Text>
                      {formatTime(meeting.start_time)}
                      {meeting.end_time
                        ? ` - ${formatTime(meeting.end_time)}`
                        : ""}
                    </Text>
                  </View>
                  {meeting.location && (
                    <View style={styles.meetingLocation}>
                      <Text style={styles.locationText}>
                        {meeting.location}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>등록된 모임이 없습니다.</Text>
              <Text style={styles.emptySubText}>새 모임을 만들어보세요!</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}
