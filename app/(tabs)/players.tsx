import { useEffect, useState, useCallback } from "react";
import {
  ScrollView,
  View,
  Alert,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { playerAPI } from "../../lib/api";
import { Player } from "../../types";
import { eventEmitter, EventTypes } from "../../lib/eventEmitter";
import { useAppFocus } from "../../lib/utils";
import {
  Layout,
  Button,
  Section,
  Text,
  TopNav,
  useTheme,
  themeColor,
} from "react-native-rapi-ui";
import { Ionicons } from "@expo/vector-icons";

export default function PlayersScreen() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const { theme, isDarkmode } = useTheme();

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
    <Layout>
      <TopNav
        middleContent="플레이어"
        middleTextStyle={{
          fontSize: 20,
          fontWeight: "bold",
          color: isDarkmode ? themeColor.white : themeColor.black,
        }}
        rightContent={
          <Button
            status="primary"
            size="md"
            text="새 플레이어"
            onPress={() => router.push("/players/new")}
            style={{
              paddingHorizontal: 4,
              minWidth: 80,
              borderRadius: 8,
              marginRight: 5,
            }}
          />
        }
        leftContent={
          <Ionicons
            name="refresh-outline"
            size={20}
            color={isDarkmode ? themeColor.white : themeColor.black}
            onPress={onRefresh}
          />
        }
        backgroundColor={isDarkmode ? themeColor.dark : themeColor.white}
        borderColor={isDarkmode ? themeColor.dark200 : themeColor.gray200}
      />

      {loading && !refreshing ? (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: isDarkmode
              ? themeColor.dark100
              : themeColor.gray100,
          }}
        >
          <Text>불러오는 중...</Text>
        </View>
      ) : (
        <ScrollView
          style={{
            flex: 1,
            backgroundColor: isDarkmode
              ? themeColor.dark100
              : themeColor.gray100,
            padding: 16,
          }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {players.length > 0 ? (
            players.map((player) => (
              <TouchableOpacity
                key={player.id}
                onPress={() => router.push(`/players/${player.id}` as any)}
                style={{ marginBottom: 16 }}
                activeOpacity={0.7}
              >
                <Section
                  style={{
                    backgroundColor: isDarkmode
                      ? themeColor.dark
                      : themeColor.white,
                    padding: 16,
                    borderRadius: 16,
                    shadowColor: isDarkmode ? "#000" : "#888",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: isDarkmode ? 0.2 : 0.08,
                    shadowRadius: 8,
                    elevation: 3,
                    borderWidth: 1,
                    borderColor: isDarkmode
                      ? themeColor.dark200
                      : themeColor.gray200,
                    flexDirection: "row",
                    justifyContent: "flex-start",
                    alignItems: "flex-start",
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      fontWeight="bold"
                      size="h3"
                      style={{
                        color: isDarkmode ? themeColor.white : themeColor.black,
                        marginBottom: 4,
                      }}
                    >
                      {player.name}
                    </Text>
                    {player.contact && (
                      <View
                        style={{ flexDirection: "row", alignItems: "center" }}
                      >
                        <Ionicons
                          name="call-outline"
                          size={14}
                          color={
                            isDarkmode ? themeColor.gray400 : themeColor.gray500
                          }
                          style={{ marginRight: 4 }}
                        />
                        <Text
                          size="sm"
                          style={{
                            color: isDarkmode
                              ? themeColor.gray400
                              : themeColor.gray500,
                          }}
                        >
                          {player.contact}
                        </Text>
                      </View>
                    )}
                    {player.bank_account && (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          marginTop: 4,
                        }}
                      >
                        <Ionicons
                          name="card-outline"
                          size={14}
                          color={
                            isDarkmode ? themeColor.gray400 : themeColor.gray500
                          }
                          style={{ marginRight: 4 }}
                        />
                        <Text
                          size="sm"
                          style={{
                            color: isDarkmode
                              ? themeColor.gray400
                              : themeColor.gray500,
                          }}
                        >
                          {player.bank_account}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        router.push(`/players/${player.id}` as any);
                      }}
                      style={{
                        marginLeft: 8,
                        backgroundColor: isDarkmode
                          ? "rgba(99, 102, 241, 0.15)"
                          : "rgba(99, 102, 241, 0.1)",
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Ionicons
                        name="create-outline"
                        size={18}
                        color={themeColor.primary}
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        confirmDelete(player);
                      }}
                      style={{
                        marginLeft: 8,
                        backgroundColor: isDarkmode
                          ? "rgba(239, 68, 68, 0.15)"
                          : "rgba(239, 68, 68, 0.1)",
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={18}
                        color={
                          isDarkmode ? themeColor.dark200 : themeColor.gray400
                        }
                      />
                    </TouchableOpacity>
                  </View>
                </Section>
              </TouchableOpacity>
            ))
          ) : (
            <View
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                padding: 40,
                marginTop: 50,
              }}
            >
              <Ionicons
                name="people-outline"
                size={60}
                color={isDarkmode ? themeColor.dark200 : themeColor.gray400}
                style={{ marginBottom: 16, opacity: 0.6 }}
              />
              <Text
                size="lg"
                fontWeight="bold"
                style={{
                  marginBottom: 8,
                  color: isDarkmode ? themeColor.white : themeColor.black,
                }}
              >
                등록된 플레이어가 없습니다.
              </Text>
              <Text
                size="md"
                style={{
                  color: isDarkmode ? themeColor.gray400 : themeColor.gray500,
                  textAlign: "center",
                  marginBottom: 20,
                }}
              >
                새로운 플레이어를 추가해보세요!
              </Text>
              <Button
                text="+ 새 플레이어 추가"
                onPress={() => router.push("/players/new")}
                status="primary"
                size="lg"
                style={{ borderRadius: 12 }}
              />
            </View>
          )}
        </ScrollView>
      )}
    </Layout>
  );
}
