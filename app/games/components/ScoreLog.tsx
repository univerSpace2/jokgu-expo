import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { ScoreLog as ScoreLogType, GameTeam, GameSet } from "../../../types";
import { themeColor } from "react-native-rapi-ui";

interface ScoreLogProps {
  logs: ScoreLogType[];
  teams: GameTeam[];
  gameSets?: GameSet[];
  currentSetId?: string;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  isDarkMode?: boolean;
}

export default function ScoreLog({
  logs,
  teams,
  gameSets = [],
  currentSetId,
  isRefreshing = false,
  onRefresh = () => {},
  isDarkMode = false,
}: ScoreLogProps) {
  const [selectedSetId, setSelectedSetId] = useState<string | null>(
    currentSetId || null
  );
  const [filteredLogs, setFilteredLogs] = useState<ScoreLogType[]>(logs);

  // currentSetId prop이 변경되면 selectedSetId 업데이트
  useEffect(() => {
    if (currentSetId) {
      setSelectedSetId(currentSetId);
    }
  }, [currentSetId]);

  // 선택된 세트가 변경되면 로그 필터링
  useEffect(() => {
    if (selectedSetId) {
      // 선택된 세트에 해당하는 로그만 필터링 (game_set_id 사용)
      const filtered = logs.filter((log) => log.game_set_id === selectedSetId);
      setFilteredLogs(filtered);
    } else {
      // 전체 로그 표시
      setFilteredLogs(logs);
    }
  }, [selectedSetId, logs]);

  // 컴포넌트 마운트 시 첫 번째 세트 선택
  useEffect(() => {
    if (gameSets.length > 0 && !selectedSetId) {
      setSelectedSetId(gameSets[0].id);
    }
  }, [gameSets]);

  // 팀 이름과 색상 가져오기 함수
  const getTeam = (teamId: string) => {
    const team = teams.find((t) => t.id === teamId);
    return {
      name: team?.team_name || `팀 ${teamId.substring(0, 4)}`,
      color: team?.team_color || "#6c757d", // 기본 색상
    };
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDarkMode ? themeColor.dark : "white",
          shadowColor: isDarkMode ? "#000" : "#000",
        },
      ]}
    >
      <Text
        style={[
          styles.title,
          { color: isDarkMode ? themeColor.white : "#212529" },
        ]}
      >
        득점 기록
      </Text>

      {/* 세트 선택 탭 - 세트가 있을 때만 표시 */}
      {gameSets.length > 0 && (
        <View
          style={[
            styles.setTabs,
            { borderBottomColor: isDarkMode ? themeColor.dark200 : "#e9ecef" },
          ]}
        >
          <TouchableOpacity
            style={[styles.setTab, !selectedSetId && styles.selectedSetTab]}
            onPress={() => setSelectedSetId(null)}
          >
            <Text
              style={[
                styles.setTabText,
                { color: isDarkMode ? themeColor.gray400 : "#6c757d" },
                !selectedSetId && [
                  styles.selectedSetTabText,
                  { color: "#0085ff" }, // 선택된 탭 색상은 항상 밝게 유지
                ],
              ]}
            >
              전체
            </Text>
          </TouchableOpacity>

          {gameSets.map((set) => (
            <TouchableOpacity
              key={set.id}
              style={[
                styles.setTab,
                selectedSetId === set.id && styles.selectedSetTab,
              ]}
              onPress={() => setSelectedSetId(set.id)}
            >
              <Text
                style={[
                  styles.setTabText,
                  { color: isDarkMode ? themeColor.gray400 : "#6c757d" },
                  selectedSetId === set.id && [
                    styles.selectedSetTabText,
                    { color: "#0085ff" },
                  ],
                ]}
              >
                {set.set_number}세트
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <ScrollView
        style={styles.logsList}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      >
        {filteredLogs.map((log) => {
          // UTC 시간을 한국 시간(UTC+9)으로 변환
          const timestamp = new Date(log.event_timestamp);
          const koreaTime = new Date(timestamp.getTime() + 9 * 60 * 60 * 1000);

          // 팀 정보 가져오기
          const team = getTeam(log.game_team_id);

          return (
            <View
              key={log.id}
              style={[
                styles.logItem,
                {
                  borderBottomColor: isDarkMode
                    ? themeColor.dark200
                    : "#e9ecef",
                },
              ]}
            >
              <View
                style={[styles.teamIndicator, { backgroundColor: team.color }]}
              />
              <Text style={[styles.logTeam, { color: team.color }]}>
                {team.name}
              </Text>
              <Text
                style={[
                  styles.logDetail,
                  { color: isDarkMode ? themeColor.white : "#212529" },
                ]}
              >
                {log.event_details}
              </Text>
              <Text
                style={[
                  styles.logTime,
                  { color: isDarkMode ? themeColor.gray400 : "#6c757d" },
                ]}
              >
                {koreaTime.toLocaleTimeString("ko-KR", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </Text>
            </View>
          );
        })}

        {filteredLogs.length === 0 && (
          <Text
            style={[
              styles.emptyText,
              { color: isDarkMode ? themeColor.gray400 : "#6c757d" },
            ]}
          >
            아직 기록된 득점이 없습니다.
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    borderRadius: 8,
    padding: 16,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  setTabs: {
    flexDirection: "row",
    marginBottom: 10,
    borderBottomWidth: 1,
  },
  setTab: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 4,
  },
  selectedSetTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#0085ff",
  },
  setTabText: {
    fontSize: 14,
  },
  selectedSetTabText: {
    fontWeight: "600",
  },
  logsList: {
    flex: 1,
  },
  logItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  teamIndicator: {
    width: 4,
    height: 16,
    borderRadius: 2,
    marginRight: 6,
  },
  logTeam: {
    fontSize: 14,
    fontWeight: "600",
    width: 60,
  },
  logDetail: {
    flex: 1,
    fontSize: 14,
    paddingHorizontal: 8,
  },
  logTime: {
    fontSize: 12,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 20,
    fontStyle: "italic",
  },
});
