# Supabase API 명세

API 명세는 `lib/api.ts` 파일에 정의되어 있으며, 다음과 같은 카테고리로 구분됩니다.

## 목차

- [플레이어 API](#플레이어-api)
- [모임 API](#모임-api)
- [게임 API](#게임-api)
- [경기장 API](#경기장-api)

## 플레이어 API

`playerAPI` 객체를 통해 플레이어 관련 CRUD 기능을 제공합니다.

### 모든 플레이어 조회

```typescript
playerAPI.getAll(): Promise<Player[]>
```

- 설명: 모든 플레이어 정보를 이름 오름차순으로 조회합니다.
- 요청: 파라미터 없음
- 반환: `Player[]` 배열

### 특정 플레이어 조회

```typescript
playerAPI.getById(id: string): Promise<Player | null>
```

- 설명: ID로 특정 플레이어를 조회합니다.
- 요청: 플레이어 ID
- 반환: `Player` 객체 또는 `null`

### 플레이어 생성

```typescript
playerAPI.create(player: Omit<Player, "id">): Promise<Player>
```

- 설명: 새 플레이어를 생성합니다.
- 요청: ID를 제외한 플레이어 정보
- 반환: 생성된 `Player` 객체
- 참고: 생성 시 `PLAYER_CHANGED` 이벤트가 발생합니다.

### 플레이어 수정

```typescript
playerAPI.update(id: string, player: Partial<Omit<Player, "id">>): Promise<Player>
```

- 설명: 기존 플레이어 정보를 수정합니다.
- 요청: 플레이어 ID와 변경할 플레이어 정보
- 반환: 수정된 `Player` 객체
- 참고: 수정 시 `PLAYER_CHANGED` 이벤트가 발생합니다.

### 플레이어 삭제

```typescript
playerAPI.delete(id: string): Promise<void>
```

- 설명: 플레이어를 삭제합니다.
- 요청: 삭제할 플레이어 ID
- 반환: `void`
- 참고: 삭제 시 `PLAYER_CHANGED` 이벤트가 발생합니다.

## 모임 API

`meetingAPI` 객체를 통해 모임 및 참여자 관련 기능을 제공합니다.

### 모든 모임 조회

```typescript
meetingAPI.getAll(): Promise<Meeting[]>
```

- 설명: 모든 모임 정보를 모임 날짜 내림차순으로 조회합니다.
- 요청: 파라미터 없음
- 반환: `Meeting[]` 배열

### 특정 모임 조회

```typescript
meetingAPI.getById(id: string): Promise<Meeting | null>
```

- 설명: ID로 특정 모임을 조회합니다.
- 요청: 모임 ID
- 반환: `Meeting` 객체 또는 `null`

### 모임 참여자 조회

```typescript
meetingAPI.getMembers(meetingId: string): Promise<Player[]>
```

- 설명: 특정 모임의 참여자 목록을 조회합니다.
- 요청: 모임 ID
- 반환: 참여자 `Player[]` 배열

### 모임 생성

```typescript
meetingAPI.create(meeting: Omit<Meeting, "id">): Promise<Meeting>
```

- 설명: 새 모임을 생성합니다.
- 요청: ID를 제외한 모임 정보
- 반환: 생성된 `Meeting` 객체
- 참고: 생성 시 `MEETING_CHANGED` 이벤트가 발생합니다.

### 모임 수정

```typescript
meetingAPI.update(id: string, meeting: Partial<Omit<Meeting, "id">>): Promise<Meeting>
```

- 설명: 기존 모임 정보를 수정합니다.
- 요청: 모임 ID와 변경할 모임 정보
- 반환: 수정된 `Meeting` 객체
- 참고: 수정 시 `MEETING_CHANGED` 이벤트가 발생합니다.

### 모임 삭제

```typescript
meetingAPI.delete(id: string): Promise<void>
```

- 설명: 모임을 삭제합니다.
- 요청: 삭제할 모임 ID
- 반환: `void`
- 참고: 삭제 시 `MEETING_CHANGED` 이벤트가 발생합니다.

### 모임 참여자 추가

```typescript
meetingAPI.addMember(meetingId: string, playerId: string): Promise<void>
```

- 설명: 모임에 참여자를 추가합니다.
- 요청: 모임 ID와 플레이어 ID
- 반환: `void`
- 참고: 추가 시 `MEETING_MEMBERS_CHANGED` 이벤트가 발생합니다.

### 모임 참여자 삭제

```typescript
meetingAPI.removeMember(meetingId: string, playerId: string): Promise<void>
```

- 설명: 모임에서 참여자를 제거합니다.
- 요청: 모임 ID와 플레이어 ID
- 반환: `void`
- 참고: 제거 시 `MEETING_MEMBERS_CHANGED` 이벤트가 발생합니다.

## 게임 API

`gameAPI` 객체를 통해 게임, 팀, 세트, 점수 관련 기능을 제공합니다.

### 모든 게임 조회

```typescript
gameAPI.getAll(): Promise<Game[]>
```

- 설명: 모든 게임 정보를 조회합니다.
- 요청: 파라미터 없음
- 반환: `Game[]` 배열

### 특정 게임 조회

```typescript
gameAPI.getById(id: string): Promise<Game | null>
```

- 설명: ID로 특정 게임을 조회합니다.
- 요청: 게임 ID
- 반환: `Game` 객체 또는 `null`

### 모임에 속한 게임 조회

```typescript
gameAPI.getByMeetingId(meetingId: string): Promise<Game[]>
```

- 설명: 특정 모임에 속한 모든 게임을 조회합니다.
- 요청: 모임 ID
- 반환: `Game[]` 배열

### 게임 생성

```typescript
gameAPI.create(game: Omit<Game, "id">): Promise<Game>
```

- 설명: 새 게임을 생성합니다.
- 요청: ID를 제외한 게임 정보
- 반환: 생성된 `Game` 객체
- 참고: 생성 시 `GAME_CHANGED` 이벤트가 발생하며, 모임 ID가 있는 경우 `MEETING_CHANGED` 이벤트도 발생합니다.

### 게임 수정

```typescript
gameAPI.update(id: string, game: Partial<Omit<Game, "id">>): Promise<Game>
```

- 설명: 기존 게임 정보를 수정합니다.
- 요청: 게임 ID와 변경할 게임 정보
- 반환: 수정된 `Game` 객체
- 참고: 수정 시 `GAME_CHANGED` 이벤트가 발생합니다.

### 게임 삭제

```typescript
gameAPI.delete(id: string): Promise<void>
```

- 설명: 게임을 삭제합니다.
- 요청: 삭제할 게임 ID
- 반환: `void`
- 참고: 삭제 시 `GAME_CHANGED` 이벤트가 발생합니다.

### 게임 팀 생성

```typescript
gameAPI.createTeam(gameTeam: Omit<GameTeam, "id">): Promise<GameTeam>
```

- 설명: 게임에 새 팀을 생성합니다.
- 요청: ID를 제외한 게임 팀 정보
- 반환: 생성된 `GameTeam` 객체
- 참고: 생성 시 `GAME_CHANGED` 이벤트가 발생합니다.

### 게임 팀 조회

```typescript
gameAPI.getTeams(gameId: string): Promise<GameTeam[]>
```

- 설명: 특정 게임의 모든 팀을 조회합니다.
- 요청: 게임 ID
- 반환: `GameTeam[]` 배열

### 게임 팀에 플레이어 추가

```typescript
gameAPI.addTeamMember(teamId: string, playerId: string): Promise<void>
```

- 설명: 게임 팀에 플레이어를 추가합니다.
- 요청: 팀 ID와 플레이어 ID
- 반환: `void`

### 게임 세트 생성

```typescript
gameAPI.createSet(gameSet: Omit<GameSet, "id">): Promise<GameSet>
```

- 설명: 게임에 새 세트를 생성합니다.
- 요청: ID를 제외한 게임 세트 정보
- 반환: 생성된 `GameSet` 객체

### 게임 세트 조회

```typescript
gameAPI.getSets(gameId: string): Promise<GameSet[]>
```

- 설명: 특정 게임의 모든 세트를 세트 번호 오름차순으로 조회합니다.
- 요청: 게임 ID
- 반환: `GameSet[]` 배열

### 세트 점수 기록

```typescript
gameAPI.recordSetScore(setScore: Omit<GameSetScore, "id">): Promise<GameSetScore>
```

- 설명: 세트의 팀별 점수를 기록합니다.
- 요청: ID를 제외한 세트 점수 정보
- 반환: 생성된 `GameSetScore` 객체

### 세트 점수 업데이트

```typescript
gameAPI.updateSetScore(id: string, score: number): Promise<GameSetScore>
```

- 설명: 세트 점수를 업데이트합니다.
- 요청: 세트 점수 ID와 새 점수
- 반환: 업데이트된 `GameSetScore` 객체

### 득점 로그 기록

```typescript
gameAPI.logScore(scoreLog: Omit<ScoreLog, "id">): Promise<ScoreLog>
```

- 설명: 득점 로그를 기록합니다.
- 요청: ID를 제외한 득점 로그 정보
- 반환: 생성된 `ScoreLog` 객체
- 참고: 기록 시 `GAME_CHANGED` 이벤트가 발생합니다.

## 경기장 API

`groundAPI` 객체를 통해 경기장 관련 CRUD 기능을 제공합니다.

### 모든 경기장 조회

```typescript
groundAPI.getAll(): Promise<JokguGround[]>
```

- 설명: 모든 경기장 정보를 이름 오름차순으로 조회합니다.
- 요청: 파라미터 없음
- 반환: `JokguGround[]` 배열

### 특정 경기장 조회

```typescript
groundAPI.getById(id: string): Promise<JokguGround | null>
```

- 설명: ID로 특정 경기장을 조회합니다.
- 요청: 경기장 ID
- 반환: `JokguGround` 객체 또는 `null`

### 경기장 생성

```typescript
groundAPI.create(ground: Omit<JokguGround, "id">): Promise<JokguGround>
```

- 설명: 새 경기장을 생성합니다.
- 요청: ID를 제외한 경기장 정보
- 반환: 생성된 `JokguGround` 객체
- 참고: 생성 시 `GROUND_CHANGED` 이벤트가 발생합니다.

### 경기장 수정

```typescript
groundAPI.update(id: string, ground: Partial<Omit<JokguGround, "id">>): Promise<JokguGround>
```

- 설명: 기존 경기장 정보를 수정합니다.
- 요청: 경기장 ID와 변경할 경기장 정보
- 반환: 수정된 `JokguGround` 객체
- 참고: 수정 시 `GROUND_CHANGED` 이벤트가 발생합니다.

### 경기장 삭제

```typescript
groundAPI.delete(id: string): Promise<void>
```

- 설명: 경기장을 삭제합니다.
- 요청: 삭제할 경기장 ID
- 반환: `void`
- 참고: 삭제 시 `GROUND_CHANGED` 이벤트가 발생합니다.
