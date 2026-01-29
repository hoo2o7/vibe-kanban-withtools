# 로컬 테스트 후 브랜치 배지 확인

## 실행 방법

### 방법 1: 로컬 빌드 후 테스트 (가장 정확함)

```bash
cd /Users/jiho/Documents/coding/vibe-kanban-withtools

# 전체 빌드
./local-build.sh

# 로컬 테스트 실행
cd npx-cli && node bin/cli.js
```

### 방법 2: 개발 모드 (빠른 개발용)

```bash
pnpm run dev
```

## 확인 사항

문서 페이지 헤더에서:

✅ **브랜치 배지** 표시 확인
- 초록색 배지: `main` 브랜치 (정상)
- 노란색 배지: 다른 브랜치 (경고)

```
[Back] | 📄 Project Documents - develop-boilerplate | 🌿 main
```

## 왜 로컬 빌드에서는 안 보였나?

`./local-build.sh`는 프론트엔드를 **프로덕션 빌드** 후 번들링합니다.
- 개발 모드: 즉시 변경사항 반영
- 로컬 빌드: 빌드 후 재실행 필요

## 빠른 재빌드 팁

코드 변경 후:

```bash
# 1. 프론트엔드만 빌드
cd frontend && npm run build && cd ..

# 2. 바이너리 업데이트
cargo build --release --manifest-path Cargo.toml

# 3. 전체 로컬 테스트 (자동으로 zip 패킹)
./local-build.sh

# 4. 테스트 실행
cd npx-cli && node bin/cli.js
```

또는 개발 중에는 `pnpm run dev` 사용 (훨씬 빠름)
