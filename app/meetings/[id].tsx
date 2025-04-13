import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Meeting, Player, Game } from "../../types";
import { meetingAPI, gameAPI } from "../../lib/api";

export default function MeetingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [members, setMembers] = useState<Player[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const fetchMeetingDetails = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);

      // 모임 정보 가져오기
      const meetingData = await meetingAPI.getById(id);
      setMeeting(meetingData);

      // 모임 참여자 가져오기
      const membersData = await meetingAPI.getMembers(id);
      setMembers(membersData);

      // 모임에 속한 게임 가져오기
      const gamesData = await gameAPI.getByMeetingId(id);
      setGames(gamesData);
    } catch (error) {
      console.error("모임 정보 조회 중 오류 발생:", error);
      Alert.alert("오류", "모임 정보를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchMeetingDetails();
  }, [fetchMeetingDetails]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchMeetingDetails();
    } finally {
      setRefreshing(false);
    }
  }, [fetchMeetingDetails]);

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

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <Text>불러오는 중...</Text>
      </View>
    );
  }

  if (!meeting) {
    return (
      <View style={styles.errorContainer}>
        <Text>모임 정보를 찾을 수 없습니다.</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>뒤로 가기</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <FontAwesome name="arrow-left" size={18} color="#007bff" />
          <Text style={styles.backButtonText}>뒤로</Text>
        </TouchableOpacity>
      </View>

      {/* 모임 정보 */}
      <View style={styles.meetingInfoCard}>
        <Text style={styles.meetingDate}>
          {formatDate(meeting.meeting_date)}
        </Text>
        <View style={styles.meetingDetails}>
          <View style={styles.detailRow}>
            <FontAwesome name="clock-o" size={16} color="#6c757d" />
            <Text style={styles.detailText}>
              {formatTime(meeting.start_time)}
              {meeting.end_time ? ` - ${formatTime(meeting.end_time)}` : ""}
            </Text>
          </View>
          {meeting.location && (
            <View style={styles.detailRow}>
              <FontAwesome name="map-marker" size={16} color="#6c757d" />
              <Text style={styles.detailText}>{meeting.location}</Text>
            </View>
          )}
        </View>
      </View>

      {/* 참여자 목록 */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>참여자</Text>
          <Text style={styles.sectionCount}>{members.length}명</Text>
        </View>
        <View style={styles.membersList}>
          {members.map((member) => (
            <View key={member.id} style={styles.memberItem}>
              <Text style={styles.memberName}>{member.name}</Text>
            </View>
          ))}
          {members.length === 0 && (
            <Text style={styles.emptyText}>참여자가 없습니다.</Text>
          )}
        </View>
      </View>

      {/* 게임 목록 */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>게임</Text>
          <TouchableOpacity
            style={styles.addGameButton}
            onPress={() => router.push(`/games/new?meetingId=${id}`)}
          >
            <Text style={styles.addGameButtonText}>+ 새 게임</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.gamesList}>
          {games.map((game, index) => (
            <TouchableOpacity
              key={game.id}
              style={styles.gameCard}
              onPress={() => router.push(`/games/${game.id}`)}
            >
              <View style={styles.gameHeader}>
                <Text style={styles.gameTitle}>게임 {index + 1}</Text>
                <View style={styles.gameDetails}>
                  <Text style={styles.gameDetail}>
                    {game.num_of_sets}세트 / {game.winning_score}점
                  </Text>
                </View>
              </View>
              {game.penalty_details && (
                <View style={styles.penaltyContainer}>
                  <Text style={styles.penaltyText}>{game.penalty_details}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
          {games.length === 0 && (
            <View style={styles.emptyGamesContainer}>
              <Text style={styles.emptyText}>등록된 게임이 없습니다.</Text>
              <Text style={styles.emptySubText}>새 게임을 시작해보세요!</Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButtonText: {
    color: "#007bff",
    fontSize: 16,
    marginLeft: 6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  meetingInfoCard: {
    backgroundColor: "white",
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  meetingDate: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
  },
  meetingDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailText: {
    fontSize: 16,
    color: "#212529",
  },
  sectionContainer: {
    backgroundColor: "white",
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  sectionCount: {
    fontSize: 14,
    color: "#6c757d",
  },
  membersList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  memberItem: {
    backgroundColor: "#f1f3f5",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  memberName: {
    fontSize: 14,
  },
  addGameButton: {
    backgroundColor: "#007bff",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
  },
  addGameButtonText: {
    color: "white",
    fontWeight: "500",
  },
  gamesList: {
    gap: 12,
  },
  gameCard: {
    backgroundColor: "#f8f9fa",
    borderRadius: 6,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#007bff",
  },
  gameHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  gameTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  gameDetails: {
    backgroundColor: "#e9ecef",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  gameDetail: {
    fontSize: 12,
    color: "#495057",
  },
  penaltyContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#dee2e6",
  },
  penaltyText: {
    fontSize: 14,
    color: "#6c757d",
    fontStyle: "italic",
  },
  emptyText: {
    textAlign: "center",
    color: "#6c757d",
    marginTop: 8,
  },
  emptySubText: {
    textAlign: "center",
    color: "#6c757d",
    fontSize: 12,
    marginTop: 4,
  },
  emptyGamesContainer: {
    backgroundColor: "#f8f9fa",
    borderRadius: 6,
    padding: 24,
    alignItems: "center",
  },
});
