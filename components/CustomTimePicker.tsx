import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  FlatList,
} from "react-native";

interface CustomTimePickerProps {
  value: string;
  onChange: (time: string) => void;
}

export default function CustomTimePicker({
  value,
  onChange,
}: CustomTimePickerProps) {
  const [visible, setVisible] = useState(false);
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5); // 5분 단위
  const [selectedHour, setSelectedHour] = useState<number | null>(null);

  // value에서 현재 선택된 시/분 추출
  const selected = value.split(":");
  const selectedH = selected.length > 0 ? parseInt(selected[0], 10) : null;
  const selectedM = selected.length > 1 ? parseInt(selected[1], 10) : null;

  return (
    <View>
      <TouchableOpacity style={styles.input} onPress={() => setVisible(true)}>
        <Text>{value || "시간 선택"}</Text>
      </TouchableOpacity>
      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.title}>시간 선택</Text>
            <View style={{ flexDirection: "row", justifyContent: "center" }}>
              <FlatList
                data={hours}
                keyExtractor={(item) => item.toString()}
                style={{ maxHeight: 150 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.time,
                      (selectedHour === item ||
                        (selectedHour === null && selectedH === item)) &&
                        styles.timeSelected,
                    ]}
                    onPress={() => setSelectedHour(item)}
                  >
                    <Text
                      style={[
                        styles.timeText,
                        (selectedHour === item ||
                          (selectedHour === null && selectedH === item)) &&
                          styles.timeTextSelected,
                      ]}
                    >
                      {String(item).padStart(2, "0")}
                    </Text>
                  </TouchableOpacity>
                )}
              />
              <Text
                style={{
                  fontSize: 18,
                  marginHorizontal: 8,
                  alignSelf: "center",
                }}
              >
                :
              </Text>
              <FlatList
                data={minutes}
                keyExtractor={(item) => item.toString()}
                style={{ maxHeight: 150 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.time,
                      selectedHour !== null &&
                        value ===
                          `${String(selectedHour).padStart(2, "0")}:${String(
                            item
                          ).padStart(2, "0")}` &&
                        styles.timeSelected,
                      selectedHour === null &&
                        selectedH !== null &&
                        selectedM === item &&
                        styles.timeSelected,
                    ]}
                    onPress={() => {
                      if (selectedHour !== null) {
                        const timeStr = `${String(selectedHour).padStart(
                          2,
                          "0"
                        )}:${String(item).padStart(2, "0")}`;
                        onChange(timeStr);
                        setVisible(false);
                        setSelectedHour(null);
                      }
                    }}
                  >
                    <Text
                      style={[
                        styles.timeText,
                        selectedHour !== null &&
                          value ===
                            `${String(selectedHour).padStart(2, "0")}:${String(
                              item
                            ).padStart(2, "0")}` &&
                          styles.timeTextSelected,
                        selectedHour === null &&
                          selectedH !== null &&
                          selectedM === item &&
                          styles.timeTextSelected,
                      ]}
                    >
                      {String(item).padStart(2, "0")}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>
            <TouchableOpacity
              onPress={() => {
                setVisible(false);
                setSelectedHour(null);
              }}
            >
              <Text style={styles.cancel}>닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 4,
    padding: 12,
    backgroundColor: "#fff",
  },
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 20,
    width: 300,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
  },
  time: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    margin: 2,
  },
  timeSelected: {
    backgroundColor: "#007bff",
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "#0056b3",
  },
  timeText: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#222",
  },
  timeTextSelected: {
    color: "#fff",
  },
  cancel: { color: "#007bff", marginTop: 16, textAlign: "center" },
});
