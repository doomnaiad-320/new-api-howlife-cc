#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
WEB_DIR="${ROOT_DIR}/web"
OUTPUT_DIR="${OUTPUT_DIR:-${ROOT_DIR}/build}"
BINARY_NAME="${BINARY_NAME:-new-api-linux-amd64}"
CHECKSUM_NAME="${CHECKSUM_NAME:-${BINARY_NAME}.sha256}"
ARCHIVE_NAME="${ARCHIVE_NAME:-${BINARY_NAME}.tar.gz}"
DEFAULT_NODE_OPTIONS="--max-old-space-size=4096"
GO_CACHE_DIR="${GOCACHE:-${ROOT_DIR}/.gocache}"
GO_MOD_CACHE_DIR="${GOMODCACHE:-${ROOT_DIR}/.gomodcache}"
GO_TMP_DIR="${GOTMPDIR:-${ROOT_DIR}/.gotmp}"

log() {
  printf '[build-linux-amd64] %s\n' "$*"
}

fail() {
  printf '[build-linux-amd64] ERROR: %s\n' "$*" >&2
  exit 1
}

usage() {
  cat <<EOF
Usage:
  ./scripts/build-linux-amd64.sh [version]

Environment variables:
  VERSION=...                  Override binary version string.
  OUTPUT_DIR=...               Output directory. Default: build
  BINARY_NAME=...              Output binary name. Default: new-api-linux-amd64
  SKIP_FRONTEND_BUILD=1        Skip frontend build if web/dist is already prepared.
  SKIP_FRONTEND_INSTALL=1      Skip bun install even if web/node_modules is missing.
  FORCE_FRONTEND_INSTALL=1     Force bun install before frontend build.
  SKIP_GO_MOD_DOWNLOAD=1       Skip go mod download.
  NODE_OPTIONS=...             Override Node memory option for bun build.
  GOCACHE=...                  Go build cache directory. Default: .gocache
  GOMODCACHE=...               Go module cache directory. Default: .gomodcache
  GOTMPDIR=...                 Go temporary directory. Default: .gotmp
  GOTOOLCHAIN=...              Go toolchain mode. Default: auto when local Go is too old, otherwise local

Examples:
  ./scripts/build-linux-amd64.sh
  ./scripts/build-linux-amd64.sh v1.0.0
  VERSION=v1.0.0 ./scripts/build-linux-amd64.sh
EOF
}

require_cmd() {
  local cmd="$1"
  command -v "$cmd" >/dev/null 2>&1 || fail "missing required command: ${cmd}"
}

resolve_version() {
  local input="${1:-}"
  local version_file="${ROOT_DIR}/VERSION"
  local version=""

  if [[ -n "$input" ]]; then
    printf '%s' "$input"
    return
  fi

  if [[ -f "$version_file" ]]; then
    version="$(tr -d '[:space:]' <"$version_file")"
    if [[ -n "$version" ]]; then
      printf '%s' "$version"
      return
    fi
  fi

  if git -C "$ROOT_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    version="$(git -C "$ROOT_DIR" describe --tags --always --dirty 2>/dev/null || true)"
    if [[ -z "$version" ]]; then
      version="$(git -C "$ROOT_DIR" rev-parse --short HEAD 2>/dev/null || true)"
    fi
    if [[ -n "$version" ]]; then
      printf '%s' "$version"
      return
    fi
  fi

  printf 'manual-%s' "$(date +%Y%m%d%H%M%S)"
}

strip_go_prefix() {
  printf '%s' "${1#go}"
}

version_gte() {
  local left="${1:-0}"
  local right="${2:-0}"
  local left_parts right_parts idx

  IFS='.' read -r -a left_parts <<<"$left"
  IFS='.' read -r -a right_parts <<<"$right"

  for idx in 0 1 2; do
    local left_num="${left_parts[$idx]:-0}"
    local right_num="${right_parts[$idx]:-0}"
    if ((10#${left_num} > 10#${right_num})); then
      return 0
    fi
    if ((10#${left_num} < 10#${right_num})); then
      return 1
    fi
  done

  return 0
}

resolve_go_toolchain_mode() {
  local required_go_version=""
  local local_go_version=""

  if [[ -n "${GOTOOLCHAIN:-}" ]]; then
    printf '%s' "$GOTOOLCHAIN"
    return
  fi

  required_go_version="$(awk '/^go / {print $2; exit}' "${ROOT_DIR}/go.mod")"
  local_go_version="$(GOTOOLCHAIN=local go env GOVERSION 2>/dev/null || true)"
  local_go_version="$(strip_go_prefix "$local_go_version")"

  if [[ -n "$required_go_version" && -n "$local_go_version" ]] && version_gte "$local_go_version" "$required_go_version"; then
    printf 'local'
    return
  fi

  printf 'auto'
}

build_frontend() {
  if [[ "${SKIP_FRONTEND_BUILD:-0}" == "1" ]]; then
    log "Skipping frontend build because SKIP_FRONTEND_BUILD=1"
    return
  fi

  require_cmd bun

  if [[ "${FORCE_FRONTEND_INSTALL:-0}" == "1" || ( "${SKIP_FRONTEND_INSTALL:-0}" != "1" && ! -d "${WEB_DIR}/node_modules" ) ]]; then
    log "Installing frontend dependencies with bun"
    (
      cd "$WEB_DIR"
      bun install
    )
  else
    log "Skipping bun install"
  fi

  log "Building frontend into web/dist"
  (
    cd "$WEB_DIR"
    CI="" \
      NODE_OPTIONS="${NODE_OPTIONS:-$DEFAULT_NODE_OPTIONS}" \
      DISABLE_ESLINT_PLUGIN='true' \
      VITE_REACT_APP_VERSION="$VERSION" \
      bun run build
  )

  [[ -f "${WEB_DIR}/dist/index.html" ]] || fail "frontend build did not produce web/dist/index.html"
}

build_backend() {
  require_cmd go
  require_cmd tar

  mkdir -p "$OUTPUT_DIR"
  mkdir -p "$GO_CACHE_DIR" "$GO_MOD_CACHE_DIR" "$GO_TMP_DIR"

  if [[ "${SKIP_GO_MOD_DOWNLOAD:-0}" != "1" ]]; then
    log "Downloading Go modules"
    if ! (
      cd "$ROOT_DIR"
      GOCACHE="$GO_CACHE_DIR" GOMODCACHE="$GO_MOD_CACHE_DIR" GOTMPDIR="$GO_TMP_DIR" \
        GOTOOLCHAIN="$GO_TOOLCHAIN_MODE" \
        go mod download
    ); then
      fail "go mod download failed. If dependencies are already cached locally, rerun with SKIP_GO_MOD_DOWNLOAD=1"
    fi
  else
    log "Skipping go mod download because SKIP_GO_MOD_DOWNLOAD=1"
  fi

  log "Building Linux amd64 binary"
  (
    cd "$ROOT_DIR"
    GOCACHE="$GO_CACHE_DIR" GOMODCACHE="$GO_MOD_CACHE_DIR" GOTMPDIR="$GO_TMP_DIR" \
      GOTOOLCHAIN="$GO_TOOLCHAIN_MODE" \
      CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
      go build \
      -trimpath \
      -ldflags "-s -w -X 'github.com/QuantumNous/new-api/common.Version=${VERSION}'" \
      -o "${OUTPUT_DIR}/${BINARY_NAME}"
  )

  chmod +x "${OUTPUT_DIR}/${BINARY_NAME}"
}

write_checksum() {
  local binary_path="${OUTPUT_DIR}/${BINARY_NAME}"
  local checksum_path="${OUTPUT_DIR}/${CHECKSUM_NAME}"

  if command -v sha256sum >/dev/null 2>&1; then
    (
      cd "$OUTPUT_DIR"
      sha256sum "$BINARY_NAME" > "$CHECKSUM_NAME"
    )
    return
  fi

  if command -v shasum >/dev/null 2>&1; then
    (
      cd "$OUTPUT_DIR"
      shasum -a 256 "$BINARY_NAME" > "$CHECKSUM_NAME"
    )
    return
  fi

  fail "missing checksum command: sha256sum or shasum"
}

package_artifacts() {
  log "Writing checksum"
  write_checksum

  log "Packaging tar.gz archive"
  (
    cd "$OUTPUT_DIR"
    tar -czf "$ARCHIVE_NAME" "$BINARY_NAME" "$CHECKSUM_NAME"
  )
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

VERSION="$(resolve_version "${1:-${VERSION:-}}")"
require_cmd go
GO_TOOLCHAIN_MODE="$(resolve_go_toolchain_mode)"

log "Project root: ${ROOT_DIR}"
log "Using version: ${VERSION}"
log "Output directory: ${OUTPUT_DIR}"
log "Go cache: ${GO_CACHE_DIR}"
log "Go mod cache: ${GO_MOD_CACHE_DIR}"
log "Go tmp dir: ${GO_TMP_DIR}"
log "Go toolchain mode: ${GO_TOOLCHAIN_MODE}"

build_frontend
build_backend
package_artifacts

log "Done"
log "Binary: ${OUTPUT_DIR}/${BINARY_NAME}"
log "Checksum: ${OUTPUT_DIR}/${CHECKSUM_NAME}"
log "Archive: ${OUTPUT_DIR}/${ARCHIVE_NAME}"
