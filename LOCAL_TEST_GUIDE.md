# Local NPX 테스트 가이드

로컬 환경에서 `vibe-kanban` npx 패키지를 테스트하는 방법입니다.

## 빠른 시작

### 1. 빌드

프로젝트 루트에서:

```bash
./local-build.sh
```

이 스크립트는:
- 프론트엔드 빌드 (`npm run build`)
- Rust 바이너리 릴리스 빌드
- 3가지 바이너리를 `npx-cli/dist/{platform}/` 디렉토리에 zip 형태로 패킹

완료되면:
```
📁 Files created:
   - npx-cli/dist/macos-arm64/vibe-kanban.zip
   - npx-cli/dist/macos-arm64/vibe-kanban-mcp.zip
   - npx-cli/dist/macos-arm64/vibe-kanban-review.zip
```

### 2. 로컬 테스트 실행

#### 옵션 A: 직접 CLI 실행

```bash
cd npx-cli
node bin/cli.js
```

#### 옵션 B: npm link로 전역 설치 (권장)

```bash
cd npx-cli
npm link

# 이제 어디서든 실행 가능
vibe-kanban-jiho

# 또는
npx vibe-kanban-jiho
```

#### 옵션 C: 임시 테스트

```bash
cd npx-cli
npm install
node bin/cli.js
```

### 3. MCP 서버 테스트

```bash
cd npx-cli
node bin/cli.js --mcp
```

### 4. Review CLI 테스트

```bash
cd npx-cli
node bin/cli.js review [arguments]
```

## 로컬 개발 모드 작동 원리

`npx-cli/bin/download.js`에서:

```javascript
const LOCAL_DEV_MODE = fs.existsSync(LOCAL_DIST_DIR) || process.env.VIBE_KANBAN_LOCAL === "1";
```

- `npx-cli/dist/` 디렉토리가 존재하면 **자동으로 로컬 개발 모드** 활성화
- 원격 R2 서버에서 다운로드하지 않고 로컬 바이너리 사용

또는 환경 변수로 명시:

```bash
VIBE_KANBAN_LOCAL=1 vibe-kanban-jiho
```

## 디버깅

### 상세 로그 활성화

```bash
VIBE_KANBAN_DEBUG=1 vibe-kanban-jiho
```

### 현재 상태 확인

```bash
# 로컬 dev mode 확인
cd npx-cli
node -e "const d = require('./bin/download.js'); console.log('LOCAL_DEV_MODE:', d.LOCAL_DEV_MODE);"

# 캐시 위치
echo $HOME/.vibe-kanban/bin
```

### 캐시 초기화

```bash
rm -rf ~/.vibe-kanban/bin
rm -rf npx-cli/dist  # 로컬 빌드 캐시 삭제
```

## 변경 사항 테스트 워크플로우

코드 변경 후:

1. 필요한 부분만 빌드
   ```bash
   # 프론트엔드만
   cd frontend && npm run build && cd ..
   
   # 백엔드만
   cargo build --release --manifest-path Cargo.toml
   ```

2. 바이너리 업데이트
   ```bash
   # 전체 빌드 (자동 zip 및 배치)
   ./local-build.sh
   ```

3. 테스트
   ```bash
   cd npx-cli && node bin/cli.js
   ```

## Platform 타겟

로컬 빌드는 현재 OS와 아키텍처를 자동 감지합니다:

- **macOS ARM64** (Apple Silicon): `macos-arm64`
- **macOS x64** (Intel): `macos-x64`
- **Linux x64**: `linux-x64`
- **Linux ARM64**: `linux-arm64`
- **Windows x64**: `windows-x64`
- **Windows ARM64**: `windows-arm64`

다른 플랫폼을 위해 크로스컴파일하려면:

```bash
# 예: Linux x64를 위한 크로스컴파일
cargo build --release --target x86_64-unknown-linux-gnu
```

## npm link 제거

```bash
npm unlink vibe-kanban-jiho -g

# 또는 npx-cli 디렉토리에서
npm unlink
```

## 트러블슈팅

### "Local binary not found"

```
Local binary not found: .../npx-cli/dist/macos-arm64/vibe-kanban.zip
Run ./local-build.sh first to build the binaries.
```

**해결책**: `./local-build.sh` 실행

### 바이너리 권한 오류

```bash
chmod +x $HOME/.vibe-kanban/bin/*/vibe-kanban
```

### 포트 충돌

기본 포트가 사용 중이면, 환경 변수로 변경:

```bash
FRONTEND_PORT=3001 BACKEND_PORT=8001 vibe-kanban-jiho
```

## 환경 변수

| 변수 | 설명 |
|------|------|
| `VIBE_KANBAN_LOCAL` | `1`로 설정하면 로컬 dev mode 강제 활성화 |
| `VIBE_KANBAN_DEBUG` | `1`로 설정하면 상세 로그 출력 |
| `FRONTEND_PORT` | 프론트엔드 포트 (기본: 자동 할당) |
| `BACKEND_PORT` | 백엔드 포트 (기본: 자동 할당) |
| `HOST` | 바인드 호스트 (기본: localhost) |

## 배포 전 체크리스트

로컬 테스트가 완료되면:

1. ✅ 모든 기능 테스트
2. ✅ 다양한 OS/아키텍처에서 테스트 (가능한 경우)
3. ✅ 캐시 초기화 후 재테스트
4. ✅ npm link 제거
5. ✅ 원격 배포 준비

## 참고

- 로컬 빌드된 바이너리는 `npx-cli/dist/`에만 존재
- `npm pack`으로 실제 npm 패키지 생성 가능
- 원격 배포는 별도의 CI/CD 파이프라인 필요
