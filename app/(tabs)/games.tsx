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
import { gameAPI } from "../../lib/api";
import { supabase } from "../../lib/supabase";
import { Game } from "../../types";

export default function GamesScreen() {
  const [games, setGames] = useState<(Game & { meeting_date?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const fetchGames = useCallback(async () => {
    try {
      setLoading(true);

      // 게임 정보와 함께 관련 미팅 날짜도 가져옴
      const gamesData = await gameAPI.getAll();

      // 미팅 ID가 있는 게임에 대해 미팅 정보 추가 조회
      const formattedGames = await Promise.all(
        gamesData.map(async (game) => {
          if (game.meeting_id) {
            const { data } = await supabase
              .from("meeting")
              .select("meeting_date")
              .eq("id", game.meeting_id)
              .single();

            return {
              ...game,
              meeting_date: data?.meeting_date || undefined,
            };
          }
          return { ...game };
        })
      );

      setGames(formattedGames);
    } catch (error) {
      console.error("게임 조회 중 오류 발생:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchGames();
    } finally {
      setRefreshing(false);
    }
  }, [fetchGames]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>게임 목록</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push("/games/new")}
        >
          <Text style={styles.addButtonText}>+ 새 게임</Text>
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
          {games.length > 0 ? (
            games.map((game) => (
              <TouchableOpacity
                key={game.id}
                style={styles.gameCard}
                onPress={() => router.push(`/games/${game.id}` as any)}
              >
                <View style={styles.gameTop}>
                  <Text style={styles.gameDate}>
                    {game.meeting_date
                      ? new Date(game.meeting_date).toLocaleDateString("ko-KR")
                      : "독립 게임"}
                  </Text>
                  <View style={styles.gameBadge}>
                    <Text style={styles.gameBadgeText}>
                      {game.num_of_sets}세트
                    </Text>
                  </View>
                </View>
                <View style={styles.gameDetails}>
                  <Text style={styles.gameScore}>
                    목표 점수: {game.winning_score}점
                  </Text>
                  {game.penalty_details && (
                    <Text style={styles.gamePenalty} numberOfLines={1}>
                      내기: {game.penalty_details}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>등록된 게임이 없습니다.</Text>
              <Text style={styles.emptySubText}>새 게임을 만들어보세요!</Text>
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
  gameCard: {
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
  gameTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  gameDate: {
    fontSize: 16,
    fontWeight: "bold",
  },
  gameBadge: {
    backgroundColor: "#28a745",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  gameBadgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  gameDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  gameScore: {
    fontSize: 14,
    color: "#666",
  },
  gamePenalty: {
    fontSize: 14,
    color: "#666",
    maxWidth: "60%",
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
