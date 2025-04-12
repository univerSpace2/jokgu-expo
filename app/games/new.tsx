import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Switch,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";
import { Meeting, Player } from "../../types";

export default function NewGameScreen() {
  const [numOfSets, setNumOfSets] = useState("3");
  const [winningScore, setWinningScore] = useState("21");
  const [penaltyDetails, setPenaltyDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const [meetingId, setMeetingId] = useState<string | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [team1Players, setTeam1Players] = useState<string[]>([]);
  const [team2Players, setTeam2Players] = useState<string[]>([]);
  const [team1Name, setTeam1Name] = useState("팀 1");
  const [team2Name, setTeam2Name] = useState("팀 2");
  const [showTeamSelection, setShowTeamSelection] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchMeetings();
    fetchPlayers();
  }, []);

  async function fetchMeetings() {
    try {
      const { data, error } = await supabase
        .from("meeting")
        .select("*")
        .order("meeting_date", { ascending: false });

      if (error) {
        console.error("모임 목록을 불러오는 중 오류 발생:", error);
        return;
      }

      setMeetings(data || []);
    } catch (error) {
      console.error("모임 조회 중 오류 발생:", error);
    }
  }

  async function fetchPlayers() {
    try {
      const { data, error } = await supabase
        .from("player")
        .select("*")
        .order("name");

      if (error) {
        console.error("플레이어 목록을 불러오는 중 오류 발생:", error);
        return;
      }

      setPlayers(data || []);
    } catch (error) {
      console.error("플레이어 조회 중 오류 발생:", error);
    }
  }

  function togglePlayerTeam1(playerId: string) {
    setTeam1Players((prevSelected) => {
      if (prevSelected.includes(playerId)) {
        return prevSelected.filter((id) => id !== playerId);
      } else {
        // 이미 팀 2에 속해 있다면 팀 2에서 제거
        setTeam2Players((prev) => prev.filter((id) => id !== playerId));
        return [...prevSelected, playerId];
      }
    });
  }

  function togglePlayerTeam2(playerId: string) {
    setTeam2Players((prevSelected) => {
      if (prevSelected.includes(playerId)) {
        return prevSelected.filter((id) => id !== playerId);
      } else {
        // 이미 팀 1에 속해 있다면 팀 1에서 제거
        setTeam1Players((prev) => prev.filter((id) => id !== playerId));
        return [...prevSelected, playerId];
      }
    });
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  async function handleSubmit() {
    // 유효성 검증
    if (!numOfSets || !winningScore) {
      Alert.alert("오류", "세트 수와 승리 점수는 필수 입력 항목입니다.");
      return;
    }

    if (
      showTeamSelection &&
      (team1Players.length === 0 || team2Players.length === 0)
    ) {
      Alert.alert("오류", "각 팀에 최소 한 명의 플레이어를 추가해야 합니다.");
      return;
    }

    try {
      setLoading(true);

      // 1. 게임 생성
      const { data: gameData, error: gameError } = await supabase
        .from("game")
        .insert([
          {
            meeting_id: meetingId,
            num_of_sets: parseInt(numOfSets),
            winning_score: parseInt(winningScore),
            penalty_details: penaltyDetails.trim() || null,
          },
        ])
        .select();

      if (gameError || !gameData) {
        Alert.alert("등록 실패", "게임 등록 중 오류가 발생했습니다.");
        console.error("게임 등록 오류:", gameError);
        return;
      }

      const gameId = gameData[0].id;

      // 2. 팀 선택이 활성화된 경우에만 팀 생성
      if (showTeamSelection) {
        // 팀 1 생성
        const { data: team1Data, error: team1Error } = await supabase
          .from("game_team")
          .insert([
            {
              game_id: gameId,
              team_name: team1Name,
            },
          ])
          .select();

        if (team1Error || !team1Data) {
          console.error("팀 1 생성 오류:", team1Error);
          // 오류가 있지만 게임은 생성됨
        } else {
          // 팀 1 구성원 추가
          const team1Id = team1Data[0].id;
          if (team1Players.length > 0) {
            const team1Members = team1Players.map((playerId) => ({
              game_team_id: team1Id,
              player_id: playerId,
            }));

            const { error: team1MemberError } = await supabase
              .from("game_team_member")
              .insert(team1Members);

            if (team1MemberError) {
              console.error("팀 1 구성원 추가 오류:", team1MemberError);
            }
          }
        }

        // 팀 2 생성
        const { data: team2Data, error: team2Error } = await supabase
          .from("game_team")
          .insert([
            {
              game_id: gameId,
              team_name: team2Name,
            },
          ])
          .select();

        if (team2Error || !team2Data) {
          console.error("팀 2 생성 오류:", team2Error);
          // 오류가 있지만 게임은 생성됨
        } else {
          // 팀 2 구성원 추가
          const team2Id = team2Data[0].id;
          if (team2Players.length > 0) {
            const team2Members = team2Players.map((playerId) => ({
              game_team_id: team2Id,
              player_id: playerId,
            }));

            const { error: team2MemberError } = await supabase
              .from("game_team_member")
              .insert(team2Members);

            if (team2MemberError) {
              console.error("팀 2 구성원 추가 오류:", team2MemberError);
            }
          }
        }
      }

      // 3. 게임 세트 생성
      const gameSets = [];
      for (let i = 1; i <= parseInt(numOfSets); i++) {
        gameSets.push({
          game_id: gameId,
          set_number: i,
          target_score: parseInt(winningScore),
        });
      }

      const { error: setError } = await supabase
        .from("game_set")
        .insert(gameSets);

      if (setError) {
        console.error("게임 세트 생성 오류:", setError);
        // 오류가 있지만 게임은 생성됨
      }

      Alert.alert("등록 완료", "게임이 성공적으로 등록되었습니다.", [
        { text: "확인", onPress: () => router.push(`/games/${gameId}`) },
      ]);
    } catch (error) {
      console.error("게임 등록 중 오류 발생:", error);
      Alert.alert("오류", "게임 등록 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>새 게임 만들기</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.formGroup}>
          <Text style={styles.label}>모임 선택 (선택사항)</Text>
          <ScrollView horizontal style={styles.meetingsList}>
            <TouchableOpacity
              style={[
                styles.meetingItem,
                meetingId === null && styles.meetingItemSelected,
              ]}
              onPress={() => setMeetingId(null)}
            >
              <Text
                style={[
                  styles.meetingText,
                  meetingId === null && styles.meetingTextSelected,
                ]}
              >
                독립 게임
              </Text>
            </TouchableOpacity>
            {meetings.map((meeting) => (
              <TouchableOpacity
                key={meeting.id}
                style={[
                  styles.meetingItem,
                  meetingId === meeting.id && styles.meetingItemSelected,
                ]}
                onPress={() => setMeetingId(meeting.id)}
              >
                <Text
                  style={[
                    styles.meetingText,
                    meetingId === meeting.id && styles.meetingTextSelected,
                  ]}
                >
                  {formatDate(meeting.meeting_date)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>세트 수 *</Text>
          <TextInput
            style={styles.input}
            value={numOfSets}
            onChangeText={setNumOfSets}
            placeholder="세트 수를 입력하세요 (예: 3)"
            keyboardType="number-pad"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>승리 점수 *</Text>
          <TextInput
            style={styles.input}
            value={winningScore}
            onChangeText={setWinningScore}
            placeholder="세트당 승리 점수를 입력하세요 (예: 21)"
            keyboardType="number-pad"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>내기/벌칙 정보</Text>
          <TextInput
            style={[styles.input, { height: 80 }]}
            value={penaltyDetails}
            onChangeText={setPenaltyDetails}
            placeholder="내기나 벌칙에 대한 정보를 입력하세요 (선택사항)"
            multiline
          />
        </View>

        <View style={styles.formGroup}>
          <View style={styles.switchContainer}>
            <Text style={styles.label}>팀 구성하기</Text>
            <Switch
              value={showTeamSelection}
              onValueChange={setShowTeamSelection}
              trackColor={{ false: "#e9ecef", true: "#007bff" }}
            />
          </View>
        </View>

        {showTeamSelection && (
          <>
            <View style={styles.teamSection}>
              <View style={styles.teamHeader}>
                <Text style={styles.teamTitle}>팀 1</Text>
                <TextInput
                  style={styles.teamNameInput}
                  value={team1Name}
                  onChangeText={setTeam1Name}
                  placeholder="팀 이름"
                />
              </View>

              <View style={styles.playersList}>
                {players.map((player) => (
                  <TouchableOpacity
                    key={player.id}
                    style={[
                      styles.playerItem,
                      team1Players.includes(player.id) &&
                        styles.playerItemSelected,
                    ]}
                    onPress={() => togglePlayerTeam1(player.id)}
                  >
                    <Text
                      style={[
                        styles.playerName,
                        team1Players.includes(player.id) &&
                          styles.playerNameSelected,
                      ]}
                    >
                      {player.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.teamSection}>
              <View style={styles.teamHeader}>
                <Text style={styles.teamTitle}>팀 2</Text>
                <TextInput
                  style={styles.teamNameInput}
                  value={team2Name}
                  onChangeText={setTeam2Name}
                  placeholder="팀 이름"
                />
              </View>

              <View style={styles.playersList}>
                {players.map((player) => (
                  <TouchableOpacity
                    key={player.id}
                    style={[
                      styles.playerItem,
                      team2Players.includes(player.id) &&
                        styles.playerItemSelected,
                    ]}
                    onPress={() => togglePlayerTeam2(player.id)}
                  >
                    <Text
                      style={[
                        styles.playerName,
                        team2Players.includes(player.id) &&
                          styles.playerNameSelected,
                      ]}
                    >
                      {player.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        )}

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? "처리 중..." : "게임 만들기"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.back()}
          disabled={loading}
        >
          <Text style={styles.cancelButtonText}>취소</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f8f9fa",
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  form: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    marginBottom: 24,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: "500",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ced4da",
    borderRadius: 4,
    padding: 12,
    fontSize: 16,
  },
  meetingsList: {
    flexDirection: "row",
    marginBottom: 8,
  },
  meetingItem: {
    backgroundColor: "#e9ecef",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginRight: 8,
  },
  meetingItemSelected: {
    backgroundColor: "#007bff",
  },
  meetingText: {
    fontSize: 14,
  },
  meetingTextSelected: {
    color: "white",
  },
  switchContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  teamSection: {
    marginBottom: 16,
    backgroundColor: "#f8f9fa",
    padding: 16,
    borderRadius: 8,
  },
  teamHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  teamTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginRight: 16,
  },
  teamNameInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ced4da",
    borderRadius: 4,
    padding: 8,
    fontSize: 14,
  },
  playersList: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  playerItem: {
    backgroundColor: "#e9ecef",
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    margin: 4,
  },
  playerItemSelected: {
    backgroundColor: "#007bff",
  },
  playerName: {
    fontSize: 14,
  },
  playerNameSelected: {
    color: "white",
  },
  submitButton: {
    backgroundColor: "#007bff",
    paddingVertical: 12,
    borderRadius: 4,
    alignItems: "center",
    marginTop: 8,
  },
  disabledButton: {
    backgroundColor: "#6c757d",
  },
  submitButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  cancelButton: {
    paddingVertical: 12,
    borderRadius: 4,
    alignItems: "center",
    marginTop: 8,
  },
  cancelButtonText: {
    color: "#6c757d",
    fontSize: 16,
  },
});
