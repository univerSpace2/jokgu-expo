import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import "react-native-url-polyfill/auto";

// 환경 변수에서 값을 가져오거나 기본값 사용
// 실제 사용 시에는 .env.local 파일을 생성하고 실제 값을 넣어야 함
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase 환경 변수가 설정되지 않았습니다.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// 데이터베이스 타입 정의
export type Database = {
  public: {
    Tables: {
      player: {
        Row: {
          id: string;
          name: string;
          contact: string | null;
          bank_account: string | null;
          bank: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          contact?: string | null;
          bank_account?: string | null;
          bank?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          contact?: string | null;
          bank_account?: string | null;
          bank?: string | null;
        };
      };
      meeting: {
        Row: {
          id: string;
          meeting_date: string;
          start_time: string;
          end_time: string | null;
          location: string | null;
        };
        Insert: {
          id?: string;
          meeting_date: string;
          start_time: string;
          end_time?: string | null;
          location?: string | null;
        };
        Update: {
          id?: string;
          meeting_date?: string;
          start_time?: string;
          end_time?: string | null;
          location?: string | null;
        };
      };
      meeting_member: {
        Row: {
          meeting_id: string;
          player_id: string;
        };
        Insert: {
          meeting_id: string;
          player_id: string;
        };
        Update: {
          meeting_id?: string;
          player_id?: string;
        };
      };
      game: {
        Row: {
          id: string;
          meeting_id: string | null;
          num_of_sets: number;
          winning_score: number;
          wins_required: number;
          use_deuce: boolean;
          penalty_details: string | null;
        };
        Insert: {
          id?: string;
          meeting_id?: string | null;
          num_of_sets: number;
          winning_score: number;
          wins_required?: number;
          use_deuce?: boolean;
          penalty_details?: string | null;
        };
        Update: {
          id?: string;
          meeting_id?: string | null;
          num_of_sets?: number;
          winning_score?: number;
          wins_required?: number;
          use_deuce?: boolean;
          penalty_details?: string | null;
        };
      };
      game_team: {
        Row: {
          id: string;
          game_id: string;
          team_name: string | null;
          team_color: string | null;
        };
        Insert: {
          id?: string;
          game_id: string;
          team_name?: string | null;
          team_color?: string | null;
        };
        Update: {
          id?: string;
          game_id?: string;
          team_name?: string | null;
          team_color?: string | null;
        };
      };
      game_team_member: {
        Row: {
          game_team_id: string;
          player_id: string;
        };
        Insert: {
          game_team_id: string;
          player_id: string;
        };
        Update: {
          game_team_id?: string;
          player_id?: string;
        };
      };
      game_set: {
        Row: {
          id: string;
          game_id: string;
          set_number: number;
          target_score: number;
        };
        Insert: {
          id?: string;
          game_id: string;
          set_number: number;
          target_score: number;
        };
        Update: {
          id?: string;
          game_id?: string;
          set_number?: number;
          target_score?: number;
        };
      };
      game_set_score: {
        Row: {
          id: string;
          game_set_id: string;
          game_team_id: string;
          score: number;
        };
        Insert: {
          id?: string;
          game_set_id: string;
          game_team_id: string;
          score: number;
        };
        Update: {
          id?: string;
          game_set_id?: string;
          game_team_id?: string;
          score?: number;
        };
      };
      score_log: {
        Row: {
          id: string;
          game_id: string;
          game_team_id: string;
          game_set_id: string | null;
          event_timestamp: string;
          event_details: string | null;
        };
        Insert: {
          id?: string;
          game_id: string;
          game_team_id: string;
          game_set_id?: string | null;
          event_timestamp?: string;
          event_details?: string | null;
        };
        Update: {
          id?: string;
          game_id?: string;
          game_team_id?: string;
          game_set_id?: string | null;
          event_timestamp?: string;
          event_details?: string | null;
        };
      };
      jokgu_ground: {
        Row: {
          id: string;
          name: string;
          location: string;
          reservation_required: boolean;
          reservation_method: string | null;
          price_info: string | null;
          f_jokgu_ground_type: string | null;
          reservation_link: string | null;
          is_indoor: boolean | null;
        };
        Insert: {
          id?: string;
          name: string;
          location: string;
          reservation_required: boolean;
          reservation_method?: string | null;
          price_info?: string | null;
          f_jokgu_ground_type?: string | null;
          reservation_link?: string | null;
          is_indoor?: boolean | null;
        };
        Update: {
          id?: string;
          name?: string;
          location?: string;
          reservation_required?: boolean;
          reservation_method?: string | null;
          price_info?: string | null;
          f_jokgu_ground_type?: string | null;
          reservation_link?: string | null;
          is_indoor?: boolean | null;
        };
      };
      jokgu_ground_type: {
        Row: {
          id: string;
          type_name: string;
          created_at: string;
        };
        Insert: {
          type_name: string;
        };
        Update: {
          type_name?: string;
        };
      };
      bank: {
        Row: {
          bank: string;
        };
        Insert: {
          bank: string;
        };
        Update: {
          name?: string;
        };
      };
    };
  };
};
