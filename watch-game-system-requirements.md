# 워치용 게임 시스템 요구사항

## 1. 개요

이 문서는 워치에서 게임 세트 시작, 점수 기록, 세트 종료, 게임 종료 기능 구현을 위한 요구사항을 정의합니다. 해당 기능은 실시간으로 득점 기록과 듀스 처리, 세트 전환, 게임 종료 처리를 포함합니다.

## 2. 데이터 모델 확장

현재 Supabase 데이터베이스 모델에 다음 필드를 추가해야 합니다:

### 2.1. GameSet 테이블 확장

```typescript
interface GameSet {
  // 기존 필드
  id: string;
  game_id: string;
  set_number: number;
  target_score: number;

  // 추가 필드
  is_active: boolean; // 현재 활성화된 세트인지 여부
  is_completed: boolean; // 세트가 완료되었는지 여부
  winning_team_id?: string; // 세트 승리 팀 ID
  completed_at?: string; // 세트 종료 시간
}
```

### 2.2. Game 테이블 확장

```typescript
interface Game {
  // 기존 필드
  id: string;
  meeting_id?: string;
  num_of_sets: number;
  winning_score: number;
  penalty_details?: string;
  use_deuce?: boolean;
  wins_required?: number;

  // 추가 필드
  is_active: boolean; // 게임이 진행 중인지 여부
  is_completed: boolean; // 게임이 완료되었는지 여부
  current_set_id?: string; // 현재 진행 중인 세트 ID
  winning_team_id?: string; // 게임 최종 승리 팀 ID
  completed_at?: string; // 게임 종료 시간
}
```

### 2.3. GameTeam 테이블 확장

```typescript
interface GameTeam {
  // 기존 필드
  id: string;
  game_id: string;
  team_name?: string;
  team_color?: string;

  // 추가 필드
  sets_won: number; // 승리한 세트 수
}
```

## 3. API 확장

Supabase API를 다음과 같이 확장해야 합니다:

### 3.1. 게임 API 확장

```typescript
export const gameAPI = {
  // 기존 API 메소드들...

  // 게임 상태 업데이트
  updateGameStatus: async (
    gameId: string,
    status: {
      is_active?: boolean;
      is_completed?: boolean;
      current_set_id?: string;
      winning_team_id?: string;
      completed_at?: string;
    }
  ): Promise<Game> => {
    const { data, error } = await supabase
      .from("game")
      .update(status)
      .eq("id", gameId)
      .select()
      .single();

    if (error) throw error;

    // 이벤트 발생
    eventEmitter.emit(EventTypes.GAME_STATUS_CHANGED, gameId);

    return data;
  },

  // 팀 세트 승리 업데이트
  updateTeamWins: async (
    teamId: string,
    setsWon: number
  ): Promise<GameTeam> => {
    const { data, error } = await supabase
      .from("game_team")
      .update({ sets_won: setsWon })
      .eq("id", teamId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // 게임 최종 결과 기록
  recordGameResult: async (
    gameId: string,
    winningTeamId: string
  ): Promise<Game> => {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("game")
      .update({
        is_active: false,
        is_completed: true,
        winning_team_id: winningTeamId,
        completed_at: now,
      })
      .eq("id", gameId)
      .select()
      .single();

    if (error) throw error;

    // 이벤트 발생
    eventEmitter.emit(EventTypes.GAME_COMPLETED, gameId);

    return data;
  },
};
```

### 3.2. 세트 API 확장

```typescript
export const gameSetAPI = {
  // 기존 메소드들 유지...

  // 세트 시작
  startSet: async (gameId: string, setNumber: number): Promise<GameSet> => {
    const gameSet = {
      game_id: gameId,
      set_number: setNumber,
      target_score: 0, // 게임에서 타겟 점수 가져와서 설정
      is_active: true,
      is_completed: false,
    };

    const { data: game, error: gameError } = await supabase
      .from("game")
      .select("winning_score, use_deuce")
      .eq("id", gameId)
      .single();

    if (gameError) throw gameError;

    gameSet.target_score = game.winning_score;

    const { data, error } = await supabase
      .from("game_set")
      .insert([gameSet])
      .select()
      .single();

    if (error) throw error;

    // 현재 세트를 게임에 업데이트
    await supabase
      .from("game")
      .update({ current_set_id: data.id, is_active: true })
      .eq("id", gameId);

    // 이벤트 발생
    eventEmitter.emit(EventTypes.SET_STARTED, data.id);

    return data;
  },

  // 세트 상태 업데이트
  updateSetStatus: async (
    setId: string,
    status: {
      is_active?: boolean;
      is_completed?: boolean;
      winning_team_id?: string;
      completed_at?: string;
    }
  ): Promise<GameSet> => {
    const { data, error } = await supabase
      .from("game_set")
      .update(status)
      .eq("id", setId)
      .select()
      .single();

    if (error) throw error;

    // 이벤트 발생
    eventEmitter.emit(EventTypes.SET_STATUS_CHANGED, setId);

    return data;
  },

  // 세트 완료 처리
  completeSet: async (
    setId: string,
    winningTeamId: string
  ): Promise<{ set: GameSet; team: GameTeam }> => {
    const now = new Date().toISOString();

    // 세트 정보 업데이트
    const { data: setData, error: setError } = await supabase
      .from("game_set")
      .update({
        is_active: false,
        is_completed: true,
        winning_team_id: winningTeamId,
        completed_at: now,
      })
      .eq("id", setId)
      .select("*, game_id")
      .single();

    if (setError) throw setError;

    // 팀 승리 세트 수 증가
    const { data: teamData, error: teamError } = await supabase
      .from("game_team")
      .select("sets_won")
      .eq("id", winningTeamId)
      .single();

    if (teamError) throw teamError;

    const setsWon = (teamData.sets_won || 0) + 1;

    const { data: updatedTeam, error: updateError } = await supabase
      .from("game_team")
      .update({ sets_won: setsWon })
      .eq("id", winningTeamId)
      .select()
      .single();

    if (updateError) throw updateError;

    // 이벤트 발생
    eventEmitter.emit(EventTypes.SET_COMPLETED, setId);

    return { set: setData, team: updatedTeam };
  },

  // 듀스 상황에서 세트 점수 확인
  checkDeuceWinCondition: async (
    setId: string,
    gameId: string
  ): Promise<{ isDeuceWin: boolean; winningTeamId: string | null }> => {
    // 세트 정보 가져오기
    const { data: setData, error: setError } = await supabase
      .from("game_set")
      .select("id")
      .eq("id", setId)
      .single();

    if (setError) throw setError;

    // 게임 정보 가져오기
    const { data: gameData, error: gameError } = await supabase
      .from("game")
      .select("winning_score, use_deuce")
      .eq("id", gameId)
      .single();

    if (gameError) throw gameError;

    // 팀별 점수 가져오기
    const { data: scores, error: scoresError } = await supabase
      .from("game_set_score")
      .select("game_team_id, score")
      .eq("game_set_id", setId);

    if (scoresError) throw scoresError;

    if (scores.length < 2) return { isDeuceWin: false, winningTeamId: null };

    // 듀스 로직 처리
    if (gameData.use_deuce) {
      const sortedScores = [...scores].sort((a, b) => b.score - a.score);
      const [highest, secondHighest] = sortedScores;

      // 두 점수 모두 target_score 이상이고, 점수 차이가 2점 이상일 때 승리
      if (
        highest.score >= gameData.winning_score &&
        secondHighest.score >= gameData.winning_score - 1 &&
        highest.score - secondHighest.score >= 2
      ) {
        return { isDeuceWin: true, winningTeamId: highest.game_team_id };
      }
    }

    return { isDeuceWin: false, winningTeamId: null };
  },
};
```

### 3.3. 점수 API 확장

```typescript
export const scoreAPI = {
  // 점수 증가
  incrementScore: async (
    setScoreId: string,
    increment: number = 1
  ): Promise<GameSetScore> => {
    // 현재 점수 가져오기
    const { data: currentScore, error: scoreError } = await supabase
      .from("game_set_score")
      .select("score")
      .eq("id", setScoreId)
      .single();

    if (scoreError) throw scoreError;

    const newScore = currentScore.score + increment;

    // 점수 업데이트
    const { data, error } = await supabase
      .from("game_set_score")
      .update({ score: newScore })
      .eq("id", setScoreId)
      .select("*, game_set_id, game_team_id")
      .single();

    if (error) throw error;

    // 이벤트 발생
    eventEmitter.emit(EventTypes.SCORE_UPDATED, setScoreId);

    return data;
  },

  // 점수 초기화 (세트 시작 시)
  initializeSetScores: async (
    setId: string,
    gameId: string
  ): Promise<GameSetScore[]> => {
    // 게임에 속한 팀 가져오기
    const { data: teams, error: teamsError } = await supabase
      .from("game_team")
      .select("id")
      .eq("game_id", gameId);

    if (teamsError) throw teamsError;

    // 각 팀에 대한 점수 레코드 생성
    const scoreRecords = teams.map((team) => ({
      game_set_id: setId,
      game_team_id: team.id,
      score: 0,
    }));

    const { data, error } = await supabase
      .from("game_set_score")
      .insert(scoreRecords)
      .select();

    if (error) throw error;

    return data;
  },

  // 세트의 모든 점수 가져오기
  getSetScores: async (setId: string): Promise<GameSetScore[]> => {
    const { data, error } = await supabase
      .from("game_set_score")
      .select("*, game_team:game_team_id(team_name, team_color)")
      .eq("game_set_id", setId);

    if (error) throw error;

    return data;
  },

  // 승리 조건 확인
  checkWinCondition: async (
    setId: string,
    gameId: string
  ): Promise<{ isWin: boolean; winningTeamId: string | null }> => {
    // 게임 정보 가져오기
    const { data: gameData, error: gameError } = await supabase
      .from("game")
      .select("winning_score, use_deuce")
      .eq("id", gameId)
      .single();

    if (gameError) throw gameError;

    // 세트 점수 가져오기
    const { data: scores, error: scoresError } = await supabase
      .from("game_set_score")
      .select("game_team_id, score")
      .eq("game_set_id", setId);

    if (scoresError) throw scoresError;

    // 승리 조건 확인
    for (const score of scores) {
      if (score.score >= gameData.winning_score) {
        // 듀스 사용하는 경우
        if (gameData.use_deuce) {
          // 듀스 확인 로직은 별도 함수로 처리
          return { isWin: false, winningTeamId: null };
        } else {
          // 듀스 사용하지 않는 경우 바로 승리
          return { isWin: true, winningTeamId: score.game_team_id };
        }
      }
    }

    return { isWin: false, winningTeamId: null };
  },

  // 게임 승리 조건 확인
  checkGameWinCondition: async (
    gameId: string
  ): Promise<{ isGameWin: boolean; winningTeamId: string | null }> => {
    // 게임 정보 가져오기
    const { data: gameData, error: gameError } = await supabase
      .from("game")
      .select("wins_required, num_of_sets")
      .eq("id", gameId)
      .single();

    if (gameError) throw gameError;

    const winsRequired =
      gameData.wins_required || Math.ceil(gameData.num_of_sets / 2);

    // 팀별 세트 승리 수 가져오기
    const { data: teams, error: teamsError } = await supabase
      .from("game_team")
      .select("id, sets_won")
      .eq("game_id", gameId);

    if (teamsError) throw teamsError;

    // 승리 조건 확인
    for (const team of teams) {
      if (team.sets_won >= winsRequired) {
        return { isGameWin: true, winningTeamId: team.id };
      }
    }

    return { isGameWin: false, winningTeamId: null };
  },
};
```

## 4. 이벤트 확장

이벤트 시스템에 다음 이벤트를 추가해야 합니다:

```typescript
// eventEmitter.ts 파일에 추가
export enum EventTypes {
  // 기존 이벤트...

  // 새로운 이벤트
  GAME_STATUS_CHANGED = "game:status-changed",
  GAME_COMPLETED = "game:completed",
  SET_STARTED = "set:started",
  SET_STATUS_CHANGED = "set:status-changed",
  SET_COMPLETED = "set:completed",
  SCORE_UPDATED = "score:updated",
}
```

## 5. 워치 앱 요구사항

### 5.1. 워치 앱 화면 구성

1. **게임 목록 화면**

   - 진행 중인 게임 표시
   - 새 게임 시작 버튼

2. **게임 상세 화면**

   - 팀 정보 및 세트 스코어 표시
   - 현재 세트 점수 표시
   - 득점/실점 버튼
   - 세트 완료 후 다음 세트 시작 버튼

3. **점수 입력 화면**

   - 크고 터치하기 쉬운 버튼으로 팀별 득점 입력
   - 점수 수정 기능
   - 듀스 상황 표시

4. **게임 종료 화면**
   - 최종 결과 표시
   - 승리 팀 강조 표시
   - 다음 게임 시작 또는 목록으로 돌아가기 옵션

### 5.2. 오프라인 지원

워치에서 네트워크 연결이 불안정할 수 있으므로:

1. 로컬 상태 관리를 통한 즉각적인 UI 업데이트
2. 오프라인 상태에서 로컬 데이터 캐싱
3. 네트워크 연결 복구 시 자동 동기화

### 5.3. 배터리 최적화

워치 배터리 수명을 고려한 최적화:

1. 불필요한 네트워크 요청 최소화
2. 백그라운드 작업 제한
3. 화면 밝기 및 새로고침 최적화

## 6. Supabase 데이터베이스 확장

다음 SQL 스크립트로 데이터베이스 스키마를 확장해야 합니다:

```sql
-- Game 테이블 업데이트
ALTER TABLE game
ADD COLUMN is_active BOOLEAN DEFAULT FALSE,
ADD COLUMN is_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN current_set_id UUID REFERENCES game_set(id),
ADD COLUMN winning_team_id UUID REFERENCES game_team(id),
ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;

-- GameSet 테이블 업데이트
ALTER TABLE game_set
ADD COLUMN is_active BOOLEAN DEFAULT FALSE,
ADD COLUMN is_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN winning_team_id UUID REFERENCES game_team(id),
ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;

-- GameTeam 테이블 업데이트
ALTER TABLE game_team
ADD COLUMN sets_won INTEGER DEFAULT 0;

-- 인덱스 추가
CREATE INDEX game_is_active_idx ON game(is_active);
CREATE INDEX game_set_is_active_idx ON game_set(is_active);
CREATE INDEX game_set_game_id_idx ON game_set(game_id);
CREATE INDEX game_set_score_set_id_idx ON game_set_score(game_set_id);
```

## 7. 실시간 업데이트 처리

Supabase의 실시간 기능을 활용하여 점수 업데이트를 처리해야 합니다:

```typescript
// 실시간 점수 업데이트 구독
const subscribeToGameUpdates = (gameId: string) => {
  const subscription = supabase
    .channel(`game-${gameId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "game_set_score",
        filter: `game_id=eq.${gameId}`,
      },
      (payload) => {
        // 점수 업데이트 처리
        handleScoreUpdate(payload.new);
      }
    )
    .subscribe();

  return subscription;
};

// 실시간 세트 상태 업데이트 구독
const subscribeToSetUpdates = (setId: string) => {
  const subscription = supabase
    .channel(`set-${setId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "game_set",
        filter: `id=eq.${setId}`,
      },
      (payload) => {
        // 세트 상태 업데이트 처리
        handleSetStatusUpdate(payload.new);
      }
    )
    .subscribe();

  return subscription;
};
```

## 8. 구현 우선순위

1. 데이터베이스 스키마 확장
2. API 확장 구현
3. 워치 앱 기본 UI 구현
4. 세트 시작 및 점수 기록 기능
5. 듀스 처리 기능
6. 세트 종료 및 다음 세트 전환
7. 게임 완료 처리
8. 오프라인 지원 및 실시간 업데이트
9. 배터리 최적화
