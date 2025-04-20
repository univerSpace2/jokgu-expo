import { useEffect, useState, useCallback } from "react";
import {
  ScrollView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { playerAPI } from "../../lib/api";
import { Player } from "../../types";
import { eventEmitter, EventTypes } from "../../lib/eventEmitter";
import { useAppFocus } from "../../lib/utils";

export default function PlayersScreen() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const fetchPlayers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await playerAPI.getAll();
      setPlayers(data);
    } catch (error) {
      console.error("플레이어 조회 중 오류 발생:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 앱이 포커스를 얻을 때 데이터를 자동으로 새로고침
  useAppFocus(fetchPlayers);

  useEffect(() => {
    fetchPlayers();

    // 이벤트 구독 설정
    const unsubscribe = eventEmitter.on(EventTypes.PLAYER_CHANGED, () => {
      fetchPlayers();
    });

    // 컴포넌트 언마운트 시 구독 해제
    return () => {
      unsubscribe();
    };
  }, [fetchPlayers]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchPlayers();
    } finally {
      setRefreshing(false);
    }
  }, [fetchPlayers]);

  async function deletePlayer(id: string) {
    try {
      await playerAPI.delete(id);
      // 이벤트 이미터로 처리되므로 여기서 데이터 수동 업데이트 필요 없음
      // setPlayers(players.filter((player) => player.id !== id));
    } catch (error) {
      console.error("플레이어 삭제 중 오류 발생:", error);
      Alert.alert("오류", "플레이어 삭제 중 오류가 발생했습니다.");
    }
  }

  const confirmDelete = (player: Player) => {
    Alert.alert(
      "플레이어 삭제",
      `${player.name} 플레이어를 삭제하시겠습니까?`,
      [
        {
          text: "취소",
          style: "cancel",
        },
        {
          text: "삭제",
          onPress: () => deletePlayer(player.id),
          style: "destructive",
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>플레이어 목록</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push("/players/new")}
        >
          <Text style={styles.addButtonText}>+ 새 플레이어</Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <Text>불러오는 중...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {players.length > 0 ? (
            players.map((player) => (
              <View key={player.id} style={styles.playerCard}>
                <View style={styles.playerInfo}>
                  <Text style={styles.playerName}>{player.name}</Text>
                  {player.contact && (
                    <Text style={styles.playerContact}>{player.contact}</Text>
                  )}
                </View>
                <View style={styles.playerActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.editButton]}
                    onPress={() => router.push(`/players/${player.id}` as any)}
                  >
                    <Text style={styles.editButtonText}>수정</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => confirmDelete(player)}
                  >
                    <Text style={styles.deleteButtonText}>삭제</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>등록된 플레이어가 없습니다.</Text>
              <Text style={styles.emptySubText}>
                새 플레이어를 추가해보세요!
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f8f9fa",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  addButton: {
    backgroundColor: "#007bff",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  addButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  list: {
    flex: 1,
  },
  playerCard: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  playerContact: {
    fontSize: 14,
    color: "#666",
  },
  playerActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  editButton: {
    backgroundColor: "#6c757d",
  },
  editButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  deleteButton: {
    backgroundColor: "#dc3545",
  },
  deleteButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: "#666",
  },
});
