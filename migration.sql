-- game 테이블에 use_deuce 및 wins_required 컬럼 추가
ALTER TABLE game 
ADD COLUMN IF NOT EXISTS wins_required INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS use_deuce BOOLEAN NOT NULL DEFAULT FALSE;

-- game_team 테이블에 team_color 컬럼 추가
ALTER TABLE game_team
ADD COLUMN IF NOT EXISTS team_color VARCHAR(50);

-- score_log 테이블에 game_set_id 컬럼 추가
ALTER TABLE score_log
ADD COLUMN IF NOT EXISTS game_set_id UUID REFERENCES game_set(id) ON DELETE CASCADE;

-- game_set_winner 테이블 생성 (세트 승리자 기록)
CREATE TABLE IF NOT EXISTS game_set_winner (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL,
    game_set_id UUID NOT NULL,
    game_team_id UUID NOT NULL,
    FOREIGN KEY (game_id) REFERENCES game(id) ON DELETE CASCADE,
    FOREIGN KEY (game_set_id) REFERENCES game_set(id) ON DELETE CASCADE,
    FOREIGN KEY (game_team_id) REFERENCES game_team(id) ON DELETE CASCADE
);

-- game_winner 테이블 생성 (게임 최종 승리자 기록)
CREATE TABLE IF NOT EXISTS game_winner (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL,
    game_team_id UUID NOT NULL,
    FOREIGN KEY (game_id) REFERENCES game(id) ON DELETE CASCADE,
    FOREIGN KEY (game_team_id) REFERENCES game_team(id) ON DELETE CASCADE
); 