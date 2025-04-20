import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  FlatList,
} from "react-native";

interface CustomDatePickerProps {
  value: string;
  onChange: (date: string) => void;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

export default function CustomDatePicker({
  value,
  onChange,
}: CustomDatePickerProps) {
  const [visible, setVisible] = useState(false);
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const days = Array.from(
    { length: getDaysInMonth(year, month) },
    (_, i) => i + 1
  );

  const handlePrevMonth = () => {
    if (month === 1) {
      setYear((y) => y - 1);
      setMonth(12);
    } else {
      setMonth((m) => m - 1);
    }
  };
  const handleNextMonth = () => {
    if (month === 12) {
      setYear((y) => y + 1);
      setMonth(1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  return (
    <View>
      <TouchableOpacity style={styles.input} onPress={() => setVisible(true)}>
        <Text>{value || "날짜 선택"}</Text>
      </TouchableOpacity>
      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <View style={styles.headerRow}>
              <TouchableOpacity
                onPress={handlePrevMonth}
                style={styles.monthBtn}
              >
                <Text style={styles.monthBtnText}>{"<"}</Text>
              </TouchableOpacity>
              <Text style={styles.title}>
                {year}년 {month}월
              </Text>
              <TouchableOpacity
                onPress={handleNextMonth}
                style={styles.monthBtn}
              >
                <Text style={styles.monthBtnText}>{">"}</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={days}
              numColumns={7}
              keyExtractor={(item) => item.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.day}
                  onPress={() => {
                    const dateStr = `${year}-${String(month).padStart(
                      2,
                      "0"
                    )}-${String(item).padStart(2, "0")}`;
                    onChange(dateStr);
                    setVisible(false);
                  }}
                >
                  <Text>{item}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity onPress={() => setVisible(false)}>
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
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  monthBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  monthBtnText: {
    fontSize: 20,
    color: "#007bff",
    fontWeight: "bold",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 0,
    textAlign: "center",
  },
  day: {
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
    margin: 2,
    borderRadius: 14,
    backgroundColor: "#f0f0f0",
  },
  cancel: { color: "#007bff", marginTop: 16, textAlign: "center" },
});
