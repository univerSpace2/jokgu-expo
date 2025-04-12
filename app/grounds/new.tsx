import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Switch,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";

export default function NewGroundScreen() {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [reservationRequired, setReservationRequired] = useState(false);
  const [reservationMethod, setReservationMethod] = useState("");
  const [priceInfo, setPriceInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit() {
    if (!name.trim() || !location.trim()) {
      Alert.alert("오류", "이름과 위치는 필수 입력 항목입니다.");
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("jokgu_ground")
        .insert([
          {
            name: name.trim(),
            location: location.trim(),
            reservation_required: reservationRequired,
            reservation_method: reservationMethod.trim() || null,
            price_info: priceInfo.trim() || null,
          },
        ])
        .select();

      if (error) {
        Alert.alert("등록 실패", "족구장 등록 중 오류가 발생했습니다.");
        console.error("족구장 등록 오류:", error);
        return;
      }

      Alert.alert("등록 완료", "족구장이 성공적으로 등록되었습니다.", [
        { text: "확인", onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error("족구장 등록 중 오류 발생:", error);
      Alert.alert("오류", "족구장 등록 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>족구장 추가</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.formGroup}>
          <Text style={styles.label}>이름 *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="족구장 이름을 입력하세요"
            autoFocus
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>위치 *</Text>
          <TextInput
            style={styles.input}
            value={location}
            onChangeText={setLocation}
            placeholder="주소를 입력하세요"
            multiline
          />
        </View>

        <View style={styles.formGroup}>
          <View style={styles.switchContainer}>
            <Text style={styles.label}>예약 필요 여부</Text>
            <Switch
              value={reservationRequired}
              onValueChange={setReservationRequired}
              trackColor={{ false: "#e9ecef", true: "#007bff" }}
            />
          </View>
        </View>

        {reservationRequired && (
          <View style={styles.formGroup}>
            <Text style={styles.label}>예약 방법</Text>
            <TextInput
              style={styles.input}
              value={reservationMethod}
              onChangeText={setReservationMethod}
              placeholder="예약 방법을 입력하세요"
              multiline
            />
          </View>
        )}

        <View style={styles.formGroup}>
          <Text style={styles.label}>가격 정보</Text>
          <TextInput
            style={styles.input}
            value={priceInfo}
            onChangeText={setPriceInfo}
            placeholder="이용 요금 정보를 입력하세요"
            multiline
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? "처리 중..." : "저장하기"}
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
  switchContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
