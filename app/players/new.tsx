import { useEffect, useState } from "react";
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
import { playerAPI, bankAPI } from "../../lib/api";
import { Bank } from "../../types";
import { Picker } from "@react-native-picker/picker";

export default function NewPlayerScreen() {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bank, setBank] = useState("");
  const [loading, setLoading] = useState(false);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loadingBanks, setLoadingBanks] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchBanks();
  }, []);

  const fetchBanks = async () => {
    try {
      setLoadingBanks(true);
      const data = await bankAPI.getAll();
      setBanks(data);
    } catch (error) {
      console.error("은행 목록 조회 중 오류 발생:", error);
      Alert.alert("오류", "은행 목록을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoadingBanks(false);
    }
  };

  async function handleSubmit() {
    if (!name.trim()) {
      Alert.alert("오류", "이름을 입력해주세요.");
      return;
    }

    try {
      setLoading(true);

      await playerAPI.create({
        name: name.trim(),
        contact: contact.trim() ? contact.trim() : undefined,
        bank_account: bankAccount.trim() ? bankAccount.trim() : undefined,
        bank: bank ? bank : undefined,
      });

      Alert.alert("등록 완료", "플레이어가 성공적으로 등록되었습니다.", [
        { text: "확인", onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error("플레이어 등록 중 오류 발생:", error);
      Alert.alert("오류", "플레이어 등록 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>플레이어 추가</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.formGroup}>
          <Text style={styles.label}>이름 *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="이름을 입력하세요"
            autoFocus
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>연락처</Text>
          <TextInput
            style={styles.input}
            value={contact}
            onChangeText={setContact}
            placeholder="연락처를 입력하세요 (선택사항)"
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>은행</Text>
          <View style={[styles.input, styles.pickerContainer]}>
            <Picker
              selectedValue={bank}
              onValueChange={(itemValue: string) => setBank(itemValue)}
              style={styles.picker}
              enabled={!loadingBanks}
            >
              <Picker.Item label="은행을 선택하세요" value="" />
              {banks.map((item) => (
                <Picker.Item
                  key={item.bank}
                  label={item.bank}
                  value={item.bank}
                />
              ))}
            </Picker>
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>계좌번호</Text>
          <TextInput
            style={styles.input}
            value={bankAccount}
            onChangeText={setBankAccount}
            placeholder="계좌번호를 입력하세요 (선택사항)"
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
  pickerContainer: {
    padding: 0,
    overflow: "hidden",
  },
  picker: {
    marginTop: -8,
    marginBottom: -8,
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
