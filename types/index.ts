export interface Player {
  id: string;
  name: string;
  contact?: string;
}

export interface Meeting {
  id: string;
  meeting_date: string;
  start_time: string;
  end_time?: string;
  location?: string;
}

export interface MeetingMember {
  meeting_id: string;
  player_id: string;
}

export interface Game {
  id: string;
  meeting_id?: string;
  num_of_sets: number;
  winning_score: number;
  penalty_details?: string;
}

export interface GameTeam {
  id: string;
  game_id: string;
  team_name?: string;
}

export interface GameTeamMember {
  game_team_id: string;
  player_id: string;
}

export interface GameSet {
  id: string;
  game_id: string;
  set_number: number;
  target_score: number;
}

export interface GameSetScore {
  id: string;
  game_set_id: string;
  game_team_id: string;
  score: number;
}

export interface ScoreLog {
  id: string;
  game_id: string;
  game_team_id: string;
  event_timestamp: string;
  event_details?: string;
}

export interface JokguGround {
  id: string;
  name: string;
  location: string;
  reservation_required: boolean;
  reservation_method?: string;
  price_info?: string;
}
