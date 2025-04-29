import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  Modal,
  FlatList,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { meetingAPI, groundAPI } from "../../lib/api";
import { Meeting, JokguGround } from "../../types";
import CustomDatePicker from "../../components/CustomDatePicker";
import CustomTimePicker from "../../components/CustomTimePicker";

export default function EditMeetingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [date, setDate] = useState<string>("");
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");
  const [location, setLocation] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  // 족구장 관련 상태
  const [grounds, setGrounds] = useState<JokguGround[]>([]);
  const [showGroundModal, setShowGroundModal] = useState(false);
  const [directInput, setDirectInput] = useState(false);

  // 모임 정보 가져오기
  useEffect(() => {
    const fetchMeeting = async () => {
      if (!id) {
        Alert.alert("오류", "모임 ID가 올바르지 않습니다.");
        router.back();
        return;
      }

      try {
        setLoading(true);
        const data = await meetingAPI.getById(id);

        if (!data) {
          Alert.alert("오류", "모임 정보를 찾을 수 없습니다.");
          router.back();
          return;
        }

        setMeeting(data);
        // 폼 초기화
        setDate(data.meeting_date);
        setStartTime(data.start_time);
        setEndTime(data.end_time || "");
        setLocation(data.location || "");

        // 족구장 목록 가져오기
        fetchGrounds();
      } catch (error) {
        console.error("모임 정보 조회 중 오류 발생:", error);
        Alert.alert("오류", "모임 정보를 불러오는 중 오류가 발생했습니다.");
        router.back();
      } finally {
        setLoading(false);
      }
    };

    fetchMeeting();
  }, [id, router]);

  // 족구장 목록 가져오기
  const fetchGrounds = async () => {
    try {
      const data = await groundAPI.getAll();
      setGrounds(data || []);
    } catch (error) {
      console.error("족구장 목록을 불러오는 중 오류 발생:", error);
    }
  };

  // 모임 수정
  const handleSubmit = async () => {
    if (!id || !date || !startTime) {
      Alert.alert("오류", "날짜와 시작 시간은 필수 입력 항목입니다.");
      return;
    }

    try {
      setSaving(true);

      await meetingAPI.update(id, {
        meeting_date: date,
        start_time: startTime,
        end_time: endTime || undefined,
        location: location || undefined,
      });

      Alert.alert("수정 완료", "모임 정보가 성공적으로 수정되었습니다.", [
        { text: "확인", onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error("모임 수정 중 오류 발생:", error);
      Alert.alert("오류", "모임 수정 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  // 족구장 선택 모달
  const renderGroundModal = () => {
    return (
      <Modal
        visible={showGroundModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowGroundModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>족구장 선택</Text>
              <TouchableOpacity onPress={() => setShowGroundModal(false)}>
                <FontAwesome name="times" size={20} color="#6c757d" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.directInputButton}
              onPress={() => {
                setDirectInput(true);
                setShowGroundModal(false);
              }}
            >
              <Text style={styles.directInputText}>직접 입력하기</Text>
            </TouchableOpacity>

            <FlatList
              data={grounds}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.groundItem}
                  onPress={() => {
                    setLocation(item.name);
                    setShowGroundModal(false);
                    setDirectInput(false);
                  }}
                >
                  <Text style={styles.groundName}>{item.name}</Text>
                  <Text style={styles.groundLocation}>{item.location}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>등록된 족구장이 없습니다.</Text>
              }
            />
          </View>
        </View>
      </Modal>
    );
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
        <Text style={styles.title}>모임 편집</Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={styles.form}>
        <View style={styles.formGroup}>
          <Text style={styles.label}>날짜 * (YYYY-MM-DD)</Text>
          <CustomDatePicker value={date} onChange={setDate} />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>시작 시간 * (HH:MM)</Text>
          <CustomTimePicker value={startTime} onChange={setStartTime} />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>종료 시간 (선택사항)</Text>
          <CustomTimePicker value={endTime} onChange={setEndTime} />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>장소 (선택사항)</Text>
          {!directInput && (
            <TouchableOpacity
              style={styles.locationSelector}
              onPress={() => setShowGroundModal(true)}
            >
              <Text
                style={
                  location ? styles.locationText : styles.locationPlaceholder
                }
              >
                {location || "족구장을 선택하세요"}
              </Text>
              <FontAwesome name="chevron-down" size={14} color="#6c757d" />
            </TouchableOpacity>
          )}

          {directInput && (
            <View>
              <TextInput
                style={styles.input}
                value={location}
                onChangeText={setLocation}
                placeholder="장소를 직접 입력하세요"
              />
              <TouchableOpacity
                style={styles.selectFromListButton}
                onPress={() => {
                  setDirectInput(false);
                  setShowGroundModal(true);
                }}
              >
                <Text style={styles.selectFromListText}>목록에서 선택하기</Text>
              </TouchableOpacity>
            </View>
          )}
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

      {renderGroundModal()}
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
    backgroundColor: "white",
    padding: 16,
    margin: 16,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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
    backgroundColor: "#fff",
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 8,
    width: "90%",
    maxHeight: "80%",
    padding: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#dee2e6",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  groundItem: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f3f5",
  },
  groundName: {
    fontSize: 16,
    fontWeight: "500",
  },
  groundLocation: {
    fontSize: 14,
    color: "#6c757d",
    marginTop: 2,
  },
  emptyText: {
    textAlign: "center",
    paddingVertical: 16,
    color: "#6c757d",
  },
  locationSelector: {
    borderWidth: 1,
    borderColor: "#ced4da",
    borderRadius: 4,
    padding: 12,
    backgroundColor: "#fff",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  locationText: {
    fontSize: 16,
    color: "#212529",
  },
  locationPlaceholder: {
    fontSize: 16,
    color: "#6c757d",
  },
  directInputButton: {
    backgroundColor: "#f8f9fa",
    padding: 10,
    borderRadius: 4,
    alignItems: "center",
    marginBottom: 12,
  },
  directInputText: {
    color: "#007bff",
  },
  selectFromListButton: {
    padding: 8,
    alignItems: "flex-end",
    marginTop: 4,
  },
  selectFromListText: {
    color: "#007bff",
    fontSize: 14,
  },
});
