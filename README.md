# 실시간 멀티플레이 인디언 포커

Firebase Hosting, Firebase Authentication, Firebase Realtime Database 기반의 2~8인 실시간 인디언 포커 웹앱입니다. 사용자는 이름과 4자리 PIN으로 접속하고, 방 생성/입장/준비 동의/게임 시작/턴 기반 베팅/쇼다운 정산/채팅을 실시간으로 사용할 수 있습니다.

## 폴더 구조

```text
.
├─ .env.example
├─ .firebaserc
├─ .gitignore
├─ README.md
├─ database.rules.json
├─ eslint.config.js
├─ firebase.json
├─ index.html
├─ package.json
├─ postcss.config.js
├─ tailwind.config.ts
├─ tsconfig.json
├─ tsconfig.node.json
├─ vite.config.ts
├─ scripts/
│  └─ seed-master.mjs
└─ src/
   ├─ App.tsx
   ├─ index.css
   ├─ main.tsx
   ├─ vite-env.d.ts
   ├─ components/
   │  ├─ admin/AdminPanel.tsx
   │  ├─ auth/LoginScreen.tsx
   │  ├─ game/BettingControls.tsx
   │  ├─ game/ChatPanel.tsx
   │  ├─ game/GameRoom.tsx
   │  ├─ game/PlayerSeat.tsx
   │  ├─ lobby/CreateRoomModal.tsx
   │  ├─ lobby/Lobby.tsx
   │  ├─ lobby/RoomCard.tsx
   │  └─ neumorphic/*.tsx
   ├─ config/firebase.ts
   ├─ context/AuthContext.tsx
   ├─ hooks/
   ├─ lib/
   └─ types/index.ts
```

## 주요 기능

- 2~8인 방 생성, 방 목록 입장, 방 코드 입장
- 게임 진행 중 방은 관전자로 입장
- 모든 참가자 준비 완료 후 방장이 아니어도 누구나 시작 가능
- 본인 카드는 숨김, 다른 플레이어 카드는 공개, 쇼다운 후 전체 공개
- 콜, 레이즈, 폴드, 턴 타이머, 자동 폴드
- 팟, 현재 베팅, 플레이어별 크레딧, 라운드 승패 자동 정산
- 방 채팅과 게임 로그
- 마스터 관리자 패널: 유저 조회, 유저 데이터 삭제, 크레딧 조정, 게임 리셋, 전체 초기화
- 뉴모피즘 기반 반응형 UI

## 설치

```bash
npm install
npm run dev
```

로컬 기본 주소는 `http://localhost:5173`입니다.

## 환경 변수

`.env.example`을 복사해 `.env`를 만들고 Firebase 웹앱 설정값을 입력합니다.

```bash
cp .env.example .env
```

필수 값:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_DATABASE_URL=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_MASTER_EMAIL=master@indianpoker.local
```

## Firebase 설정

1. Firebase Console에서 프로젝트 생성
2. Authentication → Sign-in method → Email/Password 활성화
3. Realtime Database 생성
4. 웹앱 추가 후 `.env` 값 입력
5. 이 프로젝트는 `.firebaserc`에 `indian-poker-5fa94`가 기본 프로젝트로 설정되어 있습니다.
6. 보안 규칙 배포

```bash
firebase login
firebase use indian-poker-5fa94
firebase deploy --only database
```

## 마스터 계정

앱 로그인 정보:

- 이름: `위드`
- 비밀번호: `4001`

Firebase Auth는 6자 미만 비밀번호를 허용하지 않기 때문에 앱 내부에서 4자리 PIN을 배포용 비밀번호 문자열로 변환합니다. 최초 1회 아래 스크립트로 마스터 계정을 생성하세요.

```bash
export FIREBASE_DATABASE_URL="https://indian-poker-5fa94-default-rtdb.firebaseio.com"
export GOOGLE_APPLICATION_CREDENTIALS="/absolute/path/to/service-account.json"
npm run seed:master
```

Windows PowerShell:

```powershell
$env:FIREBASE_DATABASE_URL="https://indian-poker-5fa94-default-rtdb.firebaseio.com"
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\service-account.json"
npm run seed:master
```

## 빌드와 배포

```bash
npm run build
firebase deploy
```

`firebase.json`은 Vite 빌드 결과물인 `dist`를 Firebase Hosting에 배포하도록 설정되어 있습니다.

## GitHub 업로드

```bash
git init
git add .
git commit -m "Build realtime Indian poker app"
git branch -M main
git remote add origin https://github.com/SECRET-CHAMBER-WID/Indian-Poker.git
git push -u origin main
```

## 보안 메모

Realtime Database Rules는 로그인 사용자, 방 참가자, 마스터 권한, 숨김 카드 읽기 권한을 강제합니다. 게임 시작과 베팅 처리는 클라이언트 트랜잭션으로 중복 시작과 턴 충돌을 줄입니다. 실제 금전성 서비스처럼 강한 부정행위 방지가 필요한 환경에서는 카드 배분과 정산을 Cloud Functions 또는 별도 서버에서 최종 검증하도록 확장하는 것을 권장합니다.
