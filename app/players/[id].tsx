import { useEffect, useState } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Clipboard,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { playerAPI, bankAPI } from "../../lib/api";
import { Player, Bank } from "../../types";
import {
  Layout,
  Button,
  Section,
  Text,
  TopNav,
  useTheme,
  themeColor,
  TextInput,
} from "react-native-rapi-ui";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";

export default function PlayerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bank, setBank] = useState("");
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loadingBanks, setLoadingBanks] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const { isDarkmode } = useTheme();

  const fetchBanks = async () => {
    try {
      setLoadingBanks(true);
      const data = await bankAPI.getAll();
      setBanks(data);
    } catch (error) {
      console.error("은행 목록 조회 중 오류 발생:", error);
      Alert.alert("오류", "은행 목록을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoadingBanks(false);
    }
  };

  const fetchPlayer = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const data = await playerAPI.getById(id);
      setPlayer(data);

      // 초기값 설정
      if (data) {
        setName(data.name);
        setContact(data.contact || "");
        setBankAccount(data.bank_account || "");
        setBank(data.bank || "");
      }
    } catch (error) {
      console.error("플레이어 정보 조회 중 오류 발생:", error);
      Alert.alert("오류", "플레이어 정보를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanks();
    fetchPlayer();
  }, [id]);

  const handleCopy = (text: string, type: string) => {
    Clipboard.setString(text);
    Alert.alert("복사 완료", `${type}가 클립보드에 복사되었습니다.`);
  };

  const handleSave = async () => {
    if (!id) return;

    if (!name.trim()) {
      Alert.alert("오류", "이름을 입력해주세요.");
      return;
    }

    try {
      setSaving(true);
      await playerAPI.update(id, {
        name: name.trim(),
        contact: contact.trim() || undefined,
        bank_account: bankAccount.trim() || undefined,
        bank: bank || undefined,
      });

      setEditing(false);
      Alert.alert("수정 완료", "플레이어 정보가 수정되었습니다.");
      fetchPlayer();
    } catch (error) {
      console.error("플레이어 수정 중 오류 발생:", error);
      Alert.alert("오류", "플레이어 정보 수정 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (player) {
      setName(player.name);
      setContact(player.contact || "");
      setBankAccount(player.bank_account || "");
      setBank(player.bank || "");
    }
    setEditing(false);
  };

  if (loading) {
    return (
      <Layout>
        <TopNav
          middleContent="플레이어 정보"
          leftContent={
            <Ionicons
              name="chevron-back"
              size={20}
              color={isDarkmode ? themeColor.white : themeColor.black}
            />
          }
          leftAction={() => router.back()}
          backgroundColor={isDarkmode ? themeColor.dark : themeColor.white}
          borderColor={isDarkmode ? themeColor.dark200 : themeColor.gray200}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColor.primary} />
          <Text style={{ marginTop: 10 }}>불러오는 중...</Text>
        </View>
      </Layout>
    );
  }

  return (
    <Layout>
      <TopNav
        middleContent={editing ? "플레이어 수정" : "플레이어 정보"}
        middleTextStyle={{
          fontSize: 20,
          fontWeight: "bold",
          color: isDarkmode ? themeColor.white : themeColor.black,
        }}
        leftContent={
          <Ionicons
            name="chevron-back"
            size={20}
            color={isDarkmode ? themeColor.white : themeColor.black}
          />
        }
        leftAction={() => router.back()}
        rightContent={
          !editing && (
            <TouchableOpacity onPress={() => setEditing(true)}>
              <Ionicons
                name="create-outline"
                size={24}
                color={isDarkmode ? themeColor.white : themeColor.black}
              />
            </TouchableOpacity>
          )
        }
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
        <Section
          style={{
            backgroundColor: isDarkmode ? themeColor.dark : themeColor.white,
            padding: 16,
            borderRadius: 16,
            shadowColor: isDarkmode ? "#000" : "#888",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDarkmode ? 0.2 : 0.08,
            shadowRadius: 8,
            elevation: 3,
            borderWidth: 1,
            borderColor: isDarkmode ? themeColor.dark200 : themeColor.gray200,
          }}
        >
          {editing ? (
            // 편집 모드
            <View>
              <View style={styles.formGroup}>
                <Text
                  style={{
                    marginBottom: 8,
                    fontWeight: "bold",
                    color: isDarkmode ? themeColor.white : themeColor.black,
                  }}
                >
                  이름 *
                </Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="이름을 입력하세요"
                  containerStyle={{ marginBottom: 16 }}
                />
              </View>

              <View style={styles.formGroup}>
                <Text
                  style={{
                    marginBottom: 8,
                    fontWeight: "bold",
                    color: isDarkmode ? themeColor.white : themeColor.black,
                  }}
                >
                  연락처
                </Text>
                <TextInput
                  value={contact}
                  onChangeText={setContact}
                  placeholder="연락처를 입력하세요"
                  keyboardType="phone-pad"
                  containerStyle={{ marginBottom: 16 }}
                />
              </View>

              <View style={styles.formGroup}>
                <Text
                  style={{
                    marginBottom: 8,
                    fontWeight: "bold",
                    color: isDarkmode ? themeColor.white : themeColor.black,
                  }}
                >
                  은행
                </Text>
                <View
                  style={[
                    styles.input,
                    {
                      backgroundColor: isDarkmode
                        ? themeColor.dark200
                        : themeColor.white,
                      borderColor: isDarkmode
                        ? themeColor.dark200
                        : themeColor.gray300,
                      marginBottom: 16,
                      borderWidth: 1,
                      borderRadius: 8,
                      overflow: "hidden",
                      paddingHorizontal: 0,
                      paddingVertical: 0,
                    },
                  ]}
                >
                  <Picker
                    selectedValue={bank}
                    onValueChange={(itemValue: string) => setBank(itemValue)}
                    style={{
                      backgroundColor: "transparent",
                      color: isDarkmode ? themeColor.white : themeColor.black,
                    }}
                    enabled={!loadingBanks}
                  >
                    <Picker.Item label="은행을 선택하세요" value="" />
                    {banks.map((item) => (
                      <Picker.Item
                        key={item.bank}
                        label={item.bank}
                        value={item.bank}
                      />
                    ))}
                  </Picker>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text
                  style={{
                    marginBottom: 8,
                    fontWeight: "bold",
                    color: isDarkmode ? themeColor.white : themeColor.black,
                  }}
                >
                  계좌번호
                </Text>
                <TextInput
                  value={bankAccount}
                  onChangeText={setBankAccount}
                  placeholder="계좌번호를 입력하세요"
                  containerStyle={{ marginBottom: 24 }}
                />
              </View>

              <View style={styles.buttonContainer}>
                <Button
                  status="primary"
                  text={saving ? "저장 중..." : "저장하기"}
                  onPress={handleSave}
                  disabled={saving}
                  style={{ flex: 1, marginRight: 8 }}
                />
                <Button
                  status="danger"
                  text="취소"
                  onPress={handleCancel}
                  disabled={saving}
                  style={{ flex: 1, marginLeft: 8 }}
                  outline
                />
              </View>
            </View>
          ) : (
            // 조회 모드
            <View>
              <Text
                fontWeight="bold"
                size="h2"
                style={{
                  color: isDarkmode ? themeColor.white : themeColor.black,
                  marginBottom: 24,
                }}
              >
                {player?.name}
              </Text>

              {(player?.contact || player?.bank_account) && (
                <View style={styles.infoContainer}>
                  {player?.contact && (
                    <TouchableOpacity
                      style={styles.infoItem}
                      onPress={() => handleCopy(player.contact!, "연락처")}
                    >
                      <View style={styles.infoHeader}>
                        <Ionicons
                          name="call-outline"
                          size={18}
                          color={themeColor.primary}
                          style={{ marginRight: 8 }}
                        />
                        <Text
                          fontWeight="bold"
                          style={{
                            color: isDarkmode
                              ? themeColor.white
                              : themeColor.black,
                          }}
                        >
                          연락처
                        </Text>
                        <Ionicons
                          name="copy-outline"
                          size={16}
                          color={
                            isDarkmode ? themeColor.gray400 : themeColor.gray500
                          }
                          style={{ marginLeft: 8 }}
                        />
                      </View>
                      <Text
                        size="md"
                        style={{
                          color: isDarkmode
                            ? themeColor.gray300
                            : themeColor.gray500,
                          marginTop: 4,
                        }}
                      >
                        {player.contact}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {player?.bank_account && (
                    <TouchableOpacity
                      style={[
                        styles.infoItem,
                        player.contact ? { marginTop: 16 } : {},
                      ]}
                      onPress={() =>
                        handleCopy(
                          player.bank
                            ? `${player.bank} ${player.bank_account}`
                            : player.bank_account!,
                          "계좌번호"
                        )
                      }
                    >
                      <View style={styles.infoHeader}>
                        <Ionicons
                          name="card-outline"
                          size={18}
                          color={themeColor.primary}
                          style={{ marginRight: 8 }}
                        />
                        <Text
                          fontWeight="bold"
                          style={{
                            color: isDarkmode
                              ? themeColor.white
                              : themeColor.black,
                          }}
                        >
                          계좌번호
                        </Text>
                        <Ionicons
                          name="copy-outline"
                          size={16}
                          color={
                            isDarkmode ? themeColor.gray400 : themeColor.gray500
                          }
                          style={{ marginLeft: 8 }}
                        />
                      </View>
                      <Text
                        size="md"
                        style={{
                          color: isDarkmode
                            ? themeColor.gray300
                            : themeColor.gray500,
                          marginTop: 4,
                        }}
                      >
                        {player.bank
                          ? `${player.bank} ${player.bank_account}`
                          : player.bank_account}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {!player?.contact && !player?.bank_account && (
                <View style={styles.emptyInfo}>
                  <Ionicons
                    name="information-circle-outline"
                    size={24}
                    color={isDarkmode ? themeColor.gray400 : themeColor.gray500}
                  />
                  <Text
                    style={{
                      color: isDarkmode
                        ? themeColor.gray400
                        : themeColor.gray500,
                      marginLeft: 8,
                    }}
                  >
                    추가 정보가 없습니다.
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.editButton}
                onPress={() => setEditing(true)}
              >
                <Ionicons
                  name="create-outline"
                  size={18}
                  color={themeColor.white}
                  style={{ marginRight: 8 }}
                />
                <Text style={{ color: themeColor.white, fontWeight: "bold" }}>
                  정보 수정하기
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </Section>
      </ScrollView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  formGroup: {
    marginBottom: 8,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  infoContainer: {
    marginTop: 8,
  },
  infoItem: {
    padding: 16,
    backgroundColor: "rgba(0, 0, 0, 0.03)",
    borderRadius: 8,
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  emptyInfo: {
    padding: 16,
    backgroundColor: "rgba(0, 0, 0, 0.03)",
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: themeColor.primary,
    padding: 12,
    borderRadius: 8,
    marginTop: 24,
  },
  input: {
    padding: 12,
    borderRadius: 8,
  },
});
