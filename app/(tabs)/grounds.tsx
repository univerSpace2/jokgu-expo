import { useEffect, useState, useCallback } from "react";
import {
  ScrollView,
  View,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Linking,
  TextInput,
  Modal,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { groundAPI, jokguGroundTypeAPI } from "../../lib/api";
import { JokguGround, JokguGroundType } from "../../types";
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

// 정렬 타입 정의
type SortOption = "name" | "location" | "id";
// 필터 타입 정의
type Filters = {
  indoorStatus: "all" | "indoor" | "outdoor";
  reservationStatus: "all" | "required" | "not-required";
  locationKeyword: string;
};

export default function GroundsScreen() {
  const [grounds, setGrounds] = useState<JokguGround[]>([]);
  const [filteredGrounds, setFilteredGrounds] = useState<JokguGround[]>([]);
  const [groundTypes, setGroundTypes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const { theme, isDarkmode } = useTheme();

  // 필터링 & 정렬 상태
  const [sortOption, setSortOption] = useState<SortOption>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [filters, setFilters] = useState<Filters>({
    indoorStatus: "all",
    reservationStatus: "all",
    locationKeyword: "",
  });
  const [showFilterModal, setShowFilterModal] = useState(false);

  const fetchGroundTypes = useCallback(async () => {
    try {
      const types = await jokguGroundTypeAPI.getAll();
      const typesMap: Record<string, string> = {};
      types.forEach((type) => {
        typesMap[type.id] = type.type_name;
      });
      setGroundTypes(typesMap);
    } catch (error) {
      console.error("족구장 타입 조회 중 오류 발생:", error);
    }
  }, []);

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

  // 필터링 및 정렬 로직
  useEffect(() => {
    if (grounds.length === 0) return;

    let result = [...grounds];

    // 필터링 적용
    if (filters.indoorStatus !== "all") {
      const isIndoor = filters.indoorStatus === "indoor";
      result = result.filter((ground) => ground.is_indoor === isIndoor);
    }

    if (filters.reservationStatus !== "all") {
      const isRequired = filters.reservationStatus === "required";
      result = result.filter(
        (ground) => ground.reservation_required === isRequired
      );
    }

    if (filters.locationKeyword.trim() !== "") {
      const keyword = filters.locationKeyword.toLowerCase().trim();
      result = result.filter(
        (ground) =>
          ground.location.toLowerCase().includes(keyword) ||
          ground.name.toLowerCase().includes(keyword)
      );
    }

    // 정렬 적용
    result.sort((a, b) => {
      let comparison = 0;

      switch (sortOption) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "location":
          comparison = a.location.localeCompare(b.location);
          break;
        case "id":
          // ID 기준 정렬 (생성 순서 추정)
          comparison = a.id.localeCompare(b.id);
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    setFilteredGrounds(result);
  }, [grounds, filters, sortOption, sortDirection]);

  // 앱이 포커스를 얻을 때 데이터를 자동으로 새로고침
  useAppFocus(fetchGrounds);

  useEffect(() => {
    fetchGrounds();
    fetchGroundTypes();

    // 이벤트 구독 설정
    const unsubscribe = eventEmitter.on(EventTypes.GROUND_CHANGED, () => {
      fetchGrounds();
    });

    // 컴포넌트 언마운트 시 구독 해제
    return () => {
      unsubscribe();
    };
  }, [fetchGrounds, fetchGroundTypes]);

  const handleOpenReservationLink = async (link: string) => {
    if (link) {
      try {
        const canOpen = await Linking.canOpenURL(link);
        if (canOpen) {
          await Linking.openURL(link);
        } else {
          Alert.alert("오류", "예약 링크를 열 수 없습니다.");
        }
      } catch (error) {
        console.error("예약 링크 열기 오류:", error);
        Alert.alert("오류", "예약 링크를 여는데 실패했습니다.");
      }
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchGrounds();
      await fetchGroundTypes();
    } finally {
      setRefreshing(false);
    }
  }, [fetchGrounds, fetchGroundTypes]);

  const toggleSortDirection = () => {
    setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  const getSortButtonTitle = () => {
    const options = {
      name: "이름",
      location: "위치",
      id: "추가순",
    };
    return `${options[sortOption]} ${sortDirection === "asc" ? "↑" : "↓"}`;
  };

  // 필터 모달 렌더링
  const renderFilterModal = () => {
    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={showFilterModal}
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "flex-end",
            backgroundColor: "rgba(0,0,0,0.5)",
          }}
        >
          <View
            style={{
              backgroundColor: isDarkmode ? themeColor.dark : themeColor.white,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 20,
              shadowColor: "#000",
              shadowOffset: {
                width: 0,
                height: -2,
              },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 5,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 20,
              }}
            >
              <Text
                size="h2"
                style={{
                  color: isDarkmode ? themeColor.white : themeColor.black,
                }}
              >
                필터 및 정렬
              </Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons
                  name="close-outline"
                  size={24}
                  color={isDarkmode ? themeColor.white : themeColor.black}
                />
              </TouchableOpacity>
            </View>

            <Section
              style={{
                marginBottom: 16,
                borderRadius: 12,
                padding: 15,
              }}
            >
              <Text
                fontWeight="bold"
                style={{
                  marginBottom: 10,
                  color: isDarkmode ? themeColor.white : themeColor.black,
                }}
              >
                정렬 방식
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  marginBottom: 16,
                }}
              >
                {(["name", "location", "id"] as SortOption[]).map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      backgroundColor:
                        sortOption === option
                          ? isDarkmode
                            ? themeColor.primary700
                            : themeColor.primary
                          : isDarkmode
                          ? themeColor.dark200
                          : themeColor.gray200,
                      borderRadius: 16,
                      marginRight: 8,
                      marginBottom: 8,
                    }}
                    onPress={() => setSortOption(option)}
                  >
                    <Text
                      size="sm"
                      style={{
                        color:
                          sortOption === option
                            ? "white"
                            : isDarkmode
                            ? themeColor.gray300
                            : themeColor.gray500,
                      }}
                    >
                      {option === "name"
                        ? "이름순"
                        : option === "location"
                        ? "위치순"
                        : "추가순"}
                    </Text>
                  </TouchableOpacity>
                ))}

                <TouchableOpacity
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    backgroundColor: isDarkmode
                      ? themeColor.dark200
                      : themeColor.gray200,
                    borderRadius: 16,
                    marginRight: 8,
                    marginBottom: 8,
                  }}
                  onPress={toggleSortDirection}
                >
                  <Text
                    size="sm"
                    style={{
                      color: isDarkmode
                        ? themeColor.gray300
                        : themeColor.gray500,
                    }}
                  >
                    {sortDirection === "asc" ? "오름차순 ↑" : "내림차순 ↓"}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text
                fontWeight="bold"
                style={{
                  marginBottom: 10,
                  marginTop: 10,
                  color: isDarkmode ? themeColor.white : themeColor.black,
                }}
              >
                실내/실외 필터
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  marginBottom: 16,
                }}
              >
                {(["all", "indoor", "outdoor"] as const).map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      backgroundColor:
                        filters.indoorStatus === option
                          ? isDarkmode
                            ? themeColor.primary700
                            : themeColor.primary
                          : isDarkmode
                          ? themeColor.dark200
                          : themeColor.gray200,
                      borderRadius: 16,
                      marginRight: 8,
                      marginBottom: 8,
                    }}
                    onPress={() =>
                      setFilters((prev) => ({
                        ...prev,
                        indoorStatus: option,
                      }))
                    }
                  >
                    <Text
                      size="sm"
                      style={{
                        color:
                          filters.indoorStatus === option
                            ? "white"
                            : isDarkmode
                            ? themeColor.gray300
                            : themeColor.gray500,
                      }}
                    >
                      {option === "all"
                        ? "전체"
                        : option === "indoor"
                        ? "실내"
                        : "실외"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text
                fontWeight="bold"
                style={{
                  marginBottom: 10,
                  marginTop: 10,
                  color: isDarkmode ? themeColor.white : themeColor.black,
                }}
              >
                예약 필터
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  marginBottom: 16,
                }}
              >
                {(["all", "required", "not-required"] as const).map(
                  (option) => (
                    <TouchableOpacity
                      key={option}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        backgroundColor:
                          filters.reservationStatus === option
                            ? isDarkmode
                              ? themeColor.primary700
                              : themeColor.primary
                            : isDarkmode
                            ? themeColor.dark200
                            : themeColor.gray200,
                        borderRadius: 16,
                        marginRight: 8,
                        marginBottom: 8,
                      }}
                      onPress={() =>
                        setFilters((prev) => ({
                          ...prev,
                          reservationStatus: option,
                        }))
                      }
                    >
                      <Text
                        size="sm"
                        style={{
                          color:
                            filters.reservationStatus === option
                              ? "white"
                              : isDarkmode
                              ? themeColor.gray300
                              : themeColor.gray500,
                        }}
                      >
                        {option === "all"
                          ? "전체"
                          : option === "required"
                          ? "예약필수"
                          : "예약불필요"}
                      </Text>
                    </TouchableOpacity>
                  )
                )}
              </View>

              <Text
                fontWeight="bold"
                style={{
                  marginBottom: 10,
                  marginTop: 10,
                  color: isDarkmode ? themeColor.white : themeColor.black,
                }}
              >
                위치 검색
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: isDarkmode
                    ? themeColor.dark200
                    : themeColor.gray200,
                  borderRadius: 8,
                  padding: 10,
                  marginBottom: 16,
                  color: isDarkmode ? themeColor.white : themeColor.black,
                  backgroundColor: isDarkmode
                    ? themeColor.dark100
                    : themeColor.white,
                }}
                placeholder="주소 또는 이름으로 검색"
                placeholderTextColor={
                  isDarkmode ? themeColor.gray500 : themeColor.gray400
                }
                value={filters.locationKeyword}
                onChangeText={(text) =>
                  setFilters((prev) => ({
                    ...prev,
                    locationKeyword: text,
                  }))
                }
              />
            </Section>

            <Button
              text="필터 초기화"
              onPress={() => {
                setFilters({
                  indoorStatus: "all",
                  reservationStatus: "all",
                  locationKeyword: "",
                });
                setSortOption("name");
                setSortDirection("asc");
              }}
              status="danger"
              outline
              style={{ marginBottom: 10 }}
            />
            <Button
              text="완료"
              onPress={() => setShowFilterModal(false)}
              status="primary"
            />
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <Layout>
      <TopNav
        middleContent="족구장"
        middleTextStyle={{
          fontSize: 20,
          fontWeight: "bold",
          color: isDarkmode ? themeColor.white : themeColor.black,
        }}
        leftContent={
          <View style={{ flexDirection: "row" }}>
            <TouchableOpacity
              onPress={() => setShowFilterModal(true)}
              style={{
                marginRight: 5,
                paddingTop: 5,
              }}
            >
              <Ionicons
                name="filter-outline"
                size={22}
                color={isDarkmode ? themeColor.white : themeColor.black}
              />
            </TouchableOpacity>
          </View>
        }
        rightContent={
          <View style={{ flexDirection: "row" }}>
            <Button
              status="primary"
              size="md"
              text="새 경기장"
              onPress={() => router.push("/grounds/new")}
              style={{
                paddingHorizontal: 4,
                minWidth: 80,
                borderRadius: 8,
                marginRight: 5,
              }}
            />
          </View>
        }
        // leftContent={
        //   <Ionicons
        //     name="refresh-outline"
        //     size={20}
        //     color={isDarkmode ? themeColor.white : themeColor.black}
        //     onPress={onRefresh}
        //   />
        // }
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
          {/* 활성화된 필터 정보 표시 */}
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              marginBottom: 16,
              alignItems: "center",
            }}
          >
            <Text
              size="sm"
              style={{
                marginRight: 8,
                color: isDarkmode ? themeColor.gray300 : themeColor.gray500,
              }}
            >
              정렬: {getSortButtonTitle()}
            </Text>

            {filters.indoorStatus !== "all" && (
              <View
                style={{
                  backgroundColor: isDarkmode
                    ? "rgba(59, 130, 246, 0.2)"
                    : "rgba(59, 130, 246, 0.1)",
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 4,
                  marginRight: 8,
                }}
              >
                <Text size="sm" style={{ color: "#3b82f6" }}>
                  {filters.indoorStatus === "indoor" ? "실내" : "실외"}
                </Text>
              </View>
            )}

            {filters.reservationStatus !== "all" && (
              <View
                style={{
                  backgroundColor: isDarkmode
                    ? "rgba(244, 63, 94, 0.2)"
                    : "rgba(244, 63, 94, 0.1)",
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 4,
                  marginRight: 8,
                }}
              >
                <Text size="sm" style={{ color: "#f43f5e" }}>
                  {filters.reservationStatus === "required"
                    ? "예약필수"
                    : "예약불필요"}
                </Text>
              </View>
            )}

            {filters.locationKeyword.trim() !== "" && (
              <View
                style={{
                  backgroundColor: isDarkmode
                    ? "rgba(139, 92, 246, 0.2)"
                    : "rgba(139, 92, 246, 0.1)",
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 4,
                  marginRight: 8,
                }}
              >
                <Text size="sm" style={{ color: "#8b5cf6" }}>
                  검색: {filters.locationKeyword}
                </Text>
              </View>
            )}
          </View>

          {filteredGrounds.length > 0 ? (
            filteredGrounds.map((ground) => (
              <TouchableOpacity
                key={ground.id}
                onPress={() => router.push(`/grounds/${ground.id}` as any)}
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
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 8,
                    }}
                  >
                    <Text
                      fontWeight="bold"
                      size="h3"
                      style={{
                        color: isDarkmode ? themeColor.white : themeColor.black,
                      }}
                    >
                      {ground.name}
                    </Text>
                    <View
                      style={{
                        backgroundColor: ground.reservation_required
                          ? isDarkmode
                            ? "rgba(244, 63, 94, 0.2)"
                            : "rgba(244, 63, 94, 0.1)"
                          : isDarkmode
                          ? "rgba(34, 197, 94, 0.2)"
                          : "rgba(34, 197, 94, 0.1)",
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 16,
                      }}
                    >
                      <Text
                        size="sm"
                        style={{
                          color: ground.reservation_required
                            ? "#f43f5e"
                            : "#22c55e",
                          fontWeight: "bold",
                        }}
                      >
                        {ground.reservation_required
                          ? "예약필수"
                          : "예약불필요"}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: 4,
                    }}
                  >
                    <Ionicons
                      name="location-outline"
                      size={16}
                      color={
                        isDarkmode ? themeColor.gray400 : themeColor.gray500
                      }
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      size="md"
                      style={{
                        color: isDarkmode
                          ? themeColor.gray400
                          : themeColor.gray500,
                      }}
                    >
                      {ground.location}
                    </Text>
                  </View>

                  <View style={{ flexDirection: "row", marginTop: 8 }}>
                    {ground.is_indoor !== undefined && (
                      <View
                        style={{
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          backgroundColor: ground.is_indoor
                            ? isDarkmode
                              ? "rgba(59, 130, 246, 0.2)"
                              : "rgba(59, 130, 246, 0.1)"
                            : isDarkmode
                            ? "rgba(245, 158, 11, 0.2)"
                            : "rgba(245, 158, 11, 0.1)",
                          borderRadius: 4,
                          marginRight: 8,
                        }}
                      >
                        <Text
                          size="sm"
                          style={{
                            color: ground.is_indoor ? "#3b82f6" : "#f59e0b",
                          }}
                        >
                          {ground.is_indoor ? "실내" : "실외"}
                        </Text>
                      </View>
                    )}

                    {ground.f_jokgu_ground_type &&
                      groundTypes[ground.f_jokgu_ground_type] && (
                        <View
                          style={{
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            backgroundColor: isDarkmode
                              ? "rgba(139, 92, 246, 0.2)"
                              : "rgba(139, 92, 246, 0.1)",
                            borderRadius: 4,
                            marginRight: 8,
                          }}
                        >
                          <Text size="sm" style={{ color: "#8b5cf6" }}>
                            {groundTypes[ground.f_jokgu_ground_type]}
                          </Text>
                        </View>
                      )}

                    {ground.reservation_link && (
                      <TouchableOpacity
                        style={{
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          backgroundColor: isDarkmode
                            ? "rgba(14, 165, 233, 0.2)"
                            : "rgba(14, 165, 233, 0.1)",
                          borderRadius: 4,
                          flexDirection: "row",
                          alignItems: "center",
                        }}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleOpenReservationLink(ground.reservation_link!);
                        }}
                      >
                        <Ionicons
                          name="link-outline"
                          size={14}
                          color="#0ea5e9"
                          style={{ marginRight: 4 }}
                        />
                        <Text size="sm" style={{ color: "#0ea5e9" }}>
                          예약하기
                        </Text>
                      </TouchableOpacity>
                    )}
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
                name="map-outline"
                size={60}
                color={isDarkmode ? themeColor.dark200 : themeColor.gray}
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
                {grounds.length > 0
                  ? "검색 결과가 없습니다"
                  : "등록된 경기장이 없습니다."}
              </Text>
              <Text
                size="md"
                style={{
                  color: isDarkmode ? themeColor.gray400 : themeColor.gray500,
                  textAlign: "center",
                  marginBottom: 20,
                }}
              >
                {grounds.length > 0
                  ? "필터를 변경하거나 다시 검색해보세요."
                  : "새로운 경기장을 추가해보세요!"}
              </Text>
              {grounds.length === 0 && (
                <Button
                  text="+ 새 경기장 추가"
                  onPress={() => router.push("/grounds/new")}
                  status="primary"
                  size="lg"
                  style={{ borderRadius: 12 }}
                />
              )}
              {grounds.length > 0 && (
                <Button
                  text="필터 초기화"
                  onPress={() => {
                    setFilters({
                      indoorStatus: "all",
                      reservationStatus: "all",
                      locationKeyword: "",
                    });
                  }}
                  status="primary"
                  size="lg"
                  style={{ borderRadius: 12 }}
                />
              )}
            </View>
          )}
        </ScrollView>
      )}
      {renderFilterModal()}
    </Layout>
  );
}
