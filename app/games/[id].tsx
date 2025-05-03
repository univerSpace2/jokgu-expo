import React, { useEffect, useState, useCallback, useRef } from "react";
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
import { eventEmitter, EventTypes } from "../../lib/eventEmitter";
import { useAppFocus } from "../../lib/utils";
import { useTheme, themeColor } from "react-native-rapi-ui";

interface GameWithDetails extends Game {
  meeting_date?: string;
  teams?: (GameTeam & { players?: Player[] })[];
  sets?: GameSet[];
}

interface TeamPositions {
  [teamId: string]: { [playerId: string]: number };
}

interface PlayerWithPosition extends Player {
  position?: number;
}

export default function GameDetailScreen() {
  const { id } = useLocalSearchParams();
  const gameId = Array.isArray(id) ? id[0] : id;

  const [game, setGame] = useState<Game | null>(null);
  const [teams, setTeams] = useState<GameTeam[]>([]);
  const [teamMembers, setTeamMembers] = useState<
    Record<string, PlayerWithPosition[]>
  >({});
  const [teamPositions, setTeamPositions] = useState<TeamPositions>({});
  const [gameSets, setGameSets] = useState<GameSet[]>([]);
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [scoreLogs, setScoreLogs] = useState<ScoreLogType[]>([]);
  const [isDeuceActive, setIsDeuceActive] = useState(false);
  const [setWinners, setSetWinners] = useState<Record<string, string>>({});
  const [finalWinnerTeamId, setFinalWinnerTeamId] = useState<string | null>(
    null
  );
  // 서브 관련 상태
  const [servingTeamId, setServingTeamId] = useState<string | null>(null);
  const [servingPlayerIndex, setServingPlayerIndex] = useState<
    Record<string, number>
  >({});
  const [showServeSelector, setShowServeSelector] = useState(false);

  const router = useRouter();
  const { theme } = useTheme();

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

      // 3. 각 팀의 멤버와 포지션 가져오기
      const membersData: Record<string, PlayerWithPosition[]> = {};
      const positionsData: TeamPositions = {};

      for (const team of teamsWithColors) {
        const { data, error } = await supabase
          .from("game_team_member")
          .select(
            `
            player_id,
            f_position,
            player:player_id(id, name, contact)
          `
          )
          .eq("game_team_id", team.id);

        if (!error && data) {
          // 팀원 정보 저장
          membersData[team.id] = data.map((item: any) => ({
            ...item.player,
            position: null, // 초기 포지션 null로 설정
          }));

          // 포지션 정보 설정
          positionsData[team.id] = {};

          for (const member of data) {
            if (member.f_position) {
              const { data: positionData } = await supabase
                .from("position")
                .select("*")
                .eq("id", member.f_position)
                .single();

              if (positionData) {
                // 포지션 이름을 번호로 변환
                const teamSize = membersData[team.id].length;
                const isThreePlayer = teamSize === 3;
                let positionNumber = 0;

                if (isThreePlayer) {
                  // 3인팀 포지션 매핑
                  switch (positionData.position_name) {
                    case "수비(솔로)":
                      positionNumber = 1;
                      break;
                    case "공격수":
                      positionNumber = 2;
                      break;
                    case "세터":
                      positionNumber = 3;
                      break;
                  }
                } else {
                  // 4인팀 포지션 매핑
                  switch (positionData.position_name) {
                    case "수비(우)":
                      positionNumber = 1;
                      break;
                    case "수비(좌)":
                      positionNumber = 2;
                      break;
                    case "공격수":
                      positionNumber = 3;
                      break;
                    case "세터":
                      positionNumber = 4;
                      break;
                  }
                }

                if (positionNumber > 0) {
                  positionsData[team.id][member.player_id] = positionNumber;

                  // 플레이어 객체에도 포지션 정보 추가
                  const playerIndex = membersData[team.id].findIndex(
                    (p) => p.id === member.player_id
                  );
                  if (playerIndex !== -1) {
                    membersData[team.id][playerIndex].position = positionNumber;
                  }
                }
              }
            }
          }
        }
      }

      setTeamMembers(membersData);
      setTeamPositions(positionsData);

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

      // 8. 최종 승리팀 정보 가져오기
      const { data: finalWinnerData, error: finalWinnerError } = await supabase
        .from("game_winner")
        .select("*")
        .eq("game_id", gameId)
        .single();
      if (!finalWinnerError && finalWinnerData) {
        setFinalWinnerTeamId(finalWinnerData.game_team_id);
      } else {
        setFinalWinnerTeamId(null);
      }
    } catch (error) {
      console.error("게임 정보 조회 중 오류 발생:", error);
      Alert.alert("오류", "게임 정보를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [gameId, currentSetIndex]);

  // 앱이 포커스를 얻을 때 데이터를 자동으로 새로고침
  useAppFocus(fetchGameDetails);

  useEffect(() => {
    fetchGameDetails();

    // 이벤트 구독 설정
    const unsubscribe = eventEmitter.on(EventTypes.GAME_CHANGED, () => {
      fetchGameDetails();
    });

    // 컴포넌트 언마운트 시 구독 해제
    return () => {
      unsubscribe();
    };
  }, [fetchGameDetails]);

  // 서브 선택 가능 여부 확인
  useEffect(() => {
    // 세트가 시작되었고 서빙팀을 아직 선택하지 않았다면 서브 선택 모달 표시
    // 게임이 시작 상태(모든 팀의 점수가 0)일 때만 서브 선택 모달 표시
    if (
      gameSets.length > 0 &&
      !servingTeamId &&
      !isSetCompleted() &&
      !finalWinnerTeamId &&
      isGameStart()
    ) {
      setShowServeSelector(true);
    } else {
      setShowServeSelector(false);
    }
  }, [gameSets, servingTeamId, finalWinnerTeamId, scores]);

  // 게임이 시작 상태인지 확인 (모든 팀 점수가 0인 경우)
  const isGameStart = () => {
    // 각 팀의 점수가 모두 0인지 확인
    const allScoresZero = teams.every((team) => {
      const teamScore = scores[team.id] || 0;
      return teamScore === 0;
    });

    // 득점 로그가 없는지 확인
    const noScoreLogs = scoreLogs.length === 0;

    return allScoresZero && noScoreLogs;
  };

  // 서브 팀 선택 함수
  const selectServingTeam = (teamId: string) => {
    setServingTeamId(teamId);

    // 각 팀의 1번 포지션 선수부터 서브 시작
    const newServingPlayerIndex: Record<string, number> = {};
    teams.forEach((team) => {
      newServingPlayerIndex[team.id] = 1;
    });

    setServingPlayerIndex(newServingPlayerIndex);
    setShowServeSelector(false);
  };

  // 다음 서버 설정 함수
  const moveToNextServer = (teamId: string) => {
    const playersCount = teamMembers[teamId]?.length || 4;
    const currentIndex = servingPlayerIndex[teamId] || 1;

    // 다음 서버로 이동 (마지막 번호에서는 1번으로 순환)
    const nextIndex = currentIndex >= playersCount ? 1 : currentIndex + 1;

    setServingPlayerIndex((prev) => ({
      ...prev,
      [teamId]: nextIndex,
    }));
  };

  // 현재 서빙 중인 선수 정보 얻기
  const getCurrentServerInfo = () => {
    if (!servingTeamId) return null;

    const currentTeam = teams.find((t) => t.id === servingTeamId);
    if (!currentTeam) return null;

    const currentPlayerPosition = servingPlayerIndex[servingTeamId] || 1;
    const positionNames =
      teamMembers[servingTeamId]?.length === 3
        ? ["수비(솔로)", "공격수", "세터"]
        : ["수비(우)", "수비(좌)", "공격수", "세터"];

    // 해당 포지션을 가진 선수 찾기
    const currentPlayer = teamMembers[servingTeamId]?.find(
      (p) => p.position === currentPlayerPosition
    );

    return {
      teamName: currentTeam.team_name,
      playerName: currentPlayer?.name || "알 수 없음",
      positionName: positionNames[currentPlayerPosition - 1],
      positionNumber: currentPlayerPosition,
    };
  };

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
    if (finalWinnerTeamId) {
      Alert.alert(
        "게임 종료",
        "이미 최종 승리팀이 결정되어 더 이상 점수를 입력할 수 없습니다."
      );
      return;
    }

    try {
      // 서브 팀이 선택되지 않았다면 선택하도록 유도
      if (!servingTeamId) {
        setShowServeSelector(true);
        return;
      }

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

      // 서브 로직 업데이트 (요구사항에 맞게 수정)
      // 1. 서브는 점수 낸 팀이 함
      // 2. 서브 첫 시작은 1번이 함
      // 3. 점수를 내주면(상대팀이 점수를 얻으면) 다음 번호에게 서브 순서가 감
      // 4. 1->2->3->4 (3명일땐 1->2->3)으로 순환함

      // 이전 서브팀 기억
      const prevServingTeamId = servingTeamId;

      // 서브권을 득점한 팀으로 변경
      setServingTeamId(teamId);

      // 서브 첫 시작이거나 서브 팀이 바뀐 경우
      if (prevServingTeamId !== teamId) {
        // 처음 서브를 시작하는 팀은 1번 포지션부터 시작
        if (!servingPlayerIndex[teamId]) {
          setServingPlayerIndex((prev) => ({
            ...prev,
            [teamId]: 1, // 1번 포지션부터 시작
          }));
        }
      } else if (prevServingTeamId === teamId) {
        // 같은 팀이 연속으로 득점한 경우: 서브 위치 변경 없음
      }

      // 상대팀이 득점한 경우 원래 서브팀의 다음 서버로 변경
      if (prevServingTeamId && prevServingTeamId !== teamId) {
        const prevTeamPlayersCount =
          teamMembers[prevServingTeamId]?.length || 4;
        const currentIndex = servingPlayerIndex[prevServingTeamId] || 1;

        // 다음 서버로 이동 (마지막 번호에서는 1번으로 순환)
        const nextIndex =
          currentIndex >= prevTeamPlayersCount ? 1 : currentIndex + 1;

        setServingPlayerIndex((prev) => ({
          ...prev,
          [prevServingTeamId]: nextIndex, // 이전 서브팀의 다음 선수로 변경
        }));
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
                  setServingTeamId(null); // 새 세트 시작 시 서브팀 리셋
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

    const setsWon = data?.length || 0; // 방금 승리한 세트 포함하지 않음

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
    if (finalWinnerTeamId) {
      Alert.alert(
        "게임 종료",
        "이미 최종 승리팀이 결정되어 점수 변경이 불가능합니다."
      );
      return;
    }

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

      // 서브 상태 업데이트는 필요 없음 (무르기는 서브권 변경 없음)
    } catch (error) {
      console.error("무르기 중 오류 발생:", error);
      Alert.alert("오류", "점수 변경 중 오류가 발생했습니다.");
    }
  };

  // 세트 변경 함수
  const changeSet = (index: number) => {
    if (finalWinnerTeamId) {
      Alert.alert(
        "게임 종료",
        "이미 최종 승리팀이 결정되어 세트 변경이 불가능합니다."
      );
      return;
    }
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
    if (finalWinnerTeamId) return true;
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
    <View style={[styles.container, { backgroundColor: "#f8f9fa" }]}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View
          style={[
            styles.header,
            {
              backgroundColor: "white",
              borderBottomColor: "#dee2e6",
            },
          ]}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <FontAwesome name="arrow-left" size={18} color="#007bff" />
            <Text style={styles.backButtonText}>뒤로</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: "#212529" }]}>게임 진행</Text>
        </View>

        {/* 최종 승리팀 안내 */}
        {finalWinnerTeamId && (
          <View
            style={{
              backgroundColor: "#e6ffe6",
              padding: 12,
              margin: 16,
              borderRadius: 8,
              alignItems: "center",
              borderWidth: 1,
              borderColor: "#28a745",
            }}
          >
            <Text
              style={{
                color: "#28a745",
                fontWeight: "bold",
                fontSize: 16,
              }}
            >
              최종 승리팀:{" "}
              {teams.find((t) => t.id === finalWinnerTeamId)?.team_name || "팀"}
            </Text>
          </View>
        )}

        {/* 서브 선택기 */}
        {showServeSelector && (
          <View style={[styles.serveSelector, { backgroundColor: "white" }]}>
            <Text style={[styles.serveSelectorTitle, { color: "#212529" }]}>
              첫 서브를 넣을 팀을 선택해주세요
            </Text>
            <View style={styles.serveSelectorButtons}>
              {teams.map((team) => (
                <TouchableOpacity
                  key={team.id}
                  style={[
                    styles.serveSelectorButton,
                    { backgroundColor: team.team_color || "#007bff" },
                  ]}
                  onPress={() => selectServingTeam(team.id)}
                >
                  <Text style={styles.serveSelectorButtonText}>
                    {team.team_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* 서브 정보 표시 */}
        {servingTeamId && !finalWinnerTeamId && !isSetCompleted() && (
          <View style={[styles.serveInfo, { backgroundColor: "white" }]}>
            {getCurrentServerInfo() && (
              <>
                <Text style={[styles.serveInfoTitle, { color: "#212529" }]}>
                  현재 서브
                </Text>
                <View style={styles.serveInfoContent}>
                  <Text
                    style={[
                      styles.serveInfoTeam,
                      {
                        color:
                          teams.find((t) => t.id === servingTeamId)
                            ?.team_color || "#007bff",
                        backgroundColor: "#f1f3f5",
                      },
                    ]}
                  >
                    {getCurrentServerInfo()?.teamName}
                  </Text>
                  <Text style={[styles.serveInfoDetail, { color: "#212529" }]}>
                    {getCurrentServerInfo()?.positionNumber}번 포지션 (
                    {getCurrentServerInfo()?.positionName}) :{" "}
                    {getCurrentServerInfo()?.playerName}
                  </Text>
                </View>
              </>
            )}
          </View>
        )}

        {/* 게임 정보 */}
        <View
          style={[
            styles.gameInfoContainer,
            {
              backgroundColor: "white",
              shadowColor: "#000",
            },
          ]}
        >
          <View style={styles.gameInfoRow}>
            <Text style={[styles.gameInfoLabel, { color: "#495057" }]}>
              세트
            </Text>
            <View style={styles.setSelector}>
              {gameSets.map((set, index) => (
                <TouchableOpacity
                  key={set.id}
                  style={[
                    styles.setButton,
                    currentSetIndex === index && styles.activeSetButton,
                    {
                      backgroundColor:
                        currentSetIndex === index ? "#007bff" : "#e9ecef",
                    },
                  ]}
                  onPress={() => changeSet(index)}
                >
                  <Text
                    style={[
                      styles.setText,
                      {
                        color: currentSetIndex === index ? "white" : "#495057",
                      },
                    ]}
                  >
                    {index + 1}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.gameInfoRow}>
            <Text style={[styles.gameInfoLabel, { color: "#495057" }]}>
              방식
            </Text>
            <Text style={[styles.gameInfoValue, { color: "#212529" }]}>
              {game && game.wins_required
                ? `${game.num_of_sets}판 ${game.wins_required}선승제`
                : `${game?.num_of_sets || "-"}세트`}
              {game?.use_deuce ? ", 듀스 사용" : ""}
            </Text>
          </View>
          <View style={styles.gameInfoRow}>
            <Text style={[styles.gameInfoLabel, { color: "#495057" }]}>
              목표
            </Text>
            <Text style={[styles.gameInfoValue, { color: "#212529" }]}>
              {gameSets[currentSetIndex]?.target_score ||
                game?.winning_score ||
                "-"}
              점{isDeuceActive && <Text style={styles.deuceTag}> (듀스)</Text>}
            </Text>
          </View>
          {game?.penalty_details && (
            <View style={styles.gameInfoRow}>
              <Text style={[styles.gameInfoLabel, { color: "#495057" }]}>
                벌칙
              </Text>
              <Text style={[styles.gameInfoValue, { color: "#212529" }]}>
                {game.penalty_details}
              </Text>
            </View>
          )}
        </View>

        {/* 팀원 및 포지션 정보 */}
        <View
          style={[
            styles.teamInfoContainer,
            {
              backgroundColor: "white",
              shadowColor: "#000",
            },
          ]}
        >
          {teams.map((team) => (
            <View key={team.id} style={styles.teamInfo}>
              <Text
                style={[
                  styles.teamName,
                  {
                    color: team.team_color || "#007bff",
                    borderBottomColor: "#dee2e6",
                  },
                ]}
              >
                {team.team_name}
              </Text>
              <View style={styles.playersList}>
                {teamMembers[team.id]
                  ?.slice()
                  .sort((a, b) => {
                    // position이 null 또는 undefined인 경우 마지막으로 정렬
                    if (a.position === null || a.position === undefined)
                      return 1;
                    if (b.position === null || b.position === undefined)
                      return -1;
                    return (a.position || 999) - (b.position || 999);
                  })
                  .map((player) => (
                    <View
                      key={player.id}
                      style={[
                        styles.playerItem,
                        servingTeamId === team.id &&
                          player.position === servingPlayerIndex[team.id] &&
                          styles.servingPlayer,
                      ]}
                    >
                      <Text
                        style={[
                          styles.playerPosition,
                          { color: team.team_color || "#007bff" },
                        ]}
                      >
                        {player.position || "?"}
                      </Text>
                      <Text style={[styles.playerName, { color: "#212529" }]}>
                        {player.name}
                      </Text>
                      {servingTeamId === team.id &&
                        player.position === servingPlayerIndex[team.id] && (
                          <FontAwesome
                            name="arrow-circle-right"
                            size={16}
                            color="#FFA000"
                            style={styles.servingIcon}
                          />
                        )}
                    </View>
                  ))}
              </View>
            </View>
          ))}
        </View>

        {/* 점수판 */}
        <View
          style={[
            styles.scoreboardContainer,
            {
              backgroundColor: "white",
              shadowColor: "#000",
            },
          ]}
        >
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
              isFinalWinner={finalWinnerTeamId === team.id}
            />
          ))}

          {isSetCompleted() && (
            <TouchableOpacity
              style={[styles.confirmButton, { borderTopColor: "#dee2e6" }]}
              onPress={() => confirm(currentSetIndex)}
            >
              <Text style={[styles.confirmButtonText, { color: "#007bff" }]}>
                세트 결과 확정
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 득점 로그 */}
        <ScoreLogComponent
          logs={scoreLogs}
          teams={teams}
          gameSets={gameSets}
          currentSetId={gameSets[currentSetIndex]?.id}
          isRefreshing={refreshing}
          onRefresh={onRefresh}
          isDarkMode={false}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  confirmButton: {
    borderTopWidth: 1,
    borderTopColor: "#dee2e6",
    padding: 12,
    alignItems: "center",
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  serveSelector: {
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
  serveSelectorTitle: {
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 12,
  },
  serveSelectorButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    flexWrap: "wrap",
  },
  serveSelectorButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginVertical: 4,
    backgroundColor: "#007bff",
  },
  serveSelectorButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },
  serveInfo: {
    backgroundColor: "white",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  serveInfoTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 8,
  },
  serveInfoContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  serveInfoTeam: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 4,
    marginRight: 8,
    fontWeight: "bold",
  },
  serveInfoDetail: {
    fontSize: 14,
  },
  teamInfoContainer: {
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
  teamInfo: {
    marginBottom: 12,
  },
  teamName: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
  },
  playersList: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  playerItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12,
    marginBottom: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  servingPlayer: {
    backgroundColor: "rgba(255,215,0,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.5)",
  },
  playerPosition: {
    fontSize: 12,
    fontWeight: "bold",
    marginRight: 4,
  },
  playerName: {
    fontSize: 12,
  },
  servingIcon: {
    marginLeft: 4,
  },
});
