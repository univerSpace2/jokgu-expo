// 간단한 이벤트 발행/구독 시스템
type EventHandler = (...args: any[]) => void;

class EventEmitter {
  private events: Record<string, EventHandler[]> = {};

  // 이벤트 구독
  on(event: string, handler: EventHandler): () => void {
    if (!this.events[event]) {
      this.events[event] = [];
    }

    this.events[event].push(handler);

    // 구독 취소 함수 반환
    return () => {
      this.off(event, handler);
    };
  }

  // 이벤트 구독 취소
  off(event: string, handler: EventHandler): void {
    if (!this.events[event]) return;

    this.events[event] = this.events[event].filter((h) => h !== handler);

    if (this.events[event].length === 0) {
      delete this.events[event];
    }
  }

  // 이벤트 발행
  emit(event: string, ...args: any[]): void {
    if (!this.events[event]) return;

    this.events[event].forEach((handler) => {
      handler(...args);
    });
  }
}

// 이벤트 타입 정의
export const EventTypes = {
  // 데이터 변경 이벤트
  PLAYER_CHANGED: "PLAYER_CHANGED",
  MEETING_CHANGED: "MEETING_CHANGED",
  GAME_CHANGED: "GAME_CHANGED",
  GROUND_CHANGED: "GROUND_CHANGED",

  // 특정 데이터 변경 이벤트
  MEETING_MEMBERS_CHANGED: "MEETING_MEMBERS_CHANGED",
};

// 싱글톤 인스턴스 생성 및 내보내기
export const eventEmitter = new EventEmitter();
