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
import { eventEmitter, EventTypes } from "../../lib/eventEmitter";
import { useAppFocus } from "../../lib/utils";
import { supabase } from "../../lib/supabase";

export default function MeetingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [members, setMembers] = useState<Player[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [gameWinners, setGameWinners] = useState<
    Record<string, { teamName: string } | null>
  >({});
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

      // 각 게임의 최종 승리팀 정보 가져오기
      const winnerResults: Record<string, { teamName: string } | null> = {};
      await Promise.all(
        gamesData.map(async (game) => {
          // 1. game_winner에서 승리팀 id 조회
          const { data: winnerData } = await supabase
            .from("game_winner")
            .select("game_team_id")
            .eq("game_id", game.id)
            .single();
          if (winnerData && winnerData.game_team_id) {
            // 2. game_team에서 팀명 조회
            const { data: teamData } = await supabase
              .from("game_team")
              .select("team_name")
              .eq("id", winnerData.game_team_id)
              .single();
            winnerResults[game.id] = { teamName: teamData?.team_name || "팀" };
          } else {
            winnerResults[game.id] = null;
          }
        })
      );
      setGameWinners(winnerResults);
    } catch (error) {
      console.error("모임 정보 조회 중 오류 발생:", error);
      Alert.alert("오류", "모임 정보를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  // 앱이 포커스를 얻을 때 데이터를 자동으로 새로고침
  useAppFocus(fetchMeetingDetails);

  useEffect(() => {
    fetchMeetingDetails();

    // 이벤트 구독 설정
    const unsubscribeMeeting = eventEmitter.on(
      EventTypes.MEETING_CHANGED,
      () => {
        fetchMeetingDetails();
      }
    );

    const unsubscribeMembers = eventEmitter.on(
      EventTypes.MEETING_MEMBERS_CHANGED,
      (meetingId) => {
        // 현재 화면의 모임 ID와 같을 때만 새로고침
        if (meetingId === id) {
          fetchMeetingDetails();
        }
      }
    );

    const unsubscribeGame = eventEmitter.on(EventTypes.GAME_CHANGED, () => {
      fetchMeetingDetails();
    });

    // 컴포넌트 언마운트 시 구독 해제
    return () => {
      unsubscribeMeeting();
      unsubscribeMembers();
      unsubscribeGame();
    };
  }, [fetchMeetingDetails, id]);

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
  const formatTime = (timeString: string | null) => {
    if (!timeString) return "-"; // null이나 빈 문자열인 경우 "-" 반환
    const [hours, minutes] = timeString.split(":");
    return `${hours}:${minutes}`;
  };

  // 모임 편집 화면으로 이동
  const handleEditMeeting = () => {
    router.push(`/meetings/edit?id=${id}`);
  };

  // 모임 삭제 처리
  const handleDeleteMeeting = () => {
    Alert.alert(
      "모임 삭제",
      "이 모임을 정말 삭제하시겠습니까? 모든 게임 정보도 함께 삭제됩니다.",
      [
        { text: "취소", style: "cancel" },
        {
          text: "삭제",
          style: "destructive",
          onPress: async () => {
            try {
              await meetingAPI.delete(id);
              Alert.alert("삭제 완료", "모임이 삭제되었습니다.", [
                { text: "확인", onPress: () => router.back() },
              ]);
            } catch (error) {
              console.error("모임 삭제 중 오류 발생:", error);
              Alert.alert("오류", "모임 삭제 중 오류가 발생했습니다.");
            }
          },
        },
      ]
    );
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

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={handleEditMeeting}
          >
            <FontAwesome name="edit" size={18} color="#007bff" />
            <Text style={styles.editButtonText}>편집</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDeleteMeeting}
          >
            <FontAwesome name="trash" size={18} color="#dc3545" />
            <Text style={styles.deleteButtonText}>삭제</Text>
          </TouchableOpacity>
        </View>
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
          <TouchableOpacity
            style={styles.addMemberButton}
            onPress={() => router.push(`/meetings/members?id=${id}`)}
          >
            <Text style={styles.addMemberButtonText}>참여자 관리</Text>
          </TouchableOpacity>
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
                <View style={styles.gameActions}>
                  <TouchableOpacity
                    style={styles.gameActionButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      router.push(`/games/edit?id=${game.id}`);
                    }}
                  >
                    <FontAwesome name="edit" size={14} color="#007bff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.gameActionButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      Alert.alert(
                        "게임 삭제",
                        "이 게임을 정말 삭제하시겠습니까?",
                        [
                          { text: "취소", style: "cancel" },
                          {
                            text: "삭제",
                            style: "destructive",
                            onPress: async () => {
                              try {
                                await gameAPI.delete(game.id);
                                Alert.alert(
                                  "삭제 완료",
                                  "게임이 삭제되었습니다."
                                );
                              } catch (error) {
                                console.error("게임 삭제 중 오류 발생:", error);
                                Alert.alert(
                                  "오류",
                                  "게임 삭제 중 오류가 발생했습니다."
                                );
                              }
                            },
                          },
                        ]
                      );
                    }}
                  >
                    <FontAwesome name="trash" size={14} color="#dc3545" />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.gameDetails}>
                <Text style={styles.gameDetail}>
                  {game.num_of_sets}세트 / {game.winning_score}점
                </Text>
              </View>
              {/* 최종 승리팀 표시 */}
              {gameWinners[game.id] ? (
                <View
                  style={{
                    marginTop: 8,
                    backgroundColor: "#e6ffe6",
                    borderRadius: 4,
                    padding: 4,
                    alignSelf: "flex-start",
                    borderWidth: 1,
                    borderColor: "#28a745",
                  }}
                >
                  <Text
                    style={{
                      color: "#28a745",
                      fontWeight: "bold",
                      fontSize: 13,
                    }}
                  >
                    최종 승리팀: {gameWinners[game.id]?.teamName}
                  </Text>
                </View>
              ) : (
                <View
                  style={{
                    marginTop: 8,
                    backgroundColor: "#f1f3f5",
                    borderRadius: 4,
                    padding: 4,
                    alignSelf: "flex-start",
                  }}
                >
                  <Text style={{ color: "#6c757d", fontSize: 13 }}>진행중</Text>
                </View>
              )}
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
    justifyContent: "space-between",
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
  headerActions: {
    flexDirection: "row",
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
  },
  editButtonText: {
    color: "#007bff",
    fontSize: 16,
    marginLeft: 4,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  deleteButtonText: {
    color: "#dc3545",
    fontSize: 16,
    marginLeft: 4,
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
  addMemberButton: {
    backgroundColor: "#6c757d",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
  },
  addMemberButtonText: {
    color: "white",
    fontWeight: "500",
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
    marginBottom: 8,
  },
  gameTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  gameActions: {
    flexDirection: "row",
    gap: 12,
  },
  gameActionButton: {
    padding: 4,
  },
  gameDetails: {
    backgroundColor: "#e9ecef",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
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
