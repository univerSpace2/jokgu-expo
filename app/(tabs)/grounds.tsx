import { useEffect, useState, useCallback } from "react";
import {
  ScrollView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { groundAPI } from "../../lib/api";
import { JokguGround } from "../../types";
import { eventEmitter, EventTypes } from "../../lib/eventEmitter";
import { useAppFocus } from "../../lib/utils";

export default function GroundsScreen() {
  const [grounds, setGrounds] = useState<JokguGround[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const fetchGrounds = useCallback(async () => {
    try {
      setLoading(true);
      const data = await groundAPI.getAll();
      setGrounds(data);
    } catch (error) {
      console.error("경기장 목록 조회 중 오류 발생:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 앱이 포커스를 얻을 때 데이터를 자동으로 새로고침
  useAppFocus(fetchGrounds);

  useEffect(() => {
    fetchGrounds();

    // 이벤트 구독 설정
    const unsubscribe = eventEmitter.on(EventTypes.GROUND_CHANGED, () => {
      fetchGrounds();
    });

    // 컴포넌트 언마운트 시 구독 해제
    return () => {
      unsubscribe();
    };
  }, [fetchGrounds]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchGrounds();
    } finally {
      setRefreshing(false);
    }
  }, [fetchGrounds]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>경기장 목록</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push("/grounds/new")}
        >
          <Text style={styles.addButtonText}>+ 새 경기장</Text>
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
          {grounds.length > 0 ? (
            grounds.map((ground) => (
              <TouchableOpacity
                key={ground.id}
                style={styles.groundCard}
                onPress={() => router.push(`/grounds/${ground.id}` as any)}
              >
                <View style={styles.groundInfo}>
                  <Text style={styles.groundName}>{ground.name}</Text>
                  <Text style={styles.groundLocation}>{ground.location}</Text>
                </View>
                <View style={styles.groundDetails}>
                  <View
                    style={[
                      styles.reservationBadge,
                      ground.reservation_required
                        ? styles.requiredBadge
                        : styles.notRequiredBadge,
                    ]}
                  >
                    <Text style={styles.badgeText}>
                      {ground.reservation_required ? "예약필수" : "예약불필요"}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>등록된 경기장이 없습니다.</Text>
              <Text style={styles.emptySubText}>새 경기장을 추가해보세요!</Text>
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
  groundCard: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  groundInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  groundName: {
    fontSize: 16,
    fontWeight: "bold",
  },
  groundLocation: {
    fontSize: 14,
    marginBottom: 8,
  },
  groundDetails: {
    flexDirection: "row",
    alignItems: "center",
  },
  reservationBadge: {
    backgroundColor: "#17a2b8",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  requiredBadge: {
    backgroundColor: "#dc3545",
  },
  notRequiredBadge: {
    backgroundColor: "#28a745",
  },
  badgeText: {
    color: "white",
    fontSize: 12,
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
