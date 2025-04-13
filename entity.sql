-- pgcrypto 확장이 없을 경우 생성 (UUID 기본값 사용을 위함)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. PLAYER 테이블: 플레이어(구성원) 정보
CREATE TABLE player (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    contact VARCHAR(255)
);

-- 2. MEETING 테이블: 모임 정보
CREATE TABLE meeting (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME,
    location VARCHAR(255)
);

-- 3. MEETING_MEMBER 테이블: 모임 참여 구성원 (플레이어와 모임 간 다대다 관계)
CREATE TABLE meeting_member (
    meeting_id UUID NOT NULL,
    player_id UUID NOT NULL,
    PRIMARY KEY (meeting_id, player_id),
    FOREIGN KEY (meeting_id) REFERENCES meeting(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES player(id) ON DELETE CASCADE
);

-- 4. GAME 테이블: 게임(경기) 정보 (모임에 소속될 수 있음)
CREATE TABLE game (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID,  -- 모임에 속할 경우
    num_of_sets INTEGER NOT NULL,   -- 진행할 세트 수 (예: 최대 3세트)
    winning_score INTEGER NOT NULL, -- 세트당 목표 점수 (예: 21점)
    wins_required INTEGER NOT NULL DEFAULT 1, -- 승리에 필요한 세트 수 (예: 2세트)
    use_deuce BOOLEAN NOT NULL DEFAULT FALSE, -- 듀스 사용 여부
    penalty_details TEXT,           -- 내기/벌칙 관련 상세 설정
    FOREIGN KEY (meeting_id) REFERENCES meeting(id) ON DELETE SET NULL
);

-- 5. GAME_TEAM 테이블: 게임 내 팀 구성 정보
CREATE TABLE game_team (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL,
    team_name VARCHAR(255),
    FOREIGN KEY (game_id) REFERENCES game(id) ON DELETE CASCADE
);

-- 6. GAME_TEAM_MEMBER 테이블: 게임 팀에 배정된 플레이어 정보 (다대다 관계)
CREATE TABLE game_team_member (
    game_team_id UUID NOT NULL,
    player_id UUID NOT NULL,
    PRIMARY KEY (game_team_id, player_id),
    FOREIGN KEY (game_team_id) REFERENCES game_team(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES player(id) ON DELETE CASCADE
);

-- 7. GAME_SET 테이블: 하나의 게임 내 세트 정보
CREATE TABLE game_set (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL,
    set_number INTEGER NOT NULL,    -- 예: 1,2,3...
    target_score INTEGER NOT NULL,    -- 각 세트의 목표 점수 (예: 21점)
    FOREIGN KEY (game_id) REFERENCES game(id) ON DELETE CASCADE
);

-- 8. GAME_SET_SCORE 테이블: 각 세트에서 각 팀의 점수 기록
CREATE TABLE game_set_score (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_set_id UUID NOT NULL,
    game_team_id UUID NOT NULL,
    score INTEGER NOT NULL,
    FOREIGN KEY (game_set_id) REFERENCES game_set(id) ON DELETE CASCADE,
    FOREIGN KEY (game_team_id) REFERENCES game_team(id) ON DELETE CASCADE
);

-- 9. SCORE_LOG 테이블: 게임 진행 중 실시간 득점 및 이벤트 기록
CREATE TABLE score_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL,
    game_team_id UUID NOT NULL,
    event_timestamp TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
    event_details TEXT,
    FOREIGN KEY (game_id) REFERENCES game(id) ON DELETE CASCADE,
    FOREIGN KEY (game_team_id) REFERENCES game_team(id) ON DELETE CASCADE
);

-- 10. GYOKJANG 테이블: 족구장 정보
CREATE TABLE jokgu_ground (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    reservation_required BOOLEAN NOT NULL,
    reservation_method VARCHAR(255),
    price_info VARCHAR(255)
);