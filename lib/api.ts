import {
  Bank,
  Game,
  GameSet,
  GameSetScore,
  GameTeam,
  JokguGround,
  JokguGroundType,
  Meeting,
  Player,
  Position,
  ScoreLog,
} from "../types";
import { eventEmitter, EventTypes } from "./eventEmitter";
import { supabase } from "./supabase";

// Player API
export const playerAPI = {
  // 모든 플레이어 조회
  getAll: async (): Promise<Player[]> => {
    const { data, error } = await supabase
      .from("player")
      .select("*")
      .order("name");

    if (error) throw error;
    return data || [];
  },

  // 특정 플레이어 조회
  getById: async (id: string): Promise<Player | null> => {
    const { data, error } = await supabase
      .from("player")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  },

  // 플레이어 생성
  create: async (player: Omit<Player, "id">): Promise<Player> => {
    const { data, error } = await supabase
      .from("player")
      .insert([player])
      .select()
      .single();

    if (error) throw error;

    // 이벤트 발생
    eventEmitter.emit(EventTypes.PLAYER_CHANGED);

    return data;
  },

  // 플레이어 수정
  update: async (
    id: string,
    player: Partial<Omit<Player, "id">>
  ): Promise<Player> => {
    const { data, error } = await supabase
      .from("player")
      .update(player)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    // 이벤트 발생
    eventEmitter.emit(EventTypes.PLAYER_CHANGED);

    return data;
  },

  // 플레이어 삭제
  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from("player").delete().eq("id", id);

    if (error) throw error;

    // 이벤트 발생
    eventEmitter.emit(EventTypes.PLAYER_CHANGED);
  },
};

// Meeting API
export const meetingAPI = {
  // 모든 모임 조회
  getAll: async (): Promise<Meeting[]> => {
    const { data, error } = await supabase
      .from("meeting")
      .select("*")
      .order("meeting_date", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // 특정 모임 조회
  getById: async (id: string): Promise<Meeting | null> => {
    const { data, error } = await supabase
      .from("meeting")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  },

  // 모임 참여자 조회
  getMembers: async (meetingId: string): Promise<Player[]> => {
    interface PlayerResponse {
      player: Player;
    }

    const { data, error } = await supabase
      .from("meeting_member")
      .select(
        `
        player:player_id(id, name, contact)
      `
      )
      .eq("meeting_id", meetingId);

    if (error) throw error;
    return ((data as PlayerResponse[]) || []).map((item) => item.player);
  },

  // 모임 생성
  create: async (meeting: Omit<Meeting, "id">): Promise<Meeting> => {
    const { data, error } = await supabase
      .from("meeting")
      .insert([meeting])
      .select()
      .single();

    if (error) throw error;

    // 이벤트 발생
    eventEmitter.emit(EventTypes.MEETING_CHANGED);

    return data;
  },

  // 모임 수정
  update: async (
    id: string,
    meeting: Partial<Omit<Meeting, "id">>
  ): Promise<Meeting> => {
    const { data, error } = await supabase
      .from("meeting")
      .update(meeting)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    // 이벤트 발생
    eventEmitter.emit(EventTypes.MEETING_CHANGED);

    return data;
  },

  // 모임 삭제
  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from("meeting").delete().eq("id", id);

    if (error) throw error;

    // 이벤트 발생
    eventEmitter.emit(EventTypes.MEETING_CHANGED);
  },

  // 모임 참여자 추가
  addMember: async (meetingId: string, playerId: string): Promise<void> => {
    const { error } = await supabase
      .from("meeting_member")
      .insert([{ meeting_id: meetingId, player_id: playerId }]);

    if (error) throw error;

    // 이벤트 발생
    eventEmitter.emit(EventTypes.MEETING_MEMBERS_CHANGED, meetingId);
  },

  // 모임 참여자 삭제
  removeMember: async (meetingId: string, playerId: string): Promise<void> => {
    const { error } = await supabase
      .from("meeting_member")
      .delete()
      .eq("meeting_id", meetingId)
      .eq("player_id", playerId);

    if (error) throw error;

    // 이벤트 발생
    eventEmitter.emit(EventTypes.MEETING_MEMBERS_CHANGED, meetingId);
  },
};

// Game API
export const gameAPI = {
  // 모든 게임 조회
  getAll: async (): Promise<Game[]> => {
    const { data, error } = await supabase.from("game").select("*");

    if (error) throw error;
    return data || [];
  },

  // 특정 게임 조회
  getById: async (id: string): Promise<Game | null> => {
    const { data, error } = await supabase
      .from("game")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  },

  // 모임에 속한 게임 조회
  getByMeetingId: async (meetingId: string): Promise<Game[]> => {
    const { data, error } = await supabase
      .from("game")
      .select("*")
      .eq("meeting_id", meetingId);

    if (error) throw error;
    return data || [];
  },

  // 게임 생성
  create: async (game: Omit<Game, "id">): Promise<Game> => {
    const { data, error } = await supabase
      .from("game")
      .insert([game])
      .select()
      .single();

    if (error) throw error;

    // 이벤트 발생
    eventEmitter.emit(EventTypes.GAME_CHANGED);
    if (game.meeting_id) {
      eventEmitter.emit(EventTypes.MEETING_CHANGED);
    }

    return data;
  },

  // 게임 수정
  update: async (
    id: string,
    game: Partial<Omit<Game, "id">>
  ): Promise<Game> => {
    const { data, error } = await supabase
      .from("game")
      .update(game)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    // 이벤트 발생
    eventEmitter.emit(EventTypes.GAME_CHANGED);

    return data;
  },

  // 게임 삭제
  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from("game").delete().eq("id", id);

    if (error) throw error;

    // 이벤트 발생
    eventEmitter.emit(EventTypes.GAME_CHANGED);
  },

  // 게임 팀 생성
  createTeam: async (gameTeam: Omit<GameTeam, "id">): Promise<GameTeam> => {
    const { data, error } = await supabase
      .from("game_team")
      .insert([gameTeam])
      .select()
      .single();

    if (error) throw error;

    // 이벤트 발생 - 게임 데이터 변경
    eventEmitter.emit(EventTypes.GAME_CHANGED);

    return data;
  },

  // 게임 팀 조회
  getTeams: async (gameId: string): Promise<GameTeam[]> => {
    const { data, error } = await supabase
      .from("game_team")
      .select("*")
      .eq("game_id", gameId);

    if (error) throw error;
    return data || [];
  },

  // 게임 팀에 플레이어 추가
  addTeamMember: async (teamId: string, playerId: string): Promise<void> => {
    const { error } = await supabase
      .from("game_team_member")
      .insert([{ game_team_id: teamId, player_id: playerId }]);

    if (error) throw error;
  },

  // 게임 세트 생성
  createSet: async (gameSet: Omit<GameSet, "id">): Promise<GameSet> => {
    const { data, error } = await supabase
      .from("game_set")
      .insert([gameSet])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // 게임 세트 조회
  getSets: async (gameId: string): Promise<GameSet[]> => {
    const { data, error } = await supabase
      .from("game_set")
      .select("*")
      .eq("game_id", gameId)
      .order("set_number");

    if (error) throw error;
    return data || [];
  },

  // 세트 점수 기록
  recordSetScore: async (
    setScore: Omit<GameSetScore, "id">
  ): Promise<GameSetScore> => {
    const { data, error } = await supabase
      .from("game_set_score")
      .insert([setScore])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // 세트 점수 업데이트
  updateSetScore: async (id: string, score: number): Promise<GameSetScore> => {
    const { data, error } = await supabase
      .from("game_set_score")
      .update({ score })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // 득점 로그 기록
  logScore: async (scoreLog: Omit<ScoreLog, "id">): Promise<ScoreLog> => {
    const { data, error } = await supabase
      .from("score_log")
      .insert([scoreLog])
      .select()
      .single();

    if (error) throw error;

    // 이벤트 발생
    eventEmitter.emit(EventTypes.GAME_CHANGED);

    return data;
  },
};

// 경기장 API
export const groundAPI = {
  // 모든 경기장 조회
  getAll: async (): Promise<JokguGround[]> => {
    const { data, error } = await supabase
      .from("jokgu_ground")
      .select("*")
      .order("name");

    if (error) throw error;
    return data || [];
  },

  // 특정 경기장 조회
  getById: async (id: string): Promise<JokguGround | null> => {
    const { data, error } = await supabase
      .from("jokgu_ground")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  },

  // 경기장 생성
  create: async (ground: Omit<JokguGround, "id">): Promise<JokguGround> => {
    const { data, error } = await supabase
      .from("jokgu_ground")
      .insert([ground])
      .select()
      .single();

    if (error) throw error;

    // 이벤트 발생
    eventEmitter.emit(EventTypes.GROUND_CHANGED);

    return data;
  },

  // 경기장 수정
  update: async (
    id: string,
    ground: Partial<Omit<JokguGround, "id">>
  ): Promise<JokguGround> => {
    const { data, error } = await supabase
      .from("jokgu_ground")
      .update(ground)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    // 이벤트 발생
    eventEmitter.emit(EventTypes.GROUND_CHANGED);

    return data;
  },

  // 경기장 삭제
  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from("jokgu_ground").delete().eq("id", id);

    if (error) throw error;

    // 이벤트 발생
    eventEmitter.emit(EventTypes.GROUND_CHANGED);
  },
};

// 은행 API
export const bankAPI = {
  // 모든 은행 조회
  getAll: async (): Promise<Bank[]> => {
    const { data, error } = await supabase
      .from("bank")
      .select("*")
      .order("bank");

    if (error) throw error;
    return data || [];
  },
};

export const jokguGroundTypeAPI = {
  // 모든 경기장 타입 조회
  getAll: async (): Promise<JokguGroundType[]> => {
    const { data, error } = await supabase
      .from("jokgu_ground_type")
      .select("*")
      .order("type_name");

    if (error) throw error;
    return data || [];
  },
};

export const positionAPI = {
  // 모든 포지션 조회
  getAll: async (): Promise<Position[]> => {
    const { data, error } = await supabase
      .from("position")
      .select("*")
      .order("position_name");

    if (error) throw error;
    return data || [];
  },
};
