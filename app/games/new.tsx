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
  Modal,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { supabase } from "../../lib/supabase";
import { Meeting, Player, Position } from "../../types";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { positionAPI } from "../../lib/api";
import { useTheme, themeColor } from "react-native-rapi-ui";

// 게임 방식 옵션 정의
const GAME_FORMATS = [
  { id: "single", name: "단판", sets: 1, winsRequired: 1 },
  { id: "best_of_3", name: "3판 2선승", sets: 3, winsRequired: 2 },
  { id: "best_of_5", name: "5판 3선승", sets: 5, winsRequired: 3 },
];

export default function NewGameScreen() {
  const { meetingId: urlMeetingId } = useLocalSearchParams<{
    meetingId: string;
  }>();
  const [numOfSets, setNumOfSets] = useState("3");
  const [winsRequired, setWinsRequired] = useState("2"); // 필요 승리 세트 수
  const [selectedFormat, setSelectedFormat] = useState(GAME_FORMATS[1]); // 기본값: 3판 2선승
  const [winningScore, setWinningScore] = useState("21");
  const [useDeuce, setUseDeuce] = useState(true); // 듀스 사용 여부
  const [penaltyDetails, setPenaltyDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [meetingPlayers, setMeetingPlayers] = useState<Player[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [teamPositions, setTeamPositions] = useState<{
    [teamId: number]: { [playerId: string]: number };
  }>({});
  const [showPositionModal, setShowPositionModal] = useState(false);
  const [currentTeamIndex, setCurrentTeamIndex] = useState<number | null>(null);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 팀 관련 상태 - 항상 2팀으로 고정
  const [teams, setTeams] = useState<{ name: string; players: string[] }[]>([
    { name: "팀 1", players: [] },
    { name: "팀 2", players: [] },
  ]);

  // 다크모드 적용을 위한 Hook 추가
  const isDarkmode = false;

  // 단계 관리
  const [step, setStep] = useState(1);
  // 1: 팀 갯수 및 구성 설정
  // 2: 게임 횟수 설정 (n판m선승)
  // 3: 승리 점수 설정
  // 4: 벌칙 설정
  // 5: 확인 및 완료

  const router = useRouter();

  useEffect(() => {
    if (urlMeetingId) {
      fetchMeetingDetails(urlMeetingId);
    } else {
      fetchPlayers(); // 모임에 속하지 않은 경우 모든 플레이어 가져오기
    }

    // 포지션 데이터 가져오기
    fetchPositions();
  }, [urlMeetingId]);

  // 포지션 데이터 가져오기
  async function fetchPositions() {
    try {
      const positionData = await positionAPI.getAll();
      setPositions(positionData);
    } catch (error) {
      console.error("포지션 목록을 불러오는 중 오류 발생:", error);
    }
  }

  // 게임 방식 변경 핸들러
  const handleFormatChange = (format: (typeof GAME_FORMATS)[0]) => {
    setSelectedFormat(format);
    setNumOfSets(format.sets.toString());
    setWinsRequired(format.winsRequired.toString());
  };

  async function fetchMeetingDetails(id: string) {
    try {
      // 모임 정보 가져오기
      const { data: meetingData, error: meetingError } = await supabase
        .from("meeting")
        .select("*")
        .eq("id", id)
        .single();

      if (meetingError) {
        console.error("모임 정보를 불러오는 중 오류 발생:", meetingError);
        return;
      }

      setMeeting(meetingData);

      // 모임 참여자 가져오기
      const { data: memberData, error: memberError } = await supabase
        .from("meeting_member")
        .select(
          `
          player:player_id(id, name, contact)
        `
        )
        .eq("meeting_id", id);

      if (memberError) {
        console.error("모임 참여자를 불러오는 중 오류 발생:", memberError);
        return;
      }

      if (memberData) {
        const players = memberData.map((item: any) => item.player);
        setMeetingPlayers(players);
      }
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

  // 팀 이름 변경
  function updateTeamName(index: number, name: string) {
    setTeams((prevTeams) => {
      const newTeams = [...prevTeams];
      newTeams[index] = { ...newTeams[index], name };
      return newTeams;
    });
  }

  // 팀에 플레이어 추가/제거
  function togglePlayerInTeam(teamIndex: number, playerId: string) {
    setTeams((prevTeams) => {
      const newTeams = [...prevTeams];

      // 모든 팀에서 해당 플레이어 제거 (한 플레이어는 한 팀에만 속할 수 있음)
      newTeams.forEach((team, idx) => {
        if (idx !== teamIndex) {
          team.players = team.players.filter((id) => id !== playerId);
        }
      });

      // 현재 팀에 플레이어 추가 또는 제거
      if (newTeams[teamIndex].players.includes(playerId)) {
        newTeams[teamIndex].players = newTeams[teamIndex].players.filter(
          (id) => id !== playerId
        );

        // 팀 포지션 정보에서도 제거
        setTeamPositions((prev) => {
          const newPositions = { ...prev };
          if (newPositions[teamIndex] && newPositions[teamIndex][playerId]) {
            const { [playerId]: removed, ...rest } = newPositions[teamIndex];
            newPositions[teamIndex] = rest;
          }
          return newPositions;
        });
      } else {
        newTeams[teamIndex].players.push(playerId);
      }

      return newTeams;
    });
  }

  // 다음 단계로 이동
  function nextStep() {
    // 각 단계별 유효성 검사
    if (step === 1) {
      // 팀 구성 검증
      const emptyTeams = teams.filter((team) => team.players.length === 0);
      if (emptyTeams.length > 0) {
        Alert.alert("오류", "각 팀에 최소 한 명의 플레이어를 추가해야 합니다.");
        return;
      }

      // 팀원 수 검증 (3명 또는 4명)
      const invalidTeams = teams.filter(
        (team) => team.players.length !== 3 && team.players.length !== 4
      );

      if (invalidTeams.length > 0) {
        setErrorMessage("각 팀은 3명 또는 4명으로 구성되어야 합니다.");
        return;
      }

      // 모든 팀원의 포지션이 선택되었는지 확인
      let missingPositions = false;
      teams.forEach((team, teamIndex) => {
        team.players.forEach((playerId) => {
          if (
            !teamPositions[teamIndex] ||
            !teamPositions[teamIndex][playerId]
          ) {
            missingPositions = true;
          }
        });
      });

      if (missingPositions) {
        setErrorMessage("모든 팀원의 포지션을 지정해야 합니다.");
        return;
      }

      setErrorMessage(null);
    }

    if (step === 5) {
      // 마지막 단계에서 제출
      handleSubmit();
      return;
    }

    setStep((prevStep) => prevStep + 1);
  }

  // 이전 단계로 이동
  function prevStep() {
    if (step === 1) {
      router.back();
      return;
    }

    setStep((prevStep) => prevStep - 1);
  }

  async function handleSubmit() {
    // 유효성 검증
    if (!numOfSets || !winningScore || !winsRequired) {
      Alert.alert(
        "오류",
        "세트 수, 승리 점수, 필요 승리 세트 수는 필수 입력 항목입니다."
      );
      return;
    }

    try {
      setLoading(true);

      // 1. 게임 생성
      const gameResponse = await supabase
        .from("game")
        .insert({
          meeting_id: meeting?.id,
          num_of_sets: parseInt(numOfSets),
          winning_score: parseInt(winningScore),
          wins_required: parseInt(winsRequired),
          use_deuce: useDeuce,
          penalty_details: penaltyDetails || null,
        })
        .select()
        .single();

      if (gameResponse.error) throw gameResponse.error;
      const gameId = gameResponse.data.id;

      // 2. 각 팀 생성
      for (let i = 0; i < teams.length; i++) {
        const team = teams[i];
        const teamResponse = await supabase
          .from("game_team")
          .insert({
            game_id: gameId,
            team_name: team.name,
          })
          .select()
          .single();

        if (teamResponse.error) throw teamResponse.error;
        const teamId = teamResponse.data.id;

        // 3. 각 팀의 플레이어 등록
        for (const playerId of team.players) {
          const positionNumber =
            teamPositions[i] && teamPositions[i][playerId]
              ? teamPositions[i][playerId]
              : null;

          let positionId = null;

          if (positionNumber) {
            // 포지션 이름 결정
            let positionName = "";
            const isThreePlayer = team.players.length === 3;

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
            positionId = positionData?.id || null;
          }

          // 플레이어의 포지션 정보 기록
          const memberResponse = await supabase
            .from("game_team_member")
            .insert({
              game_team_id: teamId,
              player_id: playerId,
              f_position: positionId,
            });

          if (memberResponse.error) throw memberResponse.error;
        }
      }

      // 4. 각 세트 생성
      for (let i = 1; i <= parseInt(numOfSets); i++) {
        const setResponse = await supabase.from("game_set").insert({
          game_id: gameId,
          set_number: i,
          target_score: parseInt(winningScore),
        });

        if (setResponse.error) throw setResponse.error;
      }

      // 성공적으로 완료됨
      router.replace(`/games/${gameId}`);
    } catch (error: any) {
      Alert.alert("오류", `게임 생성 중 오류가 발생했습니다: ${error.message}`);
      console.error("게임 생성 중 오류:", error);
    } finally {
      setLoading(false);
    }
  }

  // 플레이어가 이미 어떤 팀에 속해있는지 확인
  function getPlayerTeamIndex(playerId: string): number {
    for (let i = 0; i < teams.length; i++) {
      if (teams[i].players.includes(playerId)) {
        return i;
      }
    }
    return -1;
  }

  // 단계별 UI 렌더링
  function renderStep() {
    switch (step) {
      case 1:
        return renderTeamSetup();
      case 2:
        return renderSetCountSetup();
      case 3:
        return renderWinningScoreSetup();
      case 4:
        return renderPenaltySetup();
      case 5:
        return renderConfirmation();
      default:
        return null;
    }
  }

  // 1단계: 팀 구성 설정
  function renderTeamSetup() {
    const availablePlayers = urlMeetingId ? meetingPlayers : players;

    return (
      <>
        <View style={styles.stepHeader}>
          <Text
            style={[
              styles.stepTitle,
              { color: isDarkmode ? themeColor.white : "#212529" },
            ]}
          >
            1. 팀 구성
          </Text>
        </View>

        {errorMessage && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {teams.map((team, teamIndex) => (
          <View
            key={teamIndex}
            style={[
              styles.teamSection,
              { backgroundColor: isDarkmode ? themeColor.dark200 : "#f8f9fa" },
            ]}
          >
            <View style={styles.teamHeader}>
              <TextInput
                style={[
                  styles.teamNameInput,
                  { color: isDarkmode ? themeColor.white : "#212529" },
                ]}
                value={team.name}
                onChangeText={(text) => updateTeamName(teamIndex, text)}
                placeholder={`팀 ${teamIndex + 1} 이름`}
                placeholderTextColor={isDarkmode ? "#6c757d" : "#adb5bd"}
              />
              <Text
                style={[
                  styles.teamPlayerCount,
                  { color: isDarkmode ? themeColor.white : "#6c757d" },
                  team.players.length !== 3 &&
                    team.players.length !== 4 &&
                    styles.invalidTeamCount,
                ]}
              >
                {team.players.length}명
                {team.players.length > 0 &&
                  team.players.length !== 3 &&
                  team.players.length !== 4 &&
                  " (3명 또는 4명 필요)"}
              </Text>
            </View>

            <ScrollView horizontal style={styles.teamPlayersList}>
              {availablePlayers.map((player) => {
                const isSelected = team.players.includes(player.id);
                const otherTeamIndex = getPlayerTeamIndex(player.id);
                const isInOtherTeam =
                  otherTeamIndex !== -1 && otherTeamIndex !== teamIndex;
                const hasPosition = teamPositions[teamIndex]?.[player.id];

                return (
                  <TouchableOpacity
                    key={player.id}
                    style={[
                      styles.playerItem,
                      {
                        backgroundColor: isDarkmode
                          ? themeColor.dark200
                          : "#ffffff",
                      },
                      isSelected && styles.playerItemSelected,
                      isInOtherTeam && styles.playerItemDisabled,
                      isSelected && !hasPosition && styles.playerNoPosition,
                    ]}
                    onPress={() => togglePlayerInTeam(teamIndex, player.id)}
                    disabled={isInOtherTeam}
                  >
                    <Text
                      style={[
                        styles.playerName,
                        {
                          color: isDarkmode
                            ? isSelected
                              ? "white"
                              : themeColor.white
                            : isSelected
                            ? "white"
                            : "#212529",
                        },
                        isInOtherTeam && styles.playerNameDisabled,
                      ]}
                    >
                      {player.name}
                    </Text>
                    {isSelected && (
                      <TouchableOpacity
                        style={styles.positionButton}
                        onPress={() => {
                          setCurrentTeamIndex(teamIndex);
                          setCurrentPlayerId(player.id);
                          setShowPositionModal(true);
                        }}
                      >
                        <Text style={styles.positionButtonText}>
                          {hasPosition
                            ? team.players.length === 3
                              ? ["수비(솔로)", "공격수", "세터"][
                                  hasPosition - 1
                                ]
                              : ["수비(우)", "수비(좌)", "공격수", "세터"][
                                  hasPosition - 1
                                ]
                            : "포지션"}
                        </Text>
                      </TouchableOpacity>
                    )}
                    {isInOtherTeam && (
                      <Text style={styles.playerTeamHint}>
                        {teams[otherTeamIndex].name}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
              {availablePlayers.length === 0 && (
                <Text
                  style={[
                    styles.noPlayersText,
                    { color: isDarkmode ? themeColor.gray : "#6c757d" },
                  ]}
                >
                  {urlMeetingId
                    ? "이 모임에 참여자가 없습니다."
                    : "등록된 플레이어가 없습니다."}
                </Text>
              )}
            </ScrollView>
          </View>
        ))}

        {/* 포지션 선택 모달 */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={showPositionModal}
          onRequestClose={() => setShowPositionModal(false)}
        >
          <View style={styles.centeredView}>
            <View
              style={[
                styles.modalView,
                { backgroundColor: isDarkmode ? themeColor.dark : "white" },
              ]}
            >
              <Text
                style={[
                  styles.modalTitle,
                  { color: isDarkmode ? themeColor.white : "#212529" },
                ]}
              >
                포지션 선택
              </Text>

              {currentTeamIndex !== null && teams[currentTeamIndex] && (
                <View style={styles.positionOptions}>
                  {teams[currentTeamIndex].players.length === 3 ? (
                    // 3인 팀 포지션 선택
                    <>
                      <TouchableOpacity
                        style={[
                          styles.positionOption,
                          {
                            backgroundColor: isDarkmode
                              ? themeColor.dark200
                              : "#f5f5f5",
                          },
                        ]}
                        onPress={() => {
                          if (currentTeamIndex !== null && currentPlayerId) {
                            setTeamPositions((prev) => ({
                              ...prev,
                              [currentTeamIndex]: {
                                ...(prev[currentTeamIndex] || {}),
                                [currentPlayerId]: 1,
                              },
                            }));
                            setShowPositionModal(false);
                          }
                        }}
                      >
                        <Text
                          style={[
                            styles.positionText,
                            {
                              color: isDarkmode ? themeColor.white : "#212529",
                            },
                          ]}
                        >
                          1: 수비(솔로)
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.positionOption,
                          {
                            backgroundColor: isDarkmode
                              ? themeColor.dark200
                              : "#f5f5f5",
                          },
                        ]}
                        onPress={() => {
                          if (currentTeamIndex !== null && currentPlayerId) {
                            setTeamPositions((prev) => ({
                              ...prev,
                              [currentTeamIndex]: {
                                ...(prev[currentTeamIndex] || {}),
                                [currentPlayerId]: 2,
                              },
                            }));
                            setShowPositionModal(false);
                          }
                        }}
                      >
                        <Text
                          style={[
                            styles.positionText,
                            {
                              color: isDarkmode ? themeColor.white : "#212529",
                            },
                          ]}
                        >
                          2: 공격수
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.positionOption,
                          {
                            backgroundColor: isDarkmode
                              ? themeColor.dark200
                              : "#f5f5f5",
                          },
                        ]}
                        onPress={() => {
                          if (currentTeamIndex !== null && currentPlayerId) {
                            setTeamPositions((prev) => ({
                              ...prev,
                              [currentTeamIndex]: {
                                ...(prev[currentTeamIndex] || {}),
                                [currentPlayerId]: 3,
                              },
                            }));
                            setShowPositionModal(false);
                          }
                        }}
                      >
                        <Text
                          style={[
                            styles.positionText,
                            {
                              color: isDarkmode ? themeColor.white : "#212529",
                            },
                          ]}
                        >
                          3: 세터
                        </Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    // 4인 팀 포지션 선택
                    <>
                      <TouchableOpacity
                        style={[
                          styles.positionOption,
                          {
                            backgroundColor: isDarkmode
                              ? themeColor.dark200
                              : "#f5f5f5",
                          },
                        ]}
                        onPress={() => {
                          if (currentTeamIndex !== null && currentPlayerId) {
                            setTeamPositions((prev) => ({
                              ...prev,
                              [currentTeamIndex]: {
                                ...(prev[currentTeamIndex] || {}),
                                [currentPlayerId]: 1,
                              },
                            }));
                            setShowPositionModal(false);
                          }
                        }}
                      >
                        <Text
                          style={[
                            styles.positionText,
                            {
                              color: isDarkmode ? themeColor.white : "#212529",
                            },
                          ]}
                        >
                          1: 수비(우)
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.positionOption,
                          {
                            backgroundColor: isDarkmode
                              ? themeColor.dark200
                              : "#f5f5f5",
                          },
                        ]}
                        onPress={() => {
                          if (currentTeamIndex !== null && currentPlayerId) {
                            setTeamPositions((prev) => ({
                              ...prev,
                              [currentTeamIndex]: {
                                ...(prev[currentTeamIndex] || {}),
                                [currentPlayerId]: 2,
                              },
                            }));
                            setShowPositionModal(false);
                          }
                        }}
                      >
                        <Text
                          style={[
                            styles.positionText,
                            {
                              color: isDarkmode ? themeColor.white : "#212529",
                            },
                          ]}
                        >
                          2: 수비(좌)
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.positionOption,
                          {
                            backgroundColor: isDarkmode
                              ? themeColor.dark200
                              : "#f5f5f5",
                          },
                        ]}
                        onPress={() => {
                          if (currentTeamIndex !== null && currentPlayerId) {
                            setTeamPositions((prev) => ({
                              ...prev,
                              [currentTeamIndex]: {
                                ...(prev[currentTeamIndex] || {}),
                                [currentPlayerId]: 3,
                              },
                            }));
                            setShowPositionModal(false);
                          }
                        }}
                      >
                        <Text
                          style={[
                            styles.positionText,
                            {
                              color: isDarkmode ? themeColor.white : "#212529",
                            },
                          ]}
                        >
                          3: 공격수
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.positionOption,
                          {
                            backgroundColor: isDarkmode
                              ? themeColor.dark200
                              : "#f5f5f5",
                          },
                        ]}
                        onPress={() => {
                          if (currentTeamIndex !== null && currentPlayerId) {
                            setTeamPositions((prev) => ({
                              ...prev,
                              [currentTeamIndex]: {
                                ...(prev[currentTeamIndex] || {}),
                                [currentPlayerId]: 4,
                              },
                            }));
                            setShowPositionModal(false);
                          }
                        }}
                      >
                        <Text
                          style={[
                            styles.positionText,
                            {
                              color: isDarkmode ? themeColor.white : "#212529",
                            },
                          ]}
                        >
                          4: 세터
                        </Text>
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
      </>
    );
  }

  // 2단계: 게임 횟수 설정 (n판m선승)
  function renderSetCountSetup() {
    return (
      <>
        <View style={styles.stepHeader}>
          <Text style={styles.stepTitle}>2. 게임 방식 설정</Text>
        </View>

        <View style={styles.formatSelector}>
          <Text style={styles.label}>게임 방식 선택</Text>
          <View style={styles.formatOptions}>
            {GAME_FORMATS.map((format) => (
              <TouchableOpacity
                key={format.id}
                style={[
                  styles.formatOption,
                  selectedFormat.id === format.id &&
                    styles.selectedFormatOption,
                ]}
                onPress={() => handleFormatChange(format)}
              >
                <Text
                  style={[
                    styles.formatText,
                    selectedFormat.id === format.id &&
                      styles.selectedFormatText,
                  ]}
                >
                  {format.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>세트 수</Text>
          <TextInput
            style={styles.input}
            value={numOfSets}
            onChangeText={setNumOfSets}
            placeholder="세트 수를 입력하세요 (예: 3)"
            keyboardType="number-pad"
            editable={false} // 직접 편집 불가 (포맷 선택으로만 변경)
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>필요 승리 세트 수</Text>
          <TextInput
            style={styles.input}
            value={winsRequired}
            onChangeText={setWinsRequired}
            placeholder="승리에 필요한 세트 수 (예: 2)"
            keyboardType="number-pad"
            editable={false} // 직접 편집 불가 (포맷 선택으로만 변경)
          />
          <Text style={styles.helperText}>
            게임 승리에 필요한 세트 수입니다. {selectedFormat.name}제로
            진행됩니다.
          </Text>
        </View>

        <View style={styles.previewCard}>
          <Text style={styles.previewTitle}>게임 방식 미리보기</Text>
          <Text style={styles.previewText}>
            총 {numOfSets}세트 중 {winsRequired}세트를 먼저 획득하는 팀이
            승리합니다.
          </Text>
        </View>
      </>
    );
  }

  // 3단계: 승리 점수 설정
  function renderWinningScoreSetup() {
    return (
      <>
        <View style={styles.stepHeader}>
          <Text style={styles.stepTitle}>3. 승리 점수 설정</Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>승리 점수</Text>
          <TextInput
            style={styles.input}
            value={winningScore}
            onChangeText={setWinningScore}
            placeholder="승리 점수를 입력하세요 (예: 21)"
            keyboardType="number-pad"
          />
          <Text style={styles.helperText}>
            각 세트에서 승리하기 위해 필요한 점수를 설정합니다.
          </Text>
        </View>

        <View style={styles.formGroup}>
          <View style={styles.switchContainer}>
            <Text style={styles.label}>듀스 사용</Text>
            <Switch
              value={useDeuce}
              onValueChange={setUseDeuce}
              trackColor={{ false: "#e9ecef", true: "#007bff" }}
            />
          </View>
          <Text style={styles.helperText}>
            두 팀 모두 승리 점수 -1점이 되면 듀스에 돌입합니다. 듀스 상태에서는
            2점 차이가 날 때까지 게임이 계속됩니다.
          </Text>
        </View>

        <View style={styles.previewCard}>
          <Text style={styles.previewTitle}>게임 방식 미리보기</Text>
          <Text style={styles.previewText}>
            각 세트 {winningScore}점 승리
            {useDeuce
              ? `, 듀스 사용 (${parseInt(winningScore) - 1}:${
                  parseInt(winningScore) - 1
                } 상황에서 듀스 적용)`
              : ", 듀스 없음"}
          </Text>
        </View>
      </>
    );
  }

  // 4단계: 벌칙 설정
  function renderPenaltySetup() {
    return (
      <>
        <View style={styles.stepHeader}>
          <Text style={styles.stepTitle}>4. 벌칙 설정</Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>벌칙 내용</Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            value={penaltyDetails}
            onChangeText={setPenaltyDetails}
            placeholder="벌칙 내용을 입력하세요 (내기, 회비, 맞기 등)"
            multiline
            numberOfLines={4}
          />
          <Text style={styles.helperText}>
            패배팀에게 적용할 벌칙을 설정합니다. (선택사항)
          </Text>
        </View>
      </>
    );
  }

  // 5단계: 확인 및 완료
  function renderConfirmation() {
    return (
      <>
        <View style={styles.stepHeader}>
          <Text style={styles.stepTitle}>5. 게임 정보 확인</Text>
        </View>

        <View style={styles.confirmationCard}>
          <Text style={styles.confirmationTitle}>게임 설정 정보</Text>

          <View style={styles.confirmationSection}>
            <Text style={styles.confirmationLabel}>팀 구성</Text>
            {teams.map((team, index) => (
              <Text key={index} style={styles.confirmationText}>
                {team.name}: {team.players.length}명
              </Text>
            ))}
          </View>

          <View style={styles.confirmationSection}>
            <Text style={styles.confirmationLabel}>게임 방식</Text>
            <Text style={styles.confirmationText}>
              {selectedFormat.name}제 (총 {numOfSets}세트 중 {winsRequired}세트
              선승)
            </Text>
            <Text style={styles.confirmationText}>
              각 세트 {winningScore}점 승리{useDeuce ? ", 듀스 사용" : ""}
            </Text>
          </View>

          {penaltyDetails.trim() && (
            <View style={styles.confirmationSection}>
              <Text style={styles.confirmationLabel}>벌칙</Text>
              <Text style={styles.confirmationText}>{penaltyDetails}</Text>
            </View>
          )}

          <Text style={styles.confirmationHint}>
            위 정보로 게임을 생성하시겠습니까?
          </Text>
        </View>
      </>
    );
  }

  return (
    <ScrollView
      style={[
        styles.container,
        { backgroundColor: isDarkmode ? themeColor.dark : "#f8f9fa" },
      ]}
    >
      <View
        style={[
          styles.header,
          { backgroundColor: isDarkmode ? themeColor.dark : "white" },
        ]}
      >
        <TouchableOpacity style={styles.backButton} onPress={prevStep}>
          <FontAwesome
            name="arrow-left"
            size={18}
            color={isDarkmode ? themeColor.primary : "#007bff"}
          />
          <Text
            style={[
              styles.backButtonText,
              { color: isDarkmode ? themeColor.primary : "#007bff" },
            ]}
          >
            {step === 1 ? "뒤로" : "이전"}
          </Text>
        </TouchableOpacity>
        <Text
          style={[
            styles.title,
            { color: isDarkmode ? themeColor.white : "#212529" },
          ]}
        >
          새 게임 만들기
        </Text>
      </View>

      <View
        style={[
          styles.form,
          { backgroundColor: isDarkmode ? themeColor.dark200 : "white" },
        ]}
      >
        {meeting && (
          <View
            style={[
              styles.meetingInfo,
              { backgroundColor: isDarkmode ? themeColor.dark200 : "#e9ecef" },
            ]}
          >
            <Text
              style={[
                styles.meetingName,
                { color: isDarkmode ? themeColor.white : "#212529" },
              ]}
            >
              모임: {new Date(meeting.meeting_date).toLocaleDateString("ko-KR")}
            </Text>
          </View>
        )}

        {/* 단계 진행 상태 표시 */}
        <View style={styles.stepIndicator}>
          {[1, 2, 3, 4, 5].map((s) => (
            <View
              key={s}
              style={[
                styles.stepDot,
                {
                  backgroundColor: isDarkmode ? themeColor.dark200 : "#dee2e6",
                },
                s === step && styles.activeStepDot,
                s < step && styles.completedStepDot,
              ]}
            />
          ))}
        </View>

        {/* 단계별 UI */}
        {renderStep()}

        {/* 단계 이동 버튼 */}
        <TouchableOpacity
          style={[styles.nextButton, loading && styles.disabledButton]}
          onPress={nextStep}
          disabled={loading}
        >
          <Text style={styles.nextButtonText}>
            {loading
              ? "처리 중..."
              : step === 5
              ? "게임 생성하기"
              : "다음 단계"}
          </Text>
        </TouchableOpacity>
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
  form: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 16,
    margin: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  meetingInfo: {
    backgroundColor: "#e9ecef",
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
  },
  meetingName: {
    fontSize: 14,
    fontWeight: "500",
  },
  stepIndicator: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 20,
    gap: 8,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#dee2e6",
  },
  activeStepDot: {
    backgroundColor: "#007bff",
    transform: [{ scale: 1.2 }],
  },
  completedStepDot: {
    backgroundColor: "#28a745",
  },
  stepHeader: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#dee2e6",
    paddingBottom: 8,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#212529",
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
  multilineInput: {
    height: 100,
    textAlignVertical: "top",
  },
  helperText: {
    marginTop: 4,
    fontSize: 12,
    color: "#6c757d",
  },
  nextButton: {
    backgroundColor: "#007bff",
    paddingVertical: 12,
    borderRadius: 4,
    alignItems: "center",
    marginTop: 16,
  },
  nextButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  disabledButton: {
    backgroundColor: "#6c757d",
  },
  teamCountContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  teamCountControls: {
    flexDirection: "row",
    alignItems: "center",
  },
  teamCountButton: {
    width: 36,
    height: 36,
    backgroundColor: "#e9ecef",
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  teamCountButtonText: {
    fontSize: 20,
    fontWeight: "bold",
  },
  teamCountText: {
    fontSize: 18,
    marginHorizontal: 16,
    fontWeight: "bold",
  },
  teamSection: {
    marginBottom: 20,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 12,
  },
  teamHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  teamNameInput: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  teamPlayerCount: {
    fontSize: 14,
    color: "#6c757d",
  },
  teamPlayersList: {
    flexDirection: "row",
  },
  playerItem: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#ced4da",
  },
  playerItemSelected: {
    backgroundColor: "#007bff",
    borderColor: "#007bff",
  },
  playerItemDisabled: {
    backgroundColor: "#f1f3f5",
    borderColor: "#dee2e6",
  },
  playerName: {
    fontSize: 14,
    color: "#212529",
  },
  playerNameSelected: {
    color: "white",
  },
  playerNameDisabled: {
    color: "#adb5bd",
  },
  playerTeamHint: {
    fontSize: 10,
    color: "#6c757d",
    marginTop: 2,
  },
  noPlayersText: {
    color: "#6c757d",
    fontStyle: "italic",
    padding: 8,
  },
  previewCard: {
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 16,
    marginTop: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#17a2b8",
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    color: "#212529",
  },
  previewText: {
    fontSize: 14,
    color: "#495057",
  },
  confirmationCard: {
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 16,
  },
  confirmationTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
    color: "#212529",
    textAlign: "center",
  },
  confirmationSection: {
    marginBottom: 16,
  },
  confirmationLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
    color: "#495057",
  },
  confirmationText: {
    fontSize: 14,
    color: "#212529",
    marginBottom: 2,
  },
  confirmationHint: {
    fontSize: 14,
    color: "#6c757d",
    marginTop: 8,
    textAlign: "center",
    fontStyle: "italic",
  },
  formatSelector: {
    marginBottom: 20,
  },
  formatOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
    gap: 10,
  },
  formatOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f1f3f5",
    borderWidth: 1,
    borderColor: "#dee2e6",
  },
  selectedFormatOption: {
    backgroundColor: "#007bff",
    borderColor: "#007bff",
  },
  formatText: {
    fontSize: 14,
    fontWeight: "500",
  },
  selectedFormatText: {
    color: "white",
  },
  switchContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
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
  playerNoPosition: {
    borderColor: "#FFC107",
    borderWidth: 2,
  },
  positionButton: {
    marginTop: 5,
    backgroundColor: "#E0E0E0",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  positionButtonText: {
    fontSize: 12,
    color: "#424242",
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
  positionText: {
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
});
