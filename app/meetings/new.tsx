import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";
import { Player, JokguGround } from "../../types";
import { groundAPI } from "../../lib/api";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import CustomDatePicker from "../../components/CustomDatePicker";
import CustomTimePicker from "../../components/CustomTimePicker";
import { useTheme, themeColor } from "react-native-rapi-ui";

export default function NewMeetingScreen() {
  // 날짜/시간 관련 상태
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const [location, setLocation] = useState("");
  const [locationId, setLocationId] = useState(""); // 선택된 족구장의 ID
  const [loading, setLoading] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [grounds, setGrounds] = useState<JokguGround[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const router = useRouter();
  const isDarkmode = false;

  useEffect(() => {
    fetchPlayers();
    fetchGrounds();
  }, []);

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

  async function fetchGrounds() {
    try {
      const data = await groundAPI.getAll();
      setGrounds(data || []);
    } catch (error) {
      console.error("족구장 목록을 불러오는 중 오류 발생:", error);
    }
  }

  function togglePlayerSelection(id: string) {
    setSelectedPlayers((prevSelected) => {
      if (prevSelected.includes(id)) {
        return prevSelected.filter((playerId) => playerId !== id);
      } else {
        return [...prevSelected, id];
      }
    });
  }

  function handleGroundSelection(id: string, name: string) {
    setLocationId(id);
    setLocation(name);
  }

  async function handleSubmit() {
    if (!date || !startTime) {
      Alert.alert("오류", "날짜와 시작 시간은 필수 입력 항목입니다.");
      return;
    }

    try {
      setLoading(true);

      // 모임 생성
      const { data: meetingData, error: meetingError } = await supabase
        .from("meeting")
        .insert([
          {
            meeting_date: date,
            start_time: startTime,
            end_time: endTime || null,
            location: location || null,
          },
        ])
        .select();

      if (meetingError || !meetingData) {
        Alert.alert("등록 실패", "모임 등록 중 오류가 발생했습니다.");
        console.error("모임 등록 오류:", meetingError);
        return;
      }

      const meetingId = meetingData[0].id;

      // 모임 참여자 등록
      if (selectedPlayers.length > 0) {
        const meetingMembers = selectedPlayers.map((playerId) => ({
          meeting_id: meetingId,
          player_id: playerId,
        }));

        const { error: memberError } = await supabase
          .from("meeting_member")
          .insert(meetingMembers);

        if (memberError) {
          console.error("모임 참여자 등록 오류:", memberError);
          // 에러가 있더라도 모임은 생성되었으므로 계속 진행
        }
      }

      Alert.alert("등록 완료", "모임이 성공적으로 등록되었습니다.", [
        { text: "확인", onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error("모임 등록 중 오류 발생:", error);
      Alert.alert("오류", "모임 등록 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView
      style={[
        styles.container,
        { backgroundColor: isDarkmode ? themeColor.dark100 : "#f8f9fa" },
      ]}
    >
      <View style={styles.header}>
        <Text
          style={[
            styles.title,
            { color: isDarkmode ? themeColor.white : "#212529" },
          ]}
        >
          새 모임 만들기
        </Text>
      </View>

      <View
        style={[
          styles.form,
          {
            backgroundColor: isDarkmode ? themeColor.dark : "white",
            shadowColor: isDarkmode ? "#000" : "#000",
            borderColor: isDarkmode ? themeColor.dark200 : undefined,
          },
        ]}
      >
        <View style={styles.formGroup}>
          <Text
            style={[
              styles.label,
              { color: isDarkmode ? themeColor.white : "#212529" },
            ]}
          >
            날짜 * (YYYY-MM-DD)
          </Text>
          <CustomDatePicker value={date} onChange={setDate} />
        </View>

        <View style={styles.formGroup}>
          <Text
            style={[
              styles.label,
              { color: isDarkmode ? themeColor.white : "#212529" },
            ]}
          >
            시작 시간 * (HH:MM)
          </Text>
          <CustomTimePicker value={startTime} onChange={setStartTime} />
        </View>

        <View style={styles.formGroup}>
          <Text
            style={[
              styles.label,
              { color: isDarkmode ? themeColor.white : "#212529" },
            ]}
          >
            종료 시간 (선택사항)
          </Text>
          <CustomTimePicker value={endTime} onChange={setEndTime} />
        </View>

        <View style={styles.formGroup}>
          <Text
            style={[
              styles.label,
              { color: isDarkmode ? themeColor.white : "#212529" },
            ]}
          >
            장소
          </Text>
          {location ? (
            <View
              style={[
                styles.selectedLocation,
                {
                  borderColor: isDarkmode ? themeColor.dark200 : "#ced4da",
                  backgroundColor: isDarkmode ? themeColor.dark200 : "white",
                },
              ]}
            >
              <Text
                style={[
                  styles.selectedLocationText,
                  { color: isDarkmode ? themeColor.white : "#212529" },
                ]}
              >
                {location}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setLocation("");
                  setLocationId("");
                }}
              >
                <Text style={styles.changeLocationText}>변경</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.groundsList}>
              {grounds.map((ground) => (
                <TouchableOpacity
                  key={ground.id}
                  style={[
                    styles.groundItem,
                    locationId === ground.id && styles.groundItemSelected,
                    {
                      backgroundColor: isDarkmode
                        ? locationId === ground.id
                          ? "#007bff"
                          : themeColor.dark200
                        : locationId === ground.id
                        ? "#007bff"
                        : "#f8f9fa",
                      borderColor: isDarkmode
                        ? locationId === ground.id
                          ? "#007bff"
                          : themeColor.dark200
                        : locationId === ground.id
                        ? "#007bff"
                        : "#ced4da",
                    },
                  ]}
                  onPress={() => handleGroundSelection(ground.id, ground.name)}
                >
                  <Text
                    style={[
                      styles.groundName,
                      locationId === ground.id && styles.groundNameSelected,
                      {
                        color:
                          locationId === ground.id
                            ? "white"
                            : isDarkmode
                            ? themeColor.white
                            : "#212529",
                      },
                    ]}
                  >
                    {ground.name}
                  </Text>
                </TouchableOpacity>
              ))}
              {grounds.length === 0 && (
                <Text
                  style={[
                    styles.noGroundsText,
                    { color: isDarkmode ? themeColor.gray400 : "#6c757d" },
                  ]}
                >
                  등록된 족구장이 없습니다.
                </Text>
              )}
            </View>
          )}
        </View>

        <View style={styles.formGroup}>
          <Text
            style={[
              styles.label,
              { color: isDarkmode ? themeColor.white : "#212529" },
            ]}
          >
            참여 플레이어 선택
          </Text>
          <View style={styles.playersList}>
            {players.map((player) => (
              <TouchableOpacity
                key={player.id}
                style={[
                  styles.playerItem,
                  selectedPlayers.includes(player.id) &&
                    styles.playerItemSelected,
                  {
                    backgroundColor: isDarkmode
                      ? selectedPlayers.includes(player.id)
                        ? "#007bff"
                        : themeColor.dark200
                      : selectedPlayers.includes(player.id)
                      ? "#007bff"
                      : "#f8f9fa",
                    borderColor: isDarkmode
                      ? selectedPlayers.includes(player.id)
                        ? "#007bff"
                        : themeColor.dark200
                      : selectedPlayers.includes(player.id)
                      ? "#007bff"
                      : "#ced4da",
                  },
                ]}
                onPress={() => togglePlayerSelection(player.id)}
              >
                <Text
                  style={[
                    styles.playerName,
                    selectedPlayers.includes(player.id) &&
                      styles.playerNameSelected,
                    {
                      color: selectedPlayers.includes(player.id)
                        ? "white"
                        : isDarkmode
                        ? themeColor.white
                        : "#212529",
                    },
                  ]}
                >
                  {player.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? "처리 중..." : "모임 만들기"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.back()}
          disabled={loading}
        >
          <Text
            style={[
              styles.cancelButtonText,
              { color: isDarkmode ? themeColor.gray400 : "#6c757d" },
            ]}
          >
            취소
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
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
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ced4da",
    borderRadius: 4,
    backgroundColor: "white",
  },
  input: {
    flex: 1,
    padding: 12,
    fontSize: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  groundsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
  },
  groundItem: {
    backgroundColor: "#f8f9fa",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    margin: 4,
    borderWidth: 1,
    borderColor: "#ced4da",
  },
  groundItemSelected: {
    backgroundColor: "#007bff",
    borderColor: "#007bff",
  },
  groundName: {
    color: "#212529",
  },
  groundNameSelected: {
    color: "white",
  },
  selectedLocation: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ced4da",
    borderRadius: 4,
    padding: 12,
  },
  selectedLocationText: {
    fontSize: 16,
  },
  changeLocationText: {
    color: "#007bff",
    fontWeight: "500",
  },
  noGroundsText: {
    color: "#6c757d",
    fontStyle: "italic",
    padding: 8,
  },
  playersList: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
  },
  playerItem: {
    backgroundColor: "#f8f9fa",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    margin: 4,
    borderWidth: 1,
    borderColor: "#ced4da",
  },
  playerItemSelected: {
    backgroundColor: "#007bff",
    borderColor: "#007bff",
  },
  playerName: {
    color: "#212529",
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
