import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";
import { Player } from "../../types";

export default function NewMeetingScreen() {
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const router = useRouter();

  useEffect(() => {
    fetchPlayers();
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

  function togglePlayerSelection(id: string) {
    setSelectedPlayers((prevSelected) => {
      if (prevSelected.includes(id)) {
        return prevSelected.filter((playerId) => playerId !== id);
      } else {
        return [...prevSelected, id];
      }
    });
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
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>새 모임 만들기</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.formGroup}>
          <Text style={styles.label}>날짜 *</Text>
          <TextInput
            style={styles.input}
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            keyboardType="numbers-and-punctuation"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>시작 시간 *</Text>
          <TextInput
            style={styles.input}
            value={startTime}
            onChangeText={setStartTime}
            placeholder="HH:MM"
            keyboardType="numbers-and-punctuation"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>종료 시간</Text>
          <TextInput
            style={styles.input}
            value={endTime}
            onChangeText={setEndTime}
            placeholder="HH:MM (선택사항)"
            keyboardType="numbers-and-punctuation"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>장소</Text>
          <TextInput
            style={styles.input}
            value={location}
            onChangeText={setLocation}
            placeholder="장소를 입력하세요 (선택사항)"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>참여 플레이어 선택</Text>
          <View style={styles.playersList}>
            {players.map((player) => (
              <TouchableOpacity
                key={player.id}
                style={[
                  styles.playerItem,
                  selectedPlayers.includes(player.id) &&
                    styles.playerItemSelected,
                ]}
                onPress={() => togglePlayerSelection(player.id)}
              >
                <Text
                  style={[
                    styles.playerName,
                    selectedPlayers.includes(player.id) &&
                      styles.playerNameSelected,
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
  playersList: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
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
