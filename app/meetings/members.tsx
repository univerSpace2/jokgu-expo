import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  FlatList,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { meetingAPI, playerAPI } from "../../lib/api";
import { Player } from "../../types";

export default function MeetingMembersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [members, setMembers] = useState<Player[]>([]);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      if (!id) {
        Alert.alert("오류", "모임 ID가 올바르지 않습니다.");
        router.back();
        return;
      }

      try {
        setLoading(true);

        // 모임 참여자 가져오기
        const membersData = await meetingAPI.getMembers(id);
        setMembers(membersData);

        // 모든 플레이어 가져오기
        const playersData = await playerAPI.getAll();
        setAllPlayers(playersData);
      } catch (error) {
        console.error("데이터 로딩 중 오류 발생:", error);
        Alert.alert("오류", "데이터를 불러오는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, router]);

  // 플레이어가 이미 참여자인지 확인
  const isMember = (playerId: string) => {
    return members.some((member) => member.id === playerId);
  };

  // 참여자 추가
  const handleAddMember = async (playerId: string) => {
    try {
      await meetingAPI.addMember(id, playerId);
      // 멤버 목록 업데이트
      const player = allPlayers.find((p) => p.id === playerId);
      if (player) {
        setMembers((prev) => [...prev, player]);
      }
    } catch (error) {
      console.error("참여자 추가 중 오류 발생:", error);
      Alert.alert("오류", "참여자를 추가하는 중 오류가 발생했습니다.");
    }
  };

  // 참여자 삭제
  const handleRemoveMember = async (playerId: string) => {
    try {
      await meetingAPI.removeMember(id, playerId);
      // 멤버 목록 업데이트
      setMembers((prev) => prev.filter((member) => member.id !== playerId));
    } catch (error) {
      console.error("참여자 삭제 중 오류 발생:", error);
      Alert.alert("오류", "참여자를 삭제하는 중 오류가 발생했습니다.");
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
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <FontAwesome name="arrow-left" size={18} color="#007bff" />
          <Text style={styles.backButtonText}>뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.title}>참여자 관리</Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            현재 참여자 ({members.length}명)
          </Text>
          {members.length > 0 ? (
            <FlatList
              data={members}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.memberItem}>
                  <Text style={styles.memberName}>{item.name}</Text>
                  <TouchableOpacity
                    style={styles.memberActionButton}
                    onPress={() => {
                      Alert.alert(
                        "참여자 삭제",
                        `${item.name}님을 모임에서 제외하시겠습니까?`,
                        [
                          { text: "취소", style: "cancel" },
                          {
                            text: "삭제",
                            style: "destructive",
                            onPress: () => handleRemoveMember(item.id),
                          },
                        ]
                      );
                    }}
                  >
                    <FontAwesome name="times" size={16} color="#dc3545" />
                  </TouchableOpacity>
                </View>
              )}
            />
          ) : (
            <Text style={styles.emptyText}>참여자가 없습니다.</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>플레이어 목록</Text>
          {allPlayers.length > 0 ? (
            <FlatList
              data={allPlayers.filter((player) => !isMember(player.id))}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.playerItem}>
                  <Text style={styles.playerName}>{item.name}</Text>
                  <TouchableOpacity
                    style={styles.playerActionButton}
                    onPress={() => handleAddMember(item.id)}
                  >
                    <FontAwesome name="plus" size={16} color="#28a745" />
                  </TouchableOpacity>
                </View>
              )}
            />
          ) : (
            <Text style={styles.emptyText}>등록된 플레이어가 없습니다.</Text>
          )}
        </View>
      </View>
    </View>
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
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
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
    marginBottom: 12,
  },
  memberItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f3f5",
  },
  memberName: {
    fontSize: 16,
  },
  memberActionButton: {
    padding: 8,
  },
  playerItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f3f5",
  },
  playerName: {
    fontSize: 16,
  },
  playerActionButton: {
    padding: 8,
  },
  emptyText: {
    textAlign: "center",
    paddingVertical: 16,
    color: "#6c757d",
  },
});
