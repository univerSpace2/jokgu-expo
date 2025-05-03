import React, { useEffect, useState } from "react";
import {
  View,
  Share,
  Linking,
  Alert,
  ScrollView,
  TextInput as NativeTextInput,
  Switch,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, Stack, useRouter } from "expo-router";
import { groundAPI, jokguGroundTypeAPI } from "../../lib/api";
import { JokguGround, JokguGroundType } from "../../types";
import {
  Layout,
  Text,
  Button,
  Section,
  TopNav,
  themeColor,
  useTheme,
  TextInput,
} from "react-native-rapi-ui";
import { Ionicons } from "@expo/vector-icons";

export default function GroundDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [ground, setGround] = useState<JokguGround | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [groundTypes, setGroundTypes] = useState<JokguGroundType[]>([]);
  const [groundTypeName, setGroundTypeName] = useState("");
  const router = useRouter();
  const isDarkmode = false;

  // 수정 모드 상태 추가
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [isIndoor, setIsIndoor] = useState(false);
  const [reservationRequired, setReservationRequired] = useState(false);
  const [reservationMethod, setReservationMethod] = useState("");
  const [reservationLink, setReservationLink] = useState("");
  const [priceInfo, setPriceInfo] = useState("");
  const [groundTypeId, setGroundTypeId] = useState<string | null>(null);

  useEffect(() => {
    const fetchGroundTypes = async () => {
      try {
        const types = await jokguGroundTypeAPI.getAll();
        setGroundTypes(types);
      } catch (error) {
        console.error("족구장 타입 조회 중 오류 발생:", error);
      }
    };

    fetchGroundTypes();
  }, []);

  useEffect(() => {
    const fetchGround = async () => {
      try {
        setLoading(true);
        if (id) {
          const data = await groundAPI.getById(id);
          setGround(data);

          // 수정 필드 초기화
          if (data) {
            setName(data.name);
            setLocation(data.location);
            setIsIndoor(data.is_indoor || false);
            setReservationRequired(data.reservation_required);
            setReservationMethod(data.reservation_method || "");
            setReservationLink(data.reservation_link || "");
            setPriceInfo(data.price_info || "");
            setGroundTypeId(data.f_jokgu_ground_type || null);

            // 족구장 타입 이름 찾기
            if (data.f_jokgu_ground_type && groundTypes.length > 0) {
              const type = groundTypes.find(
                (t) => t.id === data.f_jokgu_ground_type
              );
              if (type) {
                setGroundTypeName(type.type_name);
              }
            }
          }
        }
      } catch (error) {
        console.error("경기장 정보 조회 중 오류 발생:", error);
        Alert.alert("오류", "경기장 정보를 불러오는데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchGround();
  }, [id, groundTypes]);

  const handleShareAddress = async () => {
    if (ground?.location) {
      try {
        await Share.share({
          message: ground.location,
          title: `${ground.name} 위치 정보`,
        });
      } catch (error) {
        console.error("주소 공유 중 오류 발생:", error);
        Alert.alert("오류", "주소 공유에 실패했습니다.");
      }
    }
  };

  const handleOpenMap = async () => {
    if (ground?.location) {
      try {
        const mapUrl = `https://maps.google.com/?q=${encodeURIComponent(
          ground.location
        )}`;
        const canOpen = await Linking.canOpenURL(mapUrl);

        if (canOpen) {
          await Linking.openURL(mapUrl);
        } else {
          Alert.alert("오류", "지도 앱을 열 수 없습니다.");
        }
      } catch (error) {
        console.error("지도 앱 열기 오류:", error);
        Alert.alert("오류", "지도 앱을 여는데 실패했습니다.");
      }
    }
  };

  const handleOpenReservationLink = async () => {
    if (ground?.reservation_link) {
      try {
        const canOpen = await Linking.canOpenURL(ground.reservation_link);

        if (canOpen) {
          await Linking.openURL(ground.reservation_link);
        } else {
          Alert.alert("오류", "예약 링크를 열 수 없습니다.");
        }
      } catch (error) {
        console.error("예약 링크 열기 오류:", error);
        Alert.alert("오류", "예약 링크를 여는데 실패했습니다.");
      }
    }
  };

  const handleEditGround = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    // 수정 취소 시 원래 값으로 복원
    if (ground) {
      setName(ground.name);
      setLocation(ground.location);
      setIsIndoor(ground.is_indoor || false);
      setReservationRequired(ground.reservation_required);
      setReservationMethod(ground.reservation_method || "");
      setReservationLink(ground.reservation_link || "");
      setPriceInfo(ground.price_info || "");
      setGroundTypeId(ground.f_jokgu_ground_type || null);
    }
    setIsEditing(false);
  };

  const handleSaveChanges = async () => {
    try {
      if (!name.trim()) {
        Alert.alert("입력 오류", "경기장 이름을 입력해주세요.");
        return;
      }

      if (!location.trim()) {
        Alert.alert("입력 오류", "경기장 위치를 입력해주세요.");
        return;
      }

      setIsSaving(true);

      const updateData: Partial<JokguGround> = {
        name: name.trim(),
        location: location.trim(),
        is_indoor: isIndoor,
        reservation_required: reservationRequired,
        reservation_method: reservationMethod.trim() || undefined,
        reservation_link: reservationLink.trim() || undefined,
        price_info: priceInfo.trim() || undefined,
        f_jokgu_ground_type: groundTypeId || undefined,
      };

      const updatedGround = await groundAPI.update(id!, updateData);
      setGround(updatedGround);

      // 업데이트된 타입 이름 설정
      if (updatedGround.f_jokgu_ground_type) {
        const type = groundTypes.find(
          (t) => t.id === updatedGround.f_jokgu_ground_type
        );
        if (type) {
          setGroundTypeName(type.type_name);
        } else {
          setGroundTypeName("");
        }
      } else {
        setGroundTypeName("");
      }

      setIsEditing(false);

      Alert.alert("완료", "경기장 정보가 수정되었습니다.");
    } catch (error) {
      console.error("경기장 정보 수정 중 오류 발생:", error);
      Alert.alert("오류", "경기장 정보 수정에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteGround = () => {
    Alert.alert(
      "경기장 삭제",
      "정말로 이 경기장을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.",
      [
        {
          text: "취소",
          style: "cancel",
        },
        {
          text: "삭제",
          style: "destructive",
          onPress: async () => {
            try {
              setIsDeleting(true);
              await groundAPI.delete(id!);
              Alert.alert("삭제 완료", "경기장이 삭제되었습니다.", [
                {
                  text: "확인",
                  onPress: () => router.push("/(tabs)/grounds"),
                },
              ]);
            } catch (error) {
              console.error("경기장 삭제 중 오류 발생:", error);
              Alert.alert("오류", "경기장 삭제에 실패했습니다.");
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleGoBack = () => {
    router.push("/(tabs)/grounds");
  };

  const renderEditForm = () => {
    return (
      <Section
        style={{
          marginBottom: 16,
          backgroundColor: isDarkmode ? themeColor.dark : themeColor.white,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: isDarkmode ? themeColor.dark200 : themeColor.gray200,
          padding: 16,
        }}
      >
        <Text
          style={{
            marginBottom: 4,
            fontWeight: "bold",
            color: isDarkmode ? themeColor.gray300 : themeColor.gray500,
          }}
        >
          경기장 이름*
        </Text>
        <TextInput
          containerStyle={{ marginBottom: 16 }}
          placeholder="경기장 이름"
          value={name}
          onChangeText={setName}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text
          style={{
            marginBottom: 4,
            fontWeight: "bold",
            color: isDarkmode ? themeColor.gray300 : themeColor.gray500,
          }}
        >
          위치*
        </Text>
        <TextInput
          containerStyle={{ marginBottom: 16 }}
          placeholder="경기장 위치"
          value={location}
          onChangeText={setLocation}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <Text
            style={{
              fontWeight: "bold",
              color: isDarkmode ? themeColor.gray300 : themeColor.gray500,
            }}
          >
            실내 시설
          </Text>
          <Switch
            value={isIndoor}
            onValueChange={setIsIndoor}
            trackColor={{ false: "#767577", true: themeColor.primary }}
            thumbColor={isIndoor ? "#fff" : "#f4f3f4"}
          />
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <Text
            style={{
              fontWeight: "bold",
              color: isDarkmode ? themeColor.gray300 : themeColor.gray500,
            }}
          >
            예약 필요
          </Text>
          <Switch
            value={reservationRequired}
            onValueChange={setReservationRequired}
            trackColor={{ false: "#767577", true: themeColor.primary }}
            thumbColor={reservationRequired ? "#fff" : "#f4f3f4"}
          />
        </View>

        {reservationRequired && (
          <>
            <Text
              style={{
                marginBottom: 4,
                fontWeight: "bold",
                color: isDarkmode ? themeColor.gray300 : themeColor.gray500,
              }}
            >
              예약 방법
            </Text>
            <TextInput
              containerStyle={{ marginBottom: 16 }}
              placeholder="예약 방법을 입력하세요"
              value={reservationMethod}
              onChangeText={setReservationMethod}
              multiline
              textAlignVertical="top"
              numberOfLines={3}
            />

            <Text
              style={{
                marginBottom: 4,
                fontWeight: "bold",
                color: isDarkmode ? themeColor.gray300 : themeColor.gray500,
              }}
            >
              예약 링크
            </Text>
            <TextInput
              containerStyle={{ marginBottom: 16 }}
              placeholder="예약 웹페이지 주소"
              value={reservationLink}
              onChangeText={setReservationLink}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </>
        )}

        <Text
          style={{
            marginBottom: 4,
            fontWeight: "bold",
            color: isDarkmode ? themeColor.gray300 : themeColor.gray500,
          }}
        >
          가격 정보
        </Text>
        <TextInput
          containerStyle={{ marginBottom: 8 }}
          placeholder="가격 정보를 입력하세요"
          value={priceInfo}
          onChangeText={setPriceInfo}
          multiline
          textAlignVertical="top"
          numberOfLines={3}
        />

        {groundTypes.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            <Text
              style={{
                marginBottom: 4,
                fontWeight: "bold",
                color: isDarkmode ? themeColor.gray300 : themeColor.gray500,
              }}
            >
              족구장 타입
            </Text>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                marginTop: 8,
              }}
            >
              {groundTypes.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 16,
                    backgroundColor:
                      groundTypeId === type.id
                        ? isDarkmode
                          ? themeColor.primary700
                          : themeColor.primary
                        : isDarkmode
                        ? themeColor.dark200
                        : themeColor.gray200,
                    marginRight: 8,
                    marginBottom: 8,
                  }}
                  onPress={() => setGroundTypeId(type.id)}
                >
                  <Text
                    size="sm"
                    style={{
                      color:
                        groundTypeId === type.id
                          ? "white"
                          : isDarkmode
                          ? themeColor.gray300
                          : themeColor.gray500,
                    }}
                  >
                    {type.type_name}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 16,
                  backgroundColor:
                    groundTypeId === null
                      ? isDarkmode
                        ? themeColor.primary700
                        : themeColor.primary
                      : isDarkmode
                      ? themeColor.dark200
                      : themeColor.gray200,
                  marginRight: 8,
                  marginBottom: 8,
                }}
                onPress={() => setGroundTypeId(null)}
              >
                <Text
                  size="sm"
                  style={{
                    color:
                      groundTypeId === null
                        ? "white"
                        : isDarkmode
                        ? themeColor.gray300
                        : themeColor.gray500,
                  }}
                >
                  없음
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginTop: 16,
          }}
        >
          <Button
            status="danger"
            text="취소"
            onPress={handleCancelEdit}
            style={{ flex: 1, marginRight: 8 }}
            outline
            disabled={isSaving}
          />
          <Button
            status="primary"
            text="저장"
            onPress={handleSaveChanges}
            style={{ flex: 1 }}
            disabled={isSaving}
          />
        </View>
      </Section>
    );
  };

  const renderDetailView = () => {
    if (!ground) return null;

    return (
      <>
        <Section
          style={{
            marginBottom: 16,
            padding: 16,
            borderRadius: 16,
            backgroundColor: isDarkmode ? themeColor.dark : themeColor.white,
            borderWidth: 1,
            borderColor: isDarkmode ? themeColor.dark200 : themeColor.gray200,
          }}
        >
          <Text
            fontWeight="bold"
            size="h2"
            style={{
              marginBottom: 8,
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
              alignSelf: "flex-start",
              marginBottom: 16,
            }}
          >
            <Text
              size="sm"
              style={{
                color: ground.reservation_required ? "#f43f5e" : "#22c55e",
                fontWeight: "bold",
              }}
            >
              {ground.reservation_required ? "예약필수" : "예약불필요"}
            </Text>
          </View>

          <View style={{ marginBottom: 16 }}>
            <Text
              size="sm"
              style={{
                marginBottom: 4,
                color: isDarkmode ? themeColor.gray300 : themeColor.gray500,
                fontWeight: "bold",
              }}
            >
              위치
            </Text>
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
                color={isDarkmode ? themeColor.gray400 : themeColor.gray500}
                style={{ marginRight: 4 }}
              />
              <Text
                style={{
                  flex: 1,
                  color: isDarkmode ? themeColor.white : themeColor.black,
                }}
              >
                {ground.location}
              </Text>
            </View>
            <View
              style={{
                flexDirection: "row",
                marginTop: 8,
              }}
            >
              <Button
                text="공유하기"
                onPress={handleShareAddress}
                leftContent={
                  <Ionicons name="share-outline" size={16} color="white" />
                }
                style={{ marginRight: 8, flex: 1 }}
                outline
                size="sm"
              />
              <Button
                text="지도에서 보기"
                onPress={handleOpenMap}
                leftContent={
                  <Ionicons name="map-outline" size={16} color="white" />
                }
                style={{ flex: 1 }}
                size="sm"
              />
            </View>
          </View>

          {ground.is_indoor !== undefined && (
            <View style={{ marginBottom: 16 }}>
              <Text
                size="sm"
                style={{
                  marginBottom: 4,
                  color: isDarkmode ? themeColor.gray300 : themeColor.gray500,
                  fontWeight: "bold",
                }}
              >
                시설 유형
              </Text>
              <Text
                style={{
                  color: isDarkmode ? themeColor.white : themeColor.black,
                }}
              >
                {ground.is_indoor ? "실내" : "실외"}
              </Text>
            </View>
          )}

          {groundTypeName && (
            <View style={{ marginBottom: 16 }}>
              <Text
                size="sm"
                style={{
                  marginBottom: 4,
                  color: isDarkmode ? themeColor.gray300 : themeColor.gray500,
                  fontWeight: "bold",
                }}
              >
                코트 타입
              </Text>
              <Text
                style={{
                  color: isDarkmode ? themeColor.white : themeColor.black,
                }}
              >
                {groundTypeName}
              </Text>
            </View>
          )}

          {ground.price_info && (
            <View style={{ marginBottom: 16 }}>
              <Text
                size="sm"
                style={{
                  marginBottom: 4,
                  color: isDarkmode ? themeColor.gray300 : themeColor.gray500,
                  fontWeight: "bold",
                }}
              >
                가격 정보
              </Text>
              <Text
                style={{
                  color: isDarkmode ? themeColor.white : themeColor.black,
                }}
              >
                {ground.price_info}
              </Text>
            </View>
          )}

          {ground.reservation_required && (
            <View style={{ marginBottom: 16 }}>
              <Text
                size="sm"
                style={{
                  marginBottom: 4,
                  color: isDarkmode ? themeColor.gray300 : themeColor.gray500,
                  fontWeight: "bold",
                }}
              >
                예약 방법
              </Text>
              <Text
                style={{
                  color: isDarkmode ? themeColor.white : themeColor.black,
                  marginBottom: 8,
                }}
              >
                {ground.reservation_method || "정보 없음"}
              </Text>

              {ground.reservation_link && (
                <Button
                  text="예약 페이지로 이동"
                  onPress={handleOpenReservationLink}
                  leftContent={
                    <Ionicons name="open-outline" size={16} color="white" />
                  }
                  style={{ alignSelf: "flex-start" }}
                  size="sm"
                />
              )}
            </View>
          )}
        </Section>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginTop: 16,
            marginBottom: 16,
          }}
        >
          <Button
            status="primary"
            text="수정하기"
            onPress={handleEditGround}
            style={{ flex: 1, marginRight: 8 }}
            outline
          />
          <Button
            status="danger"
            text="삭제하기"
            onPress={handleDeleteGround}
            style={{ flex: 1 }}
            outline
            disabled={isDeleting}
          />
        </View>

        <Button
          status="info"
          text="뒤로가기"
          onPress={handleGoBack}
          style={{ marginTop: 8 }}
          disabled={isDeleting}
        />
      </>
    );
  };

  return (
    <Layout>
      <TopNav
        leftContent={
          <Ionicons
            name="chevron-back"
            size={20}
            color={isDarkmode ? themeColor.white : themeColor.black}
          />
        }
        leftAction={() => {
          if (isEditing) {
            Alert.alert(
              "수정 취소",
              "변경 사항이 저장되지 않습니다. 취소하시겠습니까?",
              [
                {
                  text: "아니오",
                  style: "cancel",
                },
                {
                  text: "예",
                  onPress: () => {
                    handleCancelEdit();
                    handleGoBack();
                  },
                },
              ]
            );
          } else {
            handleGoBack();
          }
        }}
        middleContent={isEditing ? "경기장 수정" : "경기장 정보"}
        middleTextStyle={{
          fontSize: 20,
          fontWeight: "bold",
          color: isDarkmode ? themeColor.white : themeColor.black,
        }}
        backgroundColor={isDarkmode ? themeColor.dark : themeColor.white}
        borderColor={isDarkmode ? themeColor.dark200 : themeColor.gray200}
      />

      <ScrollView
        style={{
          flex: 1,
          backgroundColor: isDarkmode ? themeColor.dark100 : themeColor.gray100,
          padding: 16,
        }}
      >
        {loading ? (
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              padding: 20,
            }}
          >
            <Text>불러오는 중...</Text>
          </View>
        ) : ground ? (
          isEditing ? (
            renderEditForm()
          ) : (
            renderDetailView()
          )
        ) : (
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              padding: 20,
            }}
          >
            <Text>경기장 정보를 찾을 수 없습니다.</Text>
            <Button
              text="뒤로 가기"
              onPress={handleGoBack}
              style={{ marginTop: 16 }}
            />
          </View>
        )}
      </ScrollView>
    </Layout>
  );
}
