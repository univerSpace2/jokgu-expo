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
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { gameAPI } from "../../lib/api";
import { Game } from "../../types";

// 게임 방식 옵션 정의
const GAME_FORMATS = [
  { id: "single", name: "단판", sets: 1, winsRequired: 1 },
  { id: "best_of_3", name: "3판 2선승", sets: 3, winsRequired: 2 },
  { id: "best_of_5", name: "5판 3선승", sets: 5, winsRequired: 3 },
];

export default function EditGameScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [game, setGame] = useState<Game | null>(null);
  const [numOfSets, setNumOfSets] = useState<string>("3");
  const [winsRequired, setWinsRequired] = useState<string>("2");
  const [selectedFormat, setSelectedFormat] = useState(GAME_FORMATS[1]); // 기본값: 3판 2선승
  const [winningScore, setWinningScore] = useState<string>("21");
  const [useDeuce, setUseDeuce] = useState<boolean>(true);
  const [penaltyDetails, setPenaltyDetails] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  // 게임 정보 가져오기
  useEffect(() => {
    const fetchGame = async () => {
      if (!id) {
        Alert.alert("오류", "게임 ID가 올바르지 않습니다.");
        router.back();
        return;
      }

      try {
        setLoading(true);
        const data = await gameAPI.getById(id);

        if (!data) {
          Alert.alert("오류", "게임 정보를 찾을 수 없습니다.");
          router.back();
          return;
        }

        setGame(data);
        // 폼 초기화
        setNumOfSets(data.num_of_sets.toString());
        setWinningScore(data.winning_score.toString());
        setUseDeuce(data.use_deuce || false);
        setPenaltyDetails(data.penalty_details || "");
        setWinsRequired(data.wins_required?.toString() || "1");

        // 게임 포맷 설정
        const format = GAME_FORMATS.find(
          (f) =>
            f.sets === data.num_of_sets &&
            f.winsRequired === (data.wins_required || 1)
        );
        if (format) {
          setSelectedFormat(format);
        }
      } catch (error) {
        console.error("게임 정보 조회 중 오류 발생:", error);
        Alert.alert("오류", "게임 정보를 불러오는 중 오류가 발생했습니다.");
        router.back();
      } finally {
        setLoading(false);
      }
    };

    fetchGame();
  }, [id, router]);

  // 게임 방식 변경 핸들러
  const handleFormatChange = (format: (typeof GAME_FORMATS)[0]) => {
    setSelectedFormat(format);
    setNumOfSets(format.sets.toString());
    setWinsRequired(format.winsRequired.toString());
  };

  // 게임 수정
  const handleSubmit = async () => {
    if (!id) {
      Alert.alert("오류", "게임 ID가 올바르지 않습니다.");
      return;
    }

    const numSets = parseInt(numOfSets, 10);
    const numWinsRequired = parseInt(winsRequired, 10);
    const score = parseInt(winningScore, 10);

    if (isNaN(numSets) || isNaN(score) || isNaN(numWinsRequired)) {
      Alert.alert(
        "오류",
        "세트 수, 승리 필요 세트 수, 승리 점수는 유효한 숫자여야 합니다."
      );
      return;
    }

    try {
      setSaving(true);

      await gameAPI.update(id, {
        num_of_sets: numSets,
        winning_score: score,
        use_deuce: useDeuce,
        penalty_details: penaltyDetails || undefined,
        wins_required: numWinsRequired,
      });

      Alert.alert("수정 완료", "게임 정보가 성공적으로 수정되었습니다.", [
        { text: "확인", onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error("게임 수정 중 오류 발생:", error);
      Alert.alert("오류", "게임 수정 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>불러오는 중...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <FontAwesome name="arrow-left" size={18} color="#007bff" />
          <Text style={styles.backButtonText}>뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.title}>게임 편집</Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={styles.form}>
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>게임 방식</Text>
          <View style={styles.formatSelector}>
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

          <View style={styles.formRow}>
            <Text style={styles.label}>세트 수</Text>
            <TextInput
              style={styles.input}
              value={numOfSets}
              onChangeText={setNumOfSets}
              keyboardType="number-pad"
              editable={false}
            />
          </View>

          <View style={styles.formRow}>
            <Text style={styles.label}>필요 승리 세트 수</Text>
            <TextInput
              style={styles.input}
              value={winsRequired}
              onChangeText={setWinsRequired}
              keyboardType="number-pad"
              editable={false}
            />
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>승리 조건</Text>
          <View style={styles.formRow}>
            <Text style={styles.label}>승리 점수</Text>
            <TextInput
              style={styles.input}
              value={winningScore}
              onChangeText={setWinningScore}
              keyboardType="number-pad"
            />
          </View>

          <View style={styles.formRow}>
            <Text style={styles.label}>듀스 적용</Text>
            <Switch
              value={useDeuce}
              onValueChange={setUseDeuce}
              trackColor={{ false: "#767577", true: "#81b0ff" }}
              thumbColor={useDeuce ? "#1976D2" : "#f4f3f4"}
            />
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>기타 설정</Text>
          <View style={styles.formGroup}>
            <Text style={styles.label}>벌칙 내용 (선택사항)</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              value={penaltyDetails}
              onChangeText={setPenaltyDetails}
              placeholder="벌칙 내용을 입력하세요 (내기, 회비, 맞기 등)"
              multiline
              numberOfLines={4}
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, saving && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={saving}
        >
          <Text style={styles.submitButtonText}>
            {saving ? "저장 중..." : "저장하기"}
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
  selectedFormatOption: {
    borderColor: "#007bff",
    backgroundColor: "#e6f2ff",
  },
  formatText: {
    color: "#495057",
  },
  selectedFormatText: {
    color: "#007bff",
    fontWeight: "bold",
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
});
