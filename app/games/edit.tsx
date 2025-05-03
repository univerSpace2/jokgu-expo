import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  Switch,
  ActivityIndicator,
  Modal,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { gameAPI, playerAPI, positionAPI } from "../../lib/api";
import { Game, GameTeam, Player, Position } from "../../types";
import { useTheme, themeColor } from "react-native-rapi-ui";
import { supabase } from "../../lib/supabase";

// 게임 방식 옵션 정의
const GAME_FORMATS = [
  { id: "single", name: "단판", sets: 1, winsRequired: 1 },
  { id: "best_of_3", name: "3판 2선승", sets: 3, winsRequired: 2 },
  { id: "best_of_5", name: "5판 3선승", sets: 5, winsRequired: 3 },
];

export default function EditGameScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [game, setGame] = useState<Game | null>(null);
  const [teams, setTeams] = useState<GameTeam[]>([]);
  const [teamMembers, setTeamMembers] = useState<{ [key: string]: Player[] }>(
    {}
  );
  const [numOfSets, setNumOfSets] = useState<string>("3");
  const [winningScore, setWinningScore] = useState<string>("21");
  const [winsRequired, setWinsRequired] = useState<string>("2");
  const [useDeuce, setUseDeuce] = useState<boolean>(true);
  const [penaltyDetails, setPenaltyDetails] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [positions, setPositions] = useState<Position[]>([]);
  const [teamPositions, setTeamPositions] = useState<{
    [teamId: string]: { [playerId: string]: number };
  }>({});
  const [showPositionModal, setShowPositionModal] = useState(false);
  const [currentTeamId, setCurrentTeamId] = useState<string | null>(null);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();
  const isDarkmode = false;

  useEffect(() => {
    if (id) {
      fetchGameDetails();
      fetchPositions();
    }
  }, [id]);

  // 포지션 데이터 가져오기
  async function fetchPositions() {
    try {
      const positionData = await positionAPI.getAll();
      setPositions(positionData);
    } catch (error) {
      console.error("포지션 목록을 불러오는 중 오류 발생:", error);
    }
  }

  async function fetchGameDetails() {
    try {
      setLoading(true);
      // 1. 게임 정보 조회
      const gameData = await gameAPI.getById(id);
      if (!gameData) {
        Alert.alert("오류", "게임 정보를 찾을 수 없습니다.");
        return;
      }
      setGame(gameData);
      setNumOfSets(gameData.num_of_sets.toString());
      setWinningScore(gameData.winning_score.toString());
      setWinsRequired(gameData.wins_required?.toString() || "1");
      setUseDeuce(gameData.use_deuce ?? true);
      setPenaltyDetails(gameData.penalty_details || "");

      // 팀 정보 조회
      const teamsData = await gameAPI.getTeams(id);
      setTeams(teamsData);

      // 각 팀의 구성원 정보 조회
      const teamMembersData: { [key: string]: Player[] } = {};
      const teamPositionsData: {
        [teamId: string]: { [playerId: string]: number };
      } = {};

      for (const team of teamsData) {
        const { data: teamMemberRows, error: teamMemberError } = await supabase
          .from("game_team_member")
          .select(
            `
            player_id,
            f_position,
            player:player_id(*)
          `
          )
          .eq("game_team_id", team.id);

        if (teamMemberError) {
          console.error("팀 구성원 조회 오류:", teamMemberError);
          continue;
        }

        // 팀 구성원 정보 설정
        teamMembersData[team.id] = teamMemberRows.map((row: any) => row.player);

        // 포지션 정보 설정
        teamPositionsData[team.id] = {};
        for (const member of teamMemberRows) {
          if (member.f_position) {
            const { data: positionData } = await supabase
              .from("position")
              .select("*")
              .eq("id", member.f_position)
              .single();

            if (positionData) {
              // 포지션 이름을 번호로 변환
              const teamSize = teamMembersData[team.id].length;
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
                teamPositionsData[team.id][member.player_id] = positionNumber;
              }
            }
          }
        }
      }

      setTeamMembers(teamMembersData);
      setTeamPositions(teamPositionsData);
    } catch (error) {
      console.error("게임 정보 조회 오류:", error);
      Alert.alert("오류", "게임 정보를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  const handleSubmit = async () => {
    const numSets = parseInt(numOfSets);
    const score = parseInt(winningScore);
    const numWinsRequired = parseInt(winsRequired);

    if (isNaN(numSets) || numSets <= 0) {
      Alert.alert("입력 오류", "유효한 세트 수를 입력해주세요.");
      return;
    }

    if (isNaN(score) || score <= 0) {
      Alert.alert("입력 오류", "유효한 승리 점수를 입력해주세요.");
      return;
    }

    if (isNaN(numWinsRequired) || numWinsRequired <= 0) {
      Alert.alert("입력 오류", "유효한 필요 승리 세트 수를 입력해주세요.");
      return;
    }

    if (numWinsRequired > numSets) {
      Alert.alert(
        "입력 오류",
        "필요 승리 세트 수는 전체 세트 수보다 클 수 없습니다."
      );
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage(null);

      // 팀 구성원 수 검증 (3명 또는 4명)
      for (const teamId in teamMembers) {
        const members = teamMembers[teamId];
        if (members.length !== 3 && members.length !== 4) {
          setErrorMessage(`각 팀은 반드시 3명 또는 4명으로 구성되어야 합니다.`);
          setSubmitting(false);
          return;
        }

        // 모든 팀원의 포지션이 지정되었는지 확인
        const teamPositionsMap = teamPositions[teamId] || {};
        for (const player of members) {
          if (!teamPositionsMap[player.id]) {
            setErrorMessage(`모든 팀원의 포지션을 지정해야 합니다.`);
            setSubmitting(false);
            return;
          }
        }
      }

      // 게임 정보 업데이트
      const updatedGame = await gameAPI.update(id, {
        num_of_sets: numSets,
        winning_score: score,
        use_deuce: useDeuce,
        penalty_details: penaltyDetails || undefined,
        wins_required: numWinsRequired,
      });

      // 팀 정보 업데이트
      for (const team of teams) {
        const { error } = await supabase
          .from("game_team")
          .update({ team_name: team.team_name })
          .eq("id", team.id);

        if (error) {
          console.error("팀 정보 업데이트 오류:", error);
        }

        // 팀원 포지션 업데이트
        const teamPositionsMap = teamPositions[team.id] || {};
        for (const playerId in teamPositionsMap) {
          const positionNumber = teamPositionsMap[playerId];
          const isThreePlayer = teamMembers[team.id].length === 3;

          // 포지션 이름 결정
          let positionName = "";
          if (isThreePlayer) {
            switch (positionNumber) {
              case 1:
                positionName = "수비(솔로)";
                break;
              case 2:
                positionName = "공격수";
                break;
              case 3:
                positionName = "세터";
                break;
            }
          } else {
            switch (positionNumber) {
              case 1:
                positionName = "수비(우)";
                break;
              case 2:
                positionName = "수비(좌)";
                break;
              case 3:
                positionName = "공격수";
                break;
              case 4:
                positionName = "세터";
                break;
            }
          }

          // 로컬에 저장된 포지션 데이터에서 ID 찾기
          const positionData = positions.find(
            (p) => p.position_name === positionName
          );
          const positionId = positionData?.id || null;

          // 포지션 업데이트
          if (positionId) {
            const { error } = await supabase
              .from("game_team_member")
              .update({ f_position: positionId })
              .eq("game_team_id", team.id)
              .eq("player_id", playerId);

            if (error) {
              console.error("팀원 포지션 업데이트 오류:", error);
            }
          }
        }
      }

      Alert.alert("수정 완료", "게임 정보가 성공적으로 업데이트되었습니다.", [
        { text: "확인", onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error("게임 정보 업데이트 오류:", error);
      Alert.alert("오류", "게임 정보 업데이트 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  function handleTeamNameChange(teamId: string, name: string) {
    setTeams(
      teams.map((team) =>
        team.id === teamId ? { ...team, team_name: name } : team
      )
    );
  }

  function openPositionModal(teamId: string, playerId: string) {
    setCurrentTeamId(teamId);
    setCurrentPlayerId(playerId);
    setShowPositionModal(true);
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
        <Text style={styles.loadingText}>게임 정보를 불러오는 중...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[
        styles.container,
        { backgroundColor: isDarkmode ? themeColor.dark100 : "#f8f9fa" },
      ]}
    >
      <View
        style={[
          styles.header,
          {
            backgroundColor: isDarkmode ? themeColor.dark : "white",
            borderBottomColor: isDarkmode ? themeColor.dark200 : "#dee2e6",
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
        <Text
          style={[
            styles.title,
            { color: isDarkmode ? themeColor.white : "#212529" },
          ]}
        >
          게임 편집
        </Text>
        <View style={{ width: 50 }} />
      </View>

      <View
        style={[
          styles.form,
          {
            backgroundColor: isDarkmode ? themeColor.dark : "white",
            shadowColor: isDarkmode ? "#000" : "#000",
          },
        ]}
      >
        {errorMessage && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        <View style={styles.formSection}>
          <Text
            style={[
              styles.sectionTitle,
              { color: isDarkmode ? themeColor.white : "#212529" },
            ]}
          >
            게임 방식
          </Text>
          <View style={styles.formatSelector}>
            {GAME_FORMATS.map((format) => (
              <TouchableOpacity
                key={format.id}
                style={[
                  styles.formatOption,
                  {
                    backgroundColor: isDarkmode ? "#f8f9fa" : "#f8f9fa",
                  },
                ]}
                onPress={() => {
                  setNumOfSets(format.sets.toString());
                  setWinsRequired(format.winsRequired.toString());
                }}
              >
                <Text
                  style={[
                    styles.formatText,
                    {
                      color: isDarkmode ? themeColor.white : "#212529",
                    },
                  ]}
                >
                  {format.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.formRow}>
            <Text
              style={[
                styles.label,
                { color: isDarkmode ? themeColor.white : "#212529" },
              ]}
            >
              세트 수
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: isDarkmode ? themeColor.dark200 : "white",
                  borderColor: isDarkmode ? themeColor.dark200 : "#ced4da",
                  color: isDarkmode ? themeColor.white : "#212529",
                },
              ]}
              value={numOfSets}
              onChangeText={setNumOfSets}
              keyboardType="number-pad"
              editable={false}
            />
          </View>

          <View style={styles.formRow}>
            <Text
              style={[
                styles.label,
                { color: isDarkmode ? themeColor.white : "#212529" },
              ]}
            >
              필요 승리 세트 수
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: isDarkmode ? themeColor.dark200 : "white",
                  borderColor: isDarkmode ? themeColor.dark200 : "#ced4da",
                  color: isDarkmode ? themeColor.white : "#212529",
                },
              ]}
              value={winsRequired}
              onChangeText={setWinsRequired}
              keyboardType="number-pad"
              editable={false}
            />
          </View>
        </View>

        <View style={styles.formSection}>
          <Text
            style={[
              styles.sectionTitle,
              { color: isDarkmode ? themeColor.white : "#212529" },
            ]}
          >
            승리 조건
          </Text>
          <View style={styles.formRow}>
            <Text
              style={[
                styles.label,
                { color: isDarkmode ? themeColor.white : "#212529" },
              ]}
            >
              승리 점수
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: isDarkmode ? themeColor.dark200 : "white",
                  borderColor: isDarkmode ? themeColor.dark200 : "#ced4da",
                  color: isDarkmode ? themeColor.white : "#212529",
                },
              ]}
              value={winningScore}
              onChangeText={setWinningScore}
              keyboardType="number-pad"
            />
          </View>

          <View style={styles.formRow}>
            <Text
              style={[
                styles.label,
                { color: isDarkmode ? themeColor.white : "#212529" },
              ]}
            >
              듀스 적용
            </Text>
            <Switch
              value={useDeuce}
              onValueChange={setUseDeuce}
              trackColor={{ false: "#767577", true: "#81b0ff" }}
              thumbColor={useDeuce ? "#1976D2" : "#f4f3f4"}
            />
          </View>
        </View>

        <View style={styles.formSection}>
          <Text
            style={[
              styles.sectionTitle,
              { color: isDarkmode ? themeColor.white : "#212529" },
            ]}
          >
            기타 설정
          </Text>
          <View style={styles.formGroup}>
            <Text
              style={[
                styles.label,
                { color: isDarkmode ? themeColor.white : "#212529" },
              ]}
            >
              벌칙 내용 (선택사항)
            </Text>
            <TextInput
              style={[
                styles.input,
                styles.multilineInput,
                {
                  backgroundColor: isDarkmode ? themeColor.dark200 : "white",
                  borderColor: isDarkmode ? themeColor.dark200 : "#ced4da",
                  color: isDarkmode ? themeColor.white : "#212529",
                },
              ]}
              value={penaltyDetails}
              onChangeText={setPenaltyDetails}
              placeholder="벌칙 내용을 입력하세요 (내기, 회비, 맞기 등)"
              placeholderTextColor={isDarkmode ? themeColor.gray400 : "#6c757d"}
              multiline
              numberOfLines={4}
            />
          </View>
        </View>

        <View style={styles.formSection}>
          <Text
            style={[
              styles.sectionTitle,
              { color: isDarkmode ? themeColor.white : "#212529" },
            ]}
          >
            팀 정보
          </Text>
          {teams.map((team) => (
            <View key={team.id} style={styles.teamCard}>
              <View style={styles.teamHeader}>
                <Text style={styles.teamLabel}>팀 이름</Text>
                <TextInput
                  style={styles.teamNameInput}
                  value={team.team_name || ""}
                  onChangeText={(text) => handleTeamNameChange(team.id, text)}
                  placeholder="팀 이름"
                />
              </View>

              <Text
                style={[
                  styles.teamMembersTitle,
                  teamMembers[team.id]?.length !== 3 &&
                    teamMembers[team.id]?.length !== 4 &&
                    styles.invalidTeamCount,
                ]}
              >
                팀원 ({teamMembers[team.id]?.length || 0}명)
                {teamMembers[team.id]?.length > 0 &&
                  teamMembers[team.id]?.length !== 3 &&
                  teamMembers[team.id]?.length !== 4 &&
                  " - 3명 또는 4명 필요"}
              </Text>

              <View style={styles.teamMembers}>
                {teamMembers[team.id]?.map((player) => {
                  const hasPosition = teamPositions[team.id]?.[player.id];
                  const positionText = hasPosition
                    ? teamMembers[team.id].length === 3
                      ? ["수비(솔로)", "공격수", "세터"][hasPosition - 1]
                      : ["수비(우)", "수비(좌)", "공격수", "세터"][
                          hasPosition - 1
                        ]
                    : "포지션 지정 필요";

                  return (
                    <View
                      key={player.id}
                      style={[
                        styles.memberItem,
                        !hasPosition && styles.memberNoPosition,
                      ]}
                    >
                      <Text style={styles.memberName}>{player.name}</Text>
                      <TouchableOpacity
                        style={styles.positionButton}
                        onPress={() => openPositionModal(team.id, player.id)}
                      >
                        <Text
                          style={[
                            styles.positionText,
                            !hasPosition && styles.positionRequired,
                          ]}
                        >
                          {positionText}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
                {(!teamMembers[team.id] ||
                  teamMembers[team.id].length === 0) && (
                  <Text style={styles.noMembersText}>팀원이 없습니다.</Text>
                )}
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <Text style={styles.submitButtonText}>
            {submitting ? "업데이트 중..." : "게임 정보 업데이트"}
          </Text>
        </TouchableOpacity>

        {/* 포지션 선택 모달 */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={showPositionModal}
          onRequestClose={() => setShowPositionModal(false)}
        >
          <View style={styles.centeredView}>
            <View style={styles.modalView}>
              <Text style={styles.modalTitle}>포지션 선택</Text>

              {currentTeamId && teamMembers[currentTeamId] && (
                <View style={styles.positionOptions}>
                  {teamMembers[currentTeamId].length === 3 ? (
                    // 3인 팀 포지션 선택
                    <>
                      <TouchableOpacity
                        style={styles.positionOption}
                        onPress={() => {
                          if (currentTeamId && currentPlayerId) {
                            setTeamPositions((prev) => ({
                              ...prev,
                              [currentTeamId]: {
                                ...(prev[currentTeamId] || {}),
                                [currentPlayerId]: 1,
                              },
                            }));
                            setShowPositionModal(false);
                          }
                        }}
                      >
                        <Text style={styles.positionOptionText}>
                          1: 수비(솔로)
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.positionOption}
                        onPress={() => {
                          if (currentTeamId && currentPlayerId) {
                            setTeamPositions((prev) => ({
                              ...prev,
                              [currentTeamId]: {
                                ...(prev[currentTeamId] || {}),
                                [currentPlayerId]: 2,
                              },
                            }));
                            setShowPositionModal(false);
                          }
                        }}
                      >
                        <Text style={styles.positionOptionText}>2: 공격수</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.positionOption}
                        onPress={() => {
                          if (currentTeamId && currentPlayerId) {
                            setTeamPositions((prev) => ({
                              ...prev,
                              [currentTeamId]: {
                                ...(prev[currentTeamId] || {}),
                                [currentPlayerId]: 3,
                              },
                            }));
                            setShowPositionModal(false);
                          }
                        }}
                      >
                        <Text style={styles.positionOptionText}>3: 세터</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    // 4인 팀 포지션 선택
                    <>
                      <TouchableOpacity
                        style={styles.positionOption}
                        onPress={() => {
                          if (currentTeamId && currentPlayerId) {
                            setTeamPositions((prev) => ({
                              ...prev,
                              [currentTeamId]: {
                                ...(prev[currentTeamId] || {}),
                                [currentPlayerId]: 1,
                              },
                            }));
                            setShowPositionModal(false);
                          }
                        }}
                      >
                        <Text style={styles.positionOptionText}>
                          1: 수비(우)
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.positionOption}
                        onPress={() => {
                          if (currentTeamId && currentPlayerId) {
                            setTeamPositions((prev) => ({
                              ...prev,
                              [currentTeamId]: {
                                ...(prev[currentTeamId] || {}),
                                [currentPlayerId]: 2,
                              },
                            }));
                            setShowPositionModal(false);
                          }
                        }}
                      >
                        <Text style={styles.positionOptionText}>
                          2: 수비(좌)
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.positionOption}
                        onPress={() => {
                          if (currentTeamId && currentPlayerId) {
                            setTeamPositions((prev) => ({
                              ...prev,
                              [currentTeamId]: {
                                ...(prev[currentTeamId] || {}),
                                [currentPlayerId]: 3,
                              },
                            }));
                            setShowPositionModal(false);
                          }
                        }}
                      >
                        <Text style={styles.positionOptionText}>3: 공격수</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.positionOption}
                        onPress={() => {
                          if (currentTeamId && currentPlayerId) {
                            setTeamPositions((prev) => ({
                              ...prev,
                              [currentTeamId]: {
                                ...(prev[currentTeamId] || {}),
                                [currentPlayerId]: 4,
                              },
                            }));
                            setShowPositionModal(false);
                          }
                        }}
                      >
                        <Text style={styles.positionOptionText}>4: 세터</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              )}

              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowPositionModal(false)}
              >
                <Text style={styles.closeButtonText}>닫기</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#dee2e6",
    backgroundColor: "white",
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
  title: {
    fontSize: 18,
    fontWeight: "bold",
  },
  form: {
    padding: 16,
  },
  formSection: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 16,
  },
  formRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    flex: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ced4da",
    borderRadius: 4,
    padding: 8,
    fontSize: 16,
    backgroundColor: "#fff",
    flex: 1,
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: "top",
    paddingTop: 12,
  },
  formatSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  formatOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "#ced4da",
    borderRadius: 4,
    backgroundColor: "#f8f9fa",
    marginHorizontal: 4,
    alignItems: "center",
  },
  formatText: {
    color: "#495057",
  },
  submitButton: {
    backgroundColor: "#007bff",
    padding: 15,
    borderRadius: 6,
    alignItems: "center",
    marginTop: 16,
  },
  disabledButton: {
    backgroundColor: "#6c757d",
  },
  submitButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  errorContainer: {
    backgroundColor: "#FFEBEE",
    padding: 10,
    borderRadius: 4,
    marginBottom: 15,
  },
  errorText: {
    color: "#B71C1C",
    fontSize: 14,
  },
  invalidTeamCount: {
    color: "#B71C1C",
  },
  memberNoPosition: {
    borderColor: "#FFC107",
    borderWidth: 2,
  },
  positionButton: {
    marginTop: 5,
    backgroundColor: "#E0E0E0",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  positionText: {
    fontSize: 12,
    color: "#424242",
  },
  positionRequired: {
    color: "#B71C1C",
  },
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalView: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
    width: "80%",
    maxHeight: "80%",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  positionOptions: {
    marginVertical: 10,
  },
  positionOption: {
    padding: 12,
    marginVertical: 5,
    backgroundColor: "#f5f5f5",
    borderRadius: 5,
  },
  positionOptionText: {
    fontSize: 16,
  },
  closeButton: {
    backgroundColor: "#E0E0E0",
    padding: 10,
    borderRadius: 5,
    alignItems: "center",
    marginTop: 10,
  },
  closeButtonText: {
    color: "#424242",
    fontWeight: "bold",
  },
  teamCard: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  teamHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  teamLabel: {
    fontSize: 16,
    fontWeight: "bold",
  },
  teamNameInput: {
    borderWidth: 1,
    borderColor: "#ced4da",
    borderRadius: 4,
    padding: 8,
    flex: 1,
  },
  teamMembersTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 16,
  },
  teamMembers: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  memberItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  memberName: {
    fontSize: 16,
  },
  noMembersText: {
    fontSize: 16,
    color: "#6c757d",
  },
  loadingText: {
    color: "#0066cc",
    fontSize: 16,
    marginTop: 10,
  },
});
