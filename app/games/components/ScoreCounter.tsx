import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { GameTeam, Player } from "../../../types";

interface ScoreCounterProps {
  team: GameTeam;
  members: Player[];
  score: number;
  onIncrement: (teamId: string) => void;
  onDecrement: (teamId: string) => void;
  isDeuce?: boolean;
  isWinner?: boolean;
  isFinalWinner?: boolean;
}

export default function ScoreCounter({
  team,
  members,
  score,
  onIncrement,
  onDecrement,
  isDeuce = false,
  isWinner = false,
  isFinalWinner = false,
}: ScoreCounterProps) {
  // 팀 색상 (없으면 기본 색상 사용)
  const teamColor = team.team_color || "#6c757d";

  return (
    <View
      style={[
        styles.teamScoreContainer,
        { borderLeftWidth: 4, borderLeftColor: teamColor },
      ]}
    >
      <View style={styles.teamInfo}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={[styles.teamName, { color: teamColor }]}>
            {team.team_name || `팀 ${team.id.substring(0, 4)}`}
          </Text>
          {isFinalWinner && (
            <View style={styles.finalWinnerBadge}>
              <Text style={styles.finalWinnerText}>최종 승리</Text>
            </View>
          )}
          {!isFinalWinner && isWinner && (
            <View style={styles.winnerBadge}>
              <Text style={styles.winnerText}>승리</Text>
            </View>
          )}
        </View>
        <Text style={styles.teamMemberCount}>{members.length}명</Text>
      </View>

      <View
        style={[
          styles.scoreControls,
          {
            borderColor: teamColor,
            borderWidth: 1,
            backgroundColor: `${teamColor}10`,
          },
          isWinner && styles.winnerScoreControls,
        ]}
      >
        <TouchableOpacity
          style={styles.scoreButton}
          onPress={() => onDecrement(team.id)}
        >
          <FontAwesome name="minus" size={18} color="#dc3545" />
        </TouchableOpacity>

        <Text style={[styles.scoreText, { color: teamColor }]}>{score}</Text>

        <TouchableOpacity
          style={styles.scoreButton}
          onPress={() => onIncrement(team.id)}
        >
          <FontAwesome name="plus" size={18} color="#28a745" />
        </TouchableOpacity>
      </View>

      {members.length > 0 && (
        <View style={styles.membersList}>
          {members.map((member) => (
            <View key={member.id} style={styles.memberItem}>
              <Text style={styles.memberName}>{member.name}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  teamScoreContainer: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  teamInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  teamName: {
    fontSize: 18,
    fontWeight: "600",
  },
  teamMemberCount: {
    fontSize: 14,
    color: "#6c757d",
  },
  scoreControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 12,
  },
  scoreButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  scoreText: {
    fontSize: 32,
    fontWeight: "bold",
  },
  membersList: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 12,
    gap: 8,
  },
  memberItem: {
    backgroundColor: "#f1f3f5",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  memberName: {
    fontSize: 12,
  },
  winnerBadge: {
    backgroundColor: "#28a745",
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  winnerText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "white",
  },
  winnerScoreControls: {
    backgroundColor: "#28a74510",
  },
  finalWinnerBadge: {
    backgroundColor: "#ffc107",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  finalWinnerText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#212529",
  },
});
