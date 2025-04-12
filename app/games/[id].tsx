import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  Alert,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";
import Card from "../../components/ui/Card";
import Loading from "../../components/ui/Loading";
import { Game, GameSet, GameTeam, Player } from "../../types";

interface GameWithDetails extends Game {
  meeting_date?: string;
  teams?: (GameTeam & { players?: Player[] })[];
  sets?: GameSet[];
}

export default function GameDetailScreen() {
  const { id } = useLocalSearchParams();
  const [game, setGame] = useState<GameWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSetId, setActiveSetId] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<string, Record<string, number>>>(
    {}
  );
  const router = useRouter();

  useEffect(() => {
    if (id) {
      fetchGameDetails();
    }
  }, [id]);

  async function fetchGameDetails() {
    try {
      setLoading(true);

      // 1. 게임 정보 가져오기
      const { data: gameData, error: gameError } = await supabase
        .from("game")
        .select(
          `
          *,
          meeting:meeting_id (meeting_date)
        `
        )
        .eq("id", id)
        .single();

      if (gameError) {
        console.error("게임 정보 조회 오류:", gameError);
        Alert.alert("오류", "게임 정보를 불러오는 중 오류가 발생했습니다.");
        return;
      }

      const gameWithDetails: GameWithDetails = {
        ...gameData,
        meeting_date: gameData.meeting?.meeting_date,
      };

      // 2. 게임 팀 정보 가져오기
      const { data: teamsData, error: teamsError } = await supabase
        .from("game_team")
        .select("*")
        .eq("game_id", id);

      if (teamsError) {
        console.error("팀 정보 조회 오류:", teamsError);
      } else {
        gameWithDetails.teams = teamsData;

        // 3. 각 팀별 플레이어 정보 가져오기
        for (const team of gameWithDetails.teams) {
          const { data: teamPlayersData, error: teamPlayersError } =
            await supabase
              .from("game_team_member")
              .select(
                `
              player_id,
              player:player_id (id, name, contact)
            `
              )
              .eq("game_team_id", team.id);

          if (teamPlayersError) {
            console.error(
              `팀 ${team.id} 플레이어 정보 조회 오류:`,
              teamPlayersError
            );
          } else {
            team.players = teamPlayersData.map((item) => ({
              id: item.player.id,
              name: item.player.name,
              contact: item.player.contact,
            }));
          }
        }
      }

      // 4. 게임 세트 정보 가져오기
      const { data: setsData, error: setsError } = await supabase
        .from("game_set")
        .select("*")
        .eq("game_id", id)
        .order("set_number");

      if (setsError) {
        console.error("세트 정보 조회 오류:", setsError);
      } else {
        gameWithDetails.sets = setsData;

        // 첫 번째 세트를 활성 세트로 설정 (있을 경우)
        if (setsData.length > 0) {
          setActiveSetId(setsData[0].id);
        }

        // 5. 각 세트별 점수 정보 가져오기
        const newScores: Record<string, Record<string, number>> = {};

        for (const set of setsData) {
          const { data: scoresData, error: scoresError } = await supabase
            .from("game_set_score")
            .select("*")
            .eq("game_set_id", set.id);

          if (scoresError) {
            console.error(`세트 ${set.id} 점수 정보 조회 오류:`, scoresError);
          } else {
            newScores[set.id] = {};
            for (const score of scoresData) {
              newScores[set.id][score.game_team_id] = score.score;
            }
          }
        }

        setScores(newScores);
      }

      setGame(gameWithDetails);
    } catch (error) {
      console.error("게임 상세 조회 중 오류 발생:", error);
      Alert.alert("오류", "게임 정보를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function handleScoreChange(teamId: string, increment: number) {
    if (!activeSetId || !game) return;

    try {
      // 현재 점수 가져오기
      const currentScore = scores[activeSetId]?.[teamId] || 0;
      const newScore = currentScore + increment;

      // 음수 점수 방지
      if (newScore < 0) return;

      // 1. 임시로 로컬 상태 업데이트
      setScores((prev) => ({
        ...prev,
        [activeSetId]: {
          ...prev[activeSetId],
          [teamId]: newScore,
        },
      }));

      // 2. DB에 점수 업데이트
      const { data: existingScore, error: checkError } = await supabase
        .from("game_set_score")
        .select("*")
        .eq("game_set_id", activeSetId)
        .eq("game_team_id", teamId);

      if (checkError) {
        console.error("점수 확인 오류:", checkError);
        return;
      }

      if (existingScore && existingScore.length > 0) {
        // 기존 점수 업데이트
        const { error } = await supabase
          .from("game_set_score")
          .update({ score: newScore })
          .eq("game_set_id", activeSetId)
          .eq("game_team_id", teamId);

        if (error) {
          console.error("점수 업데이트 오류:", error);
          Alert.alert("오류", "점수 업데이트 중 오류가 발생했습니다.");
        }
      } else {
        // 새 점수 생성
        const { error } = await supabase.from("game_set_score").insert([
          {
            game_set_id: activeSetId,
            game_team_id: teamId,
            score: newScore,
          },
        ]);

        if (error) {
          console.error("점수 생성 오류:", error);
          Alert.alert("오류", "점수 등록 중 오류가 발생했습니다.");
        }
      }

      // 3. 점수 로그 기록
      await supabase.from("score_log").insert([
        {
          game_id: game.id,
          game_team_id: teamId,
          event_details: `점수 ${increment > 0 ? "획득" : "감소"}: ${Math.abs(
            increment
          )}`,
        },
      ]);
    } catch (error) {
      console.error("점수 업데이트 중 오류 발생:", error);
      Alert.alert("오류", "점수 처리 중 오류가 발생했습니다.");
    }
  }

  if (loading) {
    return <Loading message="게임 정보를 불러오는 중..." />;
  }

  if (!game) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>게임 정보를 찾을 수 없습니다.</Text>
      </View>
    );
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return "독립 게임";
    return new Date(dateString).toLocaleDateString("ko-KR");
  };

  const activeSet = game.sets?.find((set) => set.id === activeSetId);

  return (
    <ScrollView style={styles.container}>
      <Card>
        <Text style={styles.title}>게임 정보</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>날짜:</Text>
          <Text style={styles.infoValue}>{formatDate(game.meeting_date)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>세트:</Text>
          <Text style={styles.infoValue}>{game.num_of_sets}세트</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>승리 점수:</Text>
          <Text style={styles.infoValue}>{game.winning_score}점</Text>
        </View>
        {game.penalty_details && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>내기/벌칙:</Text>
            <Text style={styles.infoValue}>{game.penalty_details}</Text>
          </View>
        )}
      </Card>

      {game.teams && game.teams.length > 0 && (
        <Card>
          <Text style={styles.title}>팀 구성</Text>
          {game.teams.map((team) => (
            <View key={team.id} style={styles.teamSection}>
              <Text style={styles.teamName}>
                {team.team_name || "이름 없는 팀"}
              </Text>
              <View style={styles.playersList}>
                {team.players && team.players.length > 0 ? (
                  team.players.map((player) => (
                    <View key={player.id} style={styles.playerItem}>
                      <Text style={styles.playerName}>{player.name}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyText}>
                    등록된 플레이어가 없습니다.
                  </Text>
                )}
              </View>
            </View>
          ))}
        </Card>
      )}

      {game.sets && game.sets.length > 0 && (
        <Card>
          <Text style={styles.title}>세트</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.setsList}
          >
            {game.sets.map((set) => (
              <TouchableOpacity
                key={set.id}
                style={[
                  styles.setItem,
                  activeSetId === set.id && styles.activeSetItem,
                ]}
                onPress={() => setActiveSetId(set.id)}
              >
                <Text
                  style={[
                    styles.setText,
                    activeSetId === set.id && styles.activeSetText,
                  ]}
                >
                  {set.set_number}세트
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {activeSet && game.teams && (
            <View style={styles.scoreSection}>
              <Text style={styles.scoreTitle}>
                {activeSet.set_number}세트 점수 (목표: {activeSet.target_score}
                점)
              </Text>

              {game.teams.map((team) => {
                const teamScore = scores[activeSetId!]?.[team.id] || 0;
                return (
                  <View key={team.id} style={styles.scoreRow}>
                    <Text style={styles.scoreTeamName}>
                      {team.team_name || "이름 없는 팀"}
                    </Text>
                    <View style={styles.scoreControls}>
                      <TouchableOpacity
                        style={styles.scoreButton}
                        onPress={() => handleScoreChange(team.id, -1)}
                      >
                        <Text style={styles.scoreButtonText}>-</Text>
                      </TouchableOpacity>
                      <Text style={styles.scoreValue}>{teamScore}</Text>
                      <TouchableOpacity
                        style={styles.scoreButton}
                        onPress={() => handleScoreChange(team.id, 1)}
                      >
                        <Text style={styles.scoreButtonText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f8f9fa",
  },
  errorText: {
    fontSize: 16,
    color: "#dc3545",
    textAlign: "center",
    marginTop: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: "500",
    width: 100,
  },
  infoValue: {
    fontSize: 14,
    flex: 1,
  },
  teamSection: {
    marginBottom: 16,
  },
  teamName: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
  },
  playersList: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  playerItem: {
    backgroundColor: "#e9ecef",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    margin: 4,
  },
  playerName: {
    fontSize: 14,
  },
  emptyText: {
    fontSize: 14,
    color: "#6c757d",
    fontStyle: "italic",
  },
  setsList: {
    flexDirection: "row",
    marginBottom: 16,
  },
  setItem: {
    backgroundColor: "#e9ecef",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
    marginRight: 8,
  },
  activeSetItem: {
    backgroundColor: "#007bff",
  },
  setText: {
    fontSize: 14,
  },
  activeSetText: {
    color: "white",
    fontWeight: "bold",
  },
  scoreSection: {
    marginTop: 8,
  },
  scoreTitle: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 12,
  },
  scoreRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 4,
  },
  scoreTeamName: {
    fontSize: 16,
    fontWeight: "500",
  },
  scoreControls: {
    flexDirection: "row",
    alignItems: "center",
  },
  scoreButton: {
    width: 36,
    height: 36,
    backgroundColor: "#007bff",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 18,
  },
  scoreButtonText: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
  },
  scoreValue: {
    fontSize: 20,
    fontWeight: "bold",
    width: 40,
    textAlign: "center",
  },
});
