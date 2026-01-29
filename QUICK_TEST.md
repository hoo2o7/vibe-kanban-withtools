# Quick Local Test Commands

로컬 환경에서 vibe-kanban을 빠르게 테스트하는 커맨드들입니다.

## 1단계: 빌드

```bash
cd /Users/jiho/Documents/coding/vibe-kanban-withtools
./local-build.sh
```

## 2단계: 로컬 테스트

### 방법 1: 직접 실행 (가장 간단)

```bash
cd /Users/jiho/Documents/coding/vibe-kanban-withtools/npx-cli
node bin/cli.js
```

브라우저가 자동으로 열립니다.
- 포트: 자동 할당
- 로그: 터미널에 표시

### 방법 2: npm link로 전역 설치

```bash
cd /Users/jiho/Documents/coding/vibe-kanban-withtools/npx-cli
npm link
```

그 후 어디서든:

```bash
vibe-kanban-jiho
```

### 방법 3: 원격 처럼 테스트

```bash
cd /tmp
npx /Users/jiho/Documents/coding/vibe-kanban-withtools/npx-cli
```

## 테스트할 기능들

### 1. 문서 에디터 (방금 구현한 기능)

1. 프로젝트 추가
2. 문서 탭 열기
3. 문서 수정 후 저장
4. 확인사항:
   - ✅ main 브랜치로 자동 체크아웃 되었나?
   - ✅ 변경사항이 commit 되었나?
   - ✅ 응답에 branch 정보가 포함되었나?

### 2. Task 실행 (문서 동기화)

1. Task 생성
2. AI agent로 실행
3. 확인사항:
   - ✅ Task worktree 생성 시 main에서 문서들을 가져왔나?
   - ✅ 로그에 "Synced X document files from main" 메시지 있나?

## 개발 중 빠른 재빌드

코드 변경 후:

```bash
# 프론트엔드 변경시
cd /Users/jiho/Documents/coding/vibe-kanban-withtools/frontend && npm run build && cd ..

# 백엔드 변경시
cd /Users/jiho/Documents/coding/vibe-kanban-withtools && cargo build --release --manifest-path Cargo.toml

# 전체 빌드 (추천)
./local-build.sh
```

## 로그 확인

터미널에서:

```
2026-01-22T15:22:28.032881Z  INFO server: Server running on http://127.0.0.1:54829
```

포트 번호를 확인하고 브라우저에서 해당 주소로 접속.

## 종료

Ctrl+C로 서버 종료

## npm link 정리

테스트 후:

```bash
npm unlink vibe-kanban-jiho -g
```

## 문제 해결

### "dist 디렉토리 없음" 에러
→ `./local-build.sh` 실행

### "바이너리 추출 실패"
```bash
rm -rf ~/.vibe-kanban/bin
./local-build.sh
cd npx-cli && node bin/cli.js
```

### "포트 이미 사용 중"
자동 할당되므로 다음 포트 사용. 또는:
```bash
FRONTEND_PORT=3001 BACKEND_PORT=8001 vibe-kanban-jiho
```
