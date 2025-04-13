import React, { useEffect, useState, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  Alert,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";
import Card from "../../components/ui/Card";
import Loading from "../../components/ui/Loading";
import {
  Game,
  GameSet,
  GameTeam,
  Player,
  ScoreLog as ScoreLogType,
} from "../../types";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { gameAPI } from "../../lib/api";
import ScoreCounter from "./components/ScoreCounter";
import ScoreLogComponent from "./components/ScoreLog";

interface GameWithDetails extends Game {
  meeting_date?: string;
  teams?: (GameTeam & { players?: Player[] })[];
  sets?: GameSet[];
}

export default function GameDetailScreen() {
  const { id } = useLocalSearchParams();
  const gameId = Array.isArray(id) ? id[0] : id;

  const [game, setGame] = useState<Game | null>(null);
  const [teams, setTeams] = useState<GameTeam[]>([]);
  const [teamMembers, setTeamMembers] = useState<Record<string, Player[]>>({});
  const [gameSets, setGameSets] = useState<GameSet[]>([]);
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [scoreLogs, setScoreLogs] = useState<ScoreLogType[]>([]);
  const [isDeuceActive, setIsDeuceActive] = useState(false);
  const [setWinners, setSetWinners] = useState<Record<string, string>>({});
  const router = useRouter();

  const fetchGameDetails = useCallback(async () => {
    if (!gameId) return;

    try {
      setLoading(true);

      // 1. 게임 정보 가져오기
      const gameData = await gameAPI.getById(gameId);
      setGame(gameData);

      if (!gameData) return;

      // 2. 게임 팀 가져오기
      const teamsData = await gameAPI.getTeams(gameId);

      // 팀에 색상 할당 (없을 경우)
      const teamColors = ["#4C6EF5", "#F03E3E", "#37B24D", "#F76707"];
      const teamsWithColors = teamsData.map((team, index) => {
        // 팀 색상이 없으면 기본 색상 할당
        if (!team.team_color) {
          team.team_color = teamColors[index % teamColors.length];
        }
        return team;
      });

      setTeams(teamsWithColors);

      // 3. 각 팀의 멤버 가져오기
      const membersData: Record<string, Player[]> = {};
      for (const team of teamsWithColors) {
        const { data, error } = await supabase
          .from("game_team_member")
          .select(
            `
            player:player_id(id, name, contact)
          `
          )
          .eq("game_team_id", team.id);

        if (!error && data) {
          membersData[team.id] = data.map((item: any) => item.player);
        }
      }
      setTeamMembers(membersData);

      // 4. 게임 세트 가져오기
      const setsData = await gameAPI.getSets(gameId);
      setGameSets(setsData);

      // 5. 현재 세트의 점수 가져오기
      if (setsData.length > 0) {
        const currentSet = setsData[currentSetIndex];
        const { data: scoreData, error: scoreError } = await supabase
          .from("game_set_score")
          .select("*")
          .eq("game_set_id", currentSet.id);

        if (!scoreError && scoreData) {
          const scoreMap: Record<string, number> = {};
          scoreData.forEach((score) => {
            scoreMap[score.game_team_id] = score.score;
          });
          setScores(scoreMap);

          // 듀스 상태 확인
          if (gameData.use_deuce) {
            checkDeuceStatus(scoreMap, gameData.winning_score);
          }
        }
      }

      // 6. 득점 로그 가져오기
      const { data: logData, error: logError } = await supabase
        .from("score_log")
        .select("*")
        .eq("game_id", gameId)
        .order("event_timestamp", { ascending: false });

      if (!logError && logData) {
        setScoreLogs(logData);
      }

      // 7. 세트 승자 정보 가져오기
      const { data: winnersData, error: winnersError } = await supabase
        .from("game_set_winner")
        .select("*")
        .eq("game_id", gameId);

      if (!winnersError && winnersData) {
        // 세트 ID를 키로, 승리 팀 ID를 값으로 하는 객체 생성
        const winners: Record<string, string> = {};
        winnersData.forEach((winner) => {
          winners[winner.game_set_id] = winner.game_team_id;
        });
        setSetWinners(winners);
      }
    } catch (error) {
      console.error("게임 정보 조회 중 오류 발생:", error);
      Alert.alert("오류", "게임 정보를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [gameId, currentSetIndex]);

  useEffect(() => {
    fetchGameDetails();
  }, [fetchGameDetails]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchGameDetails();
    } finally {
      setRefreshing(false);
    }
  }, [fetchGameDetails]);

  // 듀스 상태 확인 함수
  const checkDeuceStatus = (
    scoreMap: Record<string, number>,
    winningScore: number
  ) => {
    if (!game?.use_deuce) return false;

    const scoreValues = Object.values(scoreMap);
    if (scoreValues.length < 2) return false;

    // 듀스 상태인지 확인 (두 팀 모두 승리점수 - 1에 도달)
    const deuceThreshold = winningScore - 1;
    const teamsAtDeuceThreshold = scoreValues.filter(
      (score) => score >= deuceThreshold
    );

    const isDeuce = teamsAtDeuceThreshold.length >= 2;
    setIsDeuceActive(isDeuce);
    return isDeuce;
  };

  // 세트 승리 조건 확인 함수
  const isSetWinner = (
    teamId: string,
    scoreMap: Record<string, number>,
    targetScore: number
  ) => {
    if (!game?.use_deuce) {
      // 듀스 없는 경우: 목표 점수 달성 시 승리
      return scoreMap[teamId] >= targetScore;
    }

    // 듀스 있는 경우
    const teamScore = scoreMap[teamId];

    // 아직 듀스 상태가 아닌 경우: 일반 승리 조건 적용
    if (!isDeuceActive) {
      return teamScore >= targetScore;
    }

    // 듀스 상태인 경우: 상대팀보다 2점 이상 앞서고 최소 타겟 점수 이상이어야 함
    const otherTeamScores = Object.entries(scoreMap)
      .filter(([id, _]) => id !== teamId)
      .map(([_, score]) => score);

    const highestOtherScore = Math.max(...otherTeamScores);
    return teamScore >= targetScore && teamScore - highestOtherScore >= 2;
  };

  // 점수 증가 함수
  const incrementScore = async (teamId: string) => {
    try {
      // 이미 세트가 종료되었는지 확인
      if (isSetCompleted()) {
        Alert.alert(
          "세트 종료",
          "이 세트는 이미 종료되었습니다. 다음 세트로 넘어가주세요."
        );
        return;
      }

      // 현재 점수 가져오기
      const currentScore = scores[teamId] || 0;
      const newScore = currentScore + 1;

      // 상태 즉시 업데이트 (UI 반응성)
      const newScores = {
        ...scores,
        [teamId]: newScore,
      };
      setScores(newScores);

      // 현재 세트
      const currentSet = gameSets[currentSetIndex];

      // 점수 기록 조회 (이미 있는지 확인)
      const { data: existingScores, error: fetchError } = await supabase
        .from("game_set_score")
        .select("*")
        .eq("game_set_id", currentSet.id)
        .eq("game_team_id", teamId);

      if (fetchError) {
        console.error("점수 조회 중 오류:", fetchError);
        return;
      }

      // 점수 업데이트 또는 생성
      if (existingScores && existingScores.length > 0) {
        // 이미 있는 점수 업데이트
        const { error } = await supabase
          .from("game_set_score")
          .update({ score: newScore })
          .eq("id", existingScores[0].id);

        if (error) {
          console.error("점수 업데이트 중 오류:", error);
          return;
        }
      } else {
        // 새 점수 기록 생성
        const { error } = await supabase.from("game_set_score").insert([
          {
            game_set_id: currentSet.id,
            game_team_id: teamId,
            score: newScore,
          },
        ]);

        if (error) {
          console.error("점수 기록 중 오류:", error);
          return;
        }
      }

      // 득점 로그 기록
      const { data: logData, error: logError } = await supabase
        .from("score_log")
        .insert([
          {
            game_id: gameId,
            game_team_id: teamId,
            game_set_id: currentSet.id,
            event_details: `세트 ${
              currentSetIndex + 1
            }: 득점 (+1): ${newScore}점`,
          },
        ])
        .select();

      if (logError) {
        console.error("득점 로그 기록 중 오류:", logError);
      } else if (logData) {
        // 로그 상태 업데이트
        setScoreLogs([logData[0], ...scoreLogs]);
      }

      // 듀스 상태 확인
      if (game?.use_deuce) {
        checkDeuceStatus(newScores, currentSet.target_score);
      }

      // 세트 승리 확인
      if (isSetWinner(teamId, newScores, currentSet.target_score)) {
        const team = teams.find((t) => t.id === teamId);
        const setNumber = currentSetIndex + 1;

        // 세트 승리 기록
        const { error: setWinnerError } = await supabase
          .from("game_set_winner")
          .insert([
            {
              game_id: gameId,
              game_set_id: currentSet.id,
              game_team_id: teamId,
            },
          ]);

        if (setWinnerError) {
          console.error("세트 승리 기록 중 오류:", setWinnerError);
        }

        Alert.alert(
          "세트 종료",
          `${team?.team_name || "팀"}이(가) ${setNumber}세트를 승리했습니다!`,
          [
            {
              text: "다음 세트로",
              onPress: () => {
                if (currentSetIndex < gameSets.length - 1) {
                  setCurrentSetIndex((prev) => prev + 1);
                  setScores({});
                  setIsDeuceActive(false);
                } else {
                  Alert.alert("게임 종료", "모든 세트가 종료되었습니다.");
                }
              },
            },
          ]
        );

        // 최종 승리 확인
        checkForGameWinner(teamId);
      }
    } catch (error) {
      console.error("점수 증가 중 오류 발생:", error);
      Alert.alert("오류", "점수 기록 중 오류가 발생했습니다.");
    }
  };

  // 승리한 팀이 최종 승리 조건을 충족하는지 확인
  const checkForGameWinner = async (teamId: string) => {
    if (!game || !game.wins_required) return;

    // 현재 팀의 세트 승리 수 계산
    const { data, error } = await supabase
      .from("game_set_winner")
      .select("*")
      .eq("game_id", gameId)
      .eq("game_team_id", teamId);

    if (error) {
      console.error("세트 승리 기록 조회 중 오류:", error);
      return;
    }

    const setsWon = (data?.length || 0) + 1; // 방금 승리한 세트 포함

    if (setsWon >= game.wins_required) {
      const team = teams.find((t) => t.id === teamId);

      // 최종 승리 기록
      const { error: winnerError } = await supabase.from("game_winner").insert([
        {
          game_id: gameId,
          game_team_id: teamId,
        },
      ]);

      if (winnerError) {
        console.error("최종 승자 기록 중 오류:", winnerError);
      }

      Alert.alert(
        "게임 종료",
        `${team?.team_name || "팀"}이(가) ${
          game.wins_required
        }세트를 이겨 최종 승리했습니다!`,
        [{ text: "확인" }]
      );
    }
  };

  // 점수 감소 함수 (무르기)
  const decrementScore = async (teamId: string) => {
    try {
      // 현재 점수 가져오기
      const currentScore = scores[teamId] || 0;

      if (currentScore <= 0) {
        return; // 점수가 이미 0이면 무시
      }

      const newScore = currentScore - 1;

      // 상태 즉시 업데이트 (UI 반응성)
      const newScores = {
        ...scores,
        [teamId]: newScore,
      };
      setScores(newScores);

      // 현재 세트
      const currentSet = gameSets[currentSetIndex];

      // 점수 기록 조회
      const { data: existingScores, error: fetchError } = await supabase
        .from("game_set_score")
        .select("*")
        .eq("game_set_id", currentSet.id)
        .eq("game_team_id", teamId);

      if (fetchError) {
        console.error("점수 조회 중 오류:", fetchError);
        return;
      }

      if (existingScores && existingScores.length > 0) {
        // 점수 업데이트
        const { error } = await supabase
          .from("game_set_score")
          .update({ score: newScore })
          .eq("id", existingScores[0].id);

        if (error) {
          console.error("점수 업데이트 중 오류:", error);
          return;
        }
      }

      // 무르기 로그 기록
      const { data: logData, error: logError } = await supabase
        .from("score_log")
        .insert([
          {
            game_id: gameId,
            game_team_id: teamId,
            game_set_id: currentSet.id,
            event_details: `세트 ${
              currentSetIndex + 1
            }: 무르기 (-1): ${newScore}점`,
          },
        ])
        .select();

      if (logError) {
        console.error("무르기 로그 기록 중 오류:", logError);
      } else if (logData) {
        // 로그 상태 업데이트
        setScoreLogs([logData[0], ...scoreLogs]);
      }

      // 듀스 상태 확인
      if (game?.use_deuce) {
        checkDeuceStatus(newScores, currentSet.target_score);
      }
    } catch (error) {
      console.error("무르기 중 오류 발생:", error);
      Alert.alert("오류", "점수 변경 중 오류가 발생했습니다.");
    }
  };

  // 세트 변경 함수
  const changeSet = (index: number) => {
    if (index < 0 || index >= gameSets.length) return;

    if (isSetCompleted() || index < currentSetIndex || confirm(index)) {
      setCurrentSetIndex(index);
      setScores({});
      setIsDeuceActive(false);
      fetchGameDetails();
    } else {
      Alert.alert(
        "세트 변경",
        "현재 세트가 완료되지 않았습니다. 변경하시겠습니까?",
        [
          { text: "취소", style: "cancel" },
          {
            text: "변경",
            onPress: () => {
              setCurrentSetIndex(index);
              setScores({});
              setIsDeuceActive(false);
              fetchGameDetails();
            },
          },
        ]
      );
    }
  };

  // 현재 세트가 완료되었는지 확인
  const isSetCompleted = () => {
    if (!game || !gameSets[currentSetIndex]) return false;

    const targetScore = gameSets[currentSetIndex].target_score;
    const teamScores = Object.entries(scores);

    for (const [teamId, score] of teamScores) {
      if (isSetWinner(teamId, scores, targetScore)) {
        return true;
      }
    }

    return false;
  };

  // 사용자에게 세트 변경 확인
  const confirm = (index: number) => {
    if (index === currentSetIndex) return true;

    // 미완료된 세트에서 다른 세트로 이동하려는 경우에만 확인
    return !Object.values(scores).some((score) => score > 0);
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <Text>불러오는 중...</Text>
      </View>
    );
  }

  if (!game || teams.length === 0) {
    return (
      <View style={styles.errorContainer}>
        <Text>게임 정보를 찾을 수 없습니다.</Text>
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
    <View style={styles.container}>
      <ScrollView
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
          <Text style={styles.title}>게임 진행</Text>
        </View>

        {/* 게임 정보 */}
        <View style={styles.gameInfoContainer}>
          <View style={styles.gameInfoRow}>
            <Text style={styles.gameInfoLabel}>세트</Text>
            <View style={styles.setSelector}>
              {gameSets.map((set, index) => (
                <TouchableOpacity
                  key={set.id}
                  style={[
                    styles.setButton,
                    currentSetIndex === index && styles.activeSetButton,
                  ]}
                  onPress={() => changeSet(index)}
                >
                  <Text
                    style={[
                      styles.setText,
                      currentSetIndex === index && styles.activeSetText,
                    ]}
                  >
                    {index + 1}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.gameInfoRow}>
            <Text style={styles.gameInfoLabel}>방식</Text>
            <Text style={styles.gameInfoValue}>
              {game && game.wins_required
                ? `${game.num_of_sets}판 ${game.wins_required}선승제`
                : `${game?.num_of_sets || "-"}세트`}
              {game?.use_deuce ? ", 듀스 사용" : ""}
            </Text>
          </View>
          <View style={styles.gameInfoRow}>
            <Text style={styles.gameInfoLabel}>목표</Text>
            <Text style={styles.gameInfoValue}>
              {gameSets[currentSetIndex]?.target_score ||
                game?.winning_score ||
                "-"}
              점{isDeuceActive && <Text style={styles.deuceTag}> (듀스)</Text>}
            </Text>
          </View>
          {game?.penalty_details && (
            <View style={styles.gameInfoRow}>
              <Text style={styles.gameInfoLabel}>벌칙</Text>
              <Text style={styles.gameInfoValue}>{game.penalty_details}</Text>
            </View>
          )}
        </View>

        {/* 점수판 */}
        <View style={styles.scoreboardContainer}>
          {teams.map((team) => (
            <ScoreCounter
              key={team.id}
              team={team}
              members={teamMembers[team.id] || []}
              score={scores[team.id] || 0}
              onIncrement={incrementScore}
              onDecrement={decrementScore}
              isDeuce={isDeuceActive}
              isWinner={setWinners[gameSets[currentSetIndex]?.id] === team.id}
            />
          ))}
        </View>

        {/* 득점 로그 */}
        <ScoreLogComponent
          logs={scoreLogs}
          teams={teams}
          gameSets={gameSets}
          currentSetId={gameSets[currentSetIndex]?.id}
          isRefreshing={refreshing}
          onRefresh={onRefresh}
        />
      </ScrollView>
    </View>
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
    borderBottomWidth: 1,
    borderBottomColor: "#dee2e6",
    backgroundColor: "white",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
  },
  backButtonText: {
    color: "#007bff",
    fontSize: 16,
    marginLeft: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
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
  gameInfoContainer: {
    backgroundColor: "white",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  gameInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  gameInfoLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#495057",
  },
  gameInfoValue: {
    fontSize: 14,
    color: "#212529",
  },
  setSelector: {
    flexDirection: "row",
  },
  setButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#e9ecef",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  activeSetButton: {
    backgroundColor: "#007bff",
  },
  setText: {
    fontSize: 14,
    color: "#495057",
  },
  activeSetText: {
    color: "white",
    fontWeight: "bold",
  },
  scoreboardContainer: {
    backgroundColor: "white",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  deuceTag: {
    color: "#dc3545",
    fontWeight: "bold",
    marginLeft: 4,
  },
});
