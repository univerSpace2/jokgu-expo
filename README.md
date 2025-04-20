jok9-expo: 족구 모임 관리 앱

이 앱은 족구 모임, 플레이어, 게임, 경기장을 관리하는 앱입니다.

## 기능

- 모임 관리: 날짜, 시간, 장소 및 참가자 관리
- 플레이어 관리: 플레이어 추가, 수정, 삭제
- 게임 관리: 팀 구성, 점수 기록, 세트 관리
- 족구장 관리: 장소, 예약 방법, 가격 정보 관리

## 개발 환경

- React Native with Expo
- TypeScript
- Supabase (백엔드)

## 설치 방법 (맥 & 윈도우)

### 1. Node.js 설치 (nvm 권장)

#### MacOS

1. [Homebrew](https://brew.sh/)가 설치되어 있지 않다면 설치:
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```
2. nvm 설치:
   ```bash
   brew install nvm
   mkdir ~/.nvm
   echo 'export NVM_DIR="$HOME/.nvm"' >> ~/.zshrc
   echo '[ -s "/opt/homebrew/opt/nvm/nvm.sh" ] && . "/opt/homebrew/opt/nvm/nvm.sh"' >> ~/.zshrc
   source ~/.zshrc
   ```
3. Node.js 설치 및 사용:
   ```bash
   nvm install --lts
   nvm use --lts
   ```

#### Windows

1. [nvm-windows](https://github.com/coreybutler/nvm-windows/releases) 설치 파일 다운로드 및 설치
2. 명령 프롬프트(또는 PowerShell)에서 Node.js 설치 및 사용:
   ```cmd
   nvm install lts
   nvm use lts
   ```

### 2. Yarn 설치

```bash
npm install -g yarn
```

## 실행 방법

```bash
# 의존성 설치
yarn install

# 개발 서버 실행
yarn start
```

## 배포

```bash
# Android 빌드
yarn android

# iOS 빌드
yarn ios
```
