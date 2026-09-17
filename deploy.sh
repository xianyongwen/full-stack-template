#!/usr/bin/env bash
#
# 部署脚本：本地构建前后端产物 -> 通过 SSH/rsync 同步到服务器 -> 重建并重启 docker 容器
#
# 基础设施服务（postgres/redis/minio）不会被重启，仅重建 backend 与 frontend。
#
# 用法：
#   ./deploy.sh                          # 构建 + 同步 + 重启（两端）
#   DEPLOY_HOST=1.2.3.4 ./deploy.sh      # 指定服务器
#   ./deploy.sh --no-build               # 跳过本地构建，直接同步已有产物
#   ./deploy.sh --only backend           # 只部署后端
#   ./deploy.sh --only frontend          # 只部署前端
#   ./deploy.sh --no-restart             # 只同步，不重启容器
#
# 必填配置（环境变量或命令行参数，二选一）：
#   DEPLOY_HOST   服务器 IP 或域名        （等价于 --host）
#   DEPLOY_PATH   服务器部署目录          （等价于 --path，默认 /opt/kf-ai-crm）
#
# 可选配置：
#   DEPLOY_USER   SSH 用户（默认 root）   （等价于 --user）
#   DEPLOY_PORT   SSH 端口（默认 22）     （等价于 --port）
#   SSH_KEY       私钥路径                （等价于 --key）
#
set -euo pipefail

# 项目根目录（脚本所在目录）
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# 部署配置文件：脚本启动时自动读取（可用 --env-file 覆盖）
ENV_FILE="$ROOT_DIR/.env.deploy"
ENV_FILE_EXPLICIT=0

# 行为开关
DO_BUILD=1
DO_RESTART=1
TARGET="all"   # all | backend | frontend

# ───────────────────────── 颜色输出 ─────────────────────────
if [[ -t 1 ]]; then
  C_BOLD=$'\033[1m'; C_GREEN=$'\033[32m'; C_YELLOW=$'\033[33m'
  C_RED=$'\033[31m'; C_CYAN=$'\033[36m'; C_RESET=$'\033[0m'
else
  C_BOLD=""; C_GREEN=""; C_YELLOW=""; C_RED=""; C_CYAN=""; C_RESET=""
fi
info()  { printf "%s==> %s%s\n" "$C_CYAN" "$C_RESET" "$*"; }
ok()    { printf "%s✓ %s%s\n" "$C_GREEN" "$C_RESET" "$*"; }
warn()  { printf "%s! %s%s\n" "$C_YELLOW" "$C_RESET" "$*"; }
err()   { printf "%s✗ %s%s\n" "$C_RED" "$C_RESET" "$*" >&2; }
step()  { printf "\n%s▶ %s%s%s\n" "$C_BOLD" "$C_CYAN" "$*" "$C_RESET"; }

# 读取部署配置文件（.env.deploy）；环境变量 / 命令行参数已设置的值不被文件覆盖
load_deploy_env() {
  local f="$1"
  [[ -f "$f" ]] || return 0
  # 记录当前值（环境变量 / 命令行参数优先于文件）
  local _h="${DEPLOY_HOST-}" _u="${DEPLOY_USER-}" _p="${DEPLOY_PORT-}" _pa="${DEPLOY_PATH-}" _k="${SSH_KEY-}" _pw="${DEPLOY_PASS-}"
  # shellcheck disable=SC1090
  source "$f" || { err "读取配置文件失败，请检查语法: $f"; exit 1; }
  if [[ -n "$_h"  ]]; then DEPLOY_HOST="$_h";  fi
  if [[ -n "$_u"  ]]; then DEPLOY_USER="$_u";  fi
  if [[ -n "$_p"  ]]; then DEPLOY_PORT="$_p";  fi
  if [[ -n "$_pa" ]]; then DEPLOY_PATH="$_pa"; fi
  if [[ -n "$_k"  ]]; then SSH_KEY="$_k";      fi
  if [[ -n "$_pw" ]]; then DEPLOY_PASS="$_pw"; fi
}

# ───────────────────────── 参数解析 ─────────────────────────
usage() {
  cat <<'EOF'
用法：
  ./deploy.sh                          # 构建 + 同步 + 重启（两端）
  ./deploy.sh --no-build               # 跳过本地构建，直接同步已有产物
  ./deploy.sh --only backend           # 只部署后端
  ./deploy.sh --only frontend          # 只部署前端
  ./deploy.sh --no-restart             # 只同步，不重启容器
  ./deploy.sh --env-file .env.prod     # 指定其它配置文件（默认读取 .env.deploy）

配置优先级：命令行参数 > 环境变量 > .env.deploy 文件 > 脚本默认值
服务器地址 / 路径等写入项目根目录的 .env.deploy 后即可直接 ./deploy.sh。

可配置项（环境变量 / .env.deploy 均可）：
  DEPLOY_HOST   服务器 IP 或域名（必填）   --host
  DEPLOY_PATH   服务器部署目录            --path   （默认 /opt/kf-ai-crm）
  DEPLOY_USER   SSH 用户                  --user   （默认 root）
  DEPLOY_PORT   SSH 端口                  --port   （默认 22）
  SSH_KEY       私钥路径（密钥登录）       --key
  DEPLOY_PASS   SSH 密码（密码登录）       写入 .env.deploy，需本机装 sshpass
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-build)        DO_BUILD=0; shift ;;
    --no-restart)      DO_RESTART=0; shift ;;
    --only)
      [[ $# -ge 2 ]] || { err "--only 需要参数 backend|frontend|all"; exit 1; }
      TARGET="$2"; shift 2 ;;
    --only=*)          TARGET="${1#--only=}"; shift ;;
    --host)            DEPLOY_HOST="$2"; shift 2 ;;
    --host=*)          DEPLOY_HOST="${1#--host=}"; shift ;;
    --path)            DEPLOY_PATH="$2"; shift 2 ;;
    --path=*)          DEPLOY_PATH="${1#--path=}"; shift ;;
    --user)            DEPLOY_USER="$2"; shift 2 ;;
    --user=*)          DEPLOY_USER="${1#--user=}"; shift ;;
    --port)            DEPLOY_PORT="$2"; shift 2 ;;
    --port=*)          DEPLOY_PORT="${1#--port=}"; shift ;;
    --key)             SSH_KEY="$2"; shift 2 ;;
    --key=*)           SSH_KEY="${1#--key=}"; shift ;;
    --env-file)        ENV_FILE="$2"; ENV_FILE_EXPLICIT=1; shift 2 ;;
    --env-file=*)      ENV_FILE="${1#--env-file=}"; ENV_FILE_EXPLICIT=1; shift ;;
    -h|--help)         usage; exit 0 ;;
    *) err "未知参数: $1"; usage; exit 1 ;;
  esac
done

# 读取部署配置文件（环境变量 / 命令行参数优先于文件）
load_deploy_env "$ENV_FILE"
if [[ $ENV_FILE_EXPLICIT = 1 && ! -f "$ENV_FILE" ]]; then
  warn "配置文件不存在: ${ENV_FILE}（将使用环境变量 / 命令行参数）"
fi

# 应用脚本默认值（仅填充未设置的项）
DEPLOY_HOST="${DEPLOY_HOST:-}"
DEPLOY_USER="${DEPLOY_USER:-root}"
DEPLOY_PORT="${DEPLOY_PORT:-22}"
DEPLOY_PATH="${DEPLOY_PATH:-/opt/kf-ai-crm}"
SSH_KEY="${SSH_KEY:-}"
DEPLOY_PASS="${DEPLOY_PASS:-}"

case "$TARGET" in
  all|backend|frontend) ;;
  *) err "--only 只支持 backend | frontend | all"; usage; exit 1 ;;
esac

[[ -n "$DEPLOY_HOST" ]] || { err "必须指定服务器地址：在 .env.deploy 中设置 DEPLOY_HOST，或用 --host，或导出 DEPLOY_HOST 环境变量"; usage; exit 1; }

# ───────────────────────── SSH / rsync 公共参数 ─────────────────────────
SSH_OPTS=(-p "$DEPLOY_PORT" -o StrictHostKeyChecking=accept-new -o ConnectTimeout=10)
[[ -n "$SSH_KEY" ]] && SSH_OPTS+=(-i "$SSH_KEY")
REMOTE="${DEPLOY_USER}@${DEPLOY_HOST}"

if [[ -n "${DEPLOY_PASS:-}" ]]; then
  # 密码登录：用 sshpass 注入；-e 从 SSHPASS 环境变量读取，避免密码出现在命令行/ps
  if ! command -v sshpass >/dev/null 2>&1; then
    err "已配置 DEPLOY_PASS 但未安装 sshpass"
    printf "  macOS:  brew install hudochenkov/sshpass/sshpass\n" >&2
    printf "  Ubuntu: apt install sshpass\n" >&2
    exit 1
  fi
  export SSHPASS="$DEPLOY_PASS"
  RSYNC_E="sshpass -e ssh ${SSH_OPTS[*]}"
else
  RSYNC_E="ssh ${SSH_OPTS[*]}"
fi

# 远程命令执行（按需注入 sshpass / 端口 / 私钥）
rssh() {
  if [[ -n "${DEPLOY_PASS:-}" ]]; then
    sshpass -e ssh "${SSH_OPTS[@]}" "$@"
  else
    ssh "${SSH_OPTS[@]}" "$@"
  fi
}

# ───────────────────────── 构建 ─────────────────────────
build_backend() {
  step "构建后端（server/）"
  ( cd "$ROOT_DIR/server" && pnpm install && pnpm build )
  ok "后端构建完成 -> server/dist/"
}

build_frontend() {
  step "构建前端（manage-ui-react/）"
  ( cd "$ROOT_DIR/manage-ui-react" && pnpm install && pnpm build )
  ok "前端构建完成 -> manage-ui-react/dist/"
}

# ───────────────────────── 同步产物 ─────────────────────────
ensure_remote_dirs() {
  info "确保远端目录存在: $DEPLOY_PATH"
  rssh "$REMOTE" \
    "mkdir -p '$DEPLOY_PATH/server' '$DEPLOY_PATH/manage-ui-react' '$DEPLOY_PATH/logs'"
}

sync_backend() {
  info "同步 server/dist -> $REMOTE:$DEPLOY_PATH/server/dist/"
  # --delete：远端 dist 与本地保持一致，删除已不存在的旧文件
  rsync -avz --delete -e "$RSYNC_E" \
    "$ROOT_DIR/server/dist/" \
    "$REMOTE:$DEPLOY_PATH/server/dist/"
  ok "后端产物已同步"
}

sync_frontend() {
  info "同步 manage-ui-react/dist -> $REMOTE:$DEPLOY_PATH/manage-ui-react/dist/"
  rsync -avz --delete -e "$RSYNC_E" \
    "$ROOT_DIR/manage-ui-react/dist/" \
    "$REMOTE:$DEPLOY_PATH/manage-ui-react/dist/"
  ok "前端产物已同步"
}

sync_config() {
  # nginx 站点配置与生产 compose 文件（单文件，不用 --delete）
  info "同步 nginx.conf 与 docker-compose-prod.yml"
  rsync -avz -e "$RSYNC_E" \
    "$ROOT_DIR/manage-ui-react/nginx.conf" \
    "$REMOTE:$DEPLOY_PATH/manage-ui-react/nginx.conf"
  rsync -avz -e "$RSYNC_E" \
    "$ROOT_DIR/docker-compose-prod.yml" \
    "$REMOTE:$DEPLOY_PATH/docker-compose-prod.yml"
  ok "配置文件已同步"
}

# ───────────────────────── 重启容器 ─────────────────────────
restart_containers() {
  step "重建并重启容器（仅 backend / frontend，不影响基础设施）"

  # 根据 --only 决定要重建的服务
  case "$TARGET" in
    backend)   SERVICES="backend" ;;
    frontend)  SERVICES="frontend" ;;
    all)       SERVICES="backend frontend" ;;
  esac

  # --force-recreate：backend 是长驻 node 进程，已加载旧代码到内存，
  # 仅更新 bind-mount 的 dist 不会重载；必须重建容器才会重新执行
  # 启动命令（pnpm install -> prisma migrate -> pnpm start）加载新代码。
  # --no-deps：不触碰 postgres/redis/minio。
  rssh "$REMOTE" \
    "cd '$DEPLOY_PATH' && docker compose -f docker-compose-prod.yml up -d --no-deps --force-recreate $SERVICES"
  ok "容器已重建"
}

# 后端启动较慢（容器内重新 install + migrate），轮询健康状态直到 healthy
wait_backend_healthy() {
  [[ " $TARGET " == *" backend "* ]] || return 0
  step "等待后端健康检查通过（首次启动约 1-3 分钟）"
  # 远端轮询脚本：单引号字面量，$cid/$s/$(...) 交给远端 shell 展开
  # （脚本内不含单引号，故可整体包在 '' 里；docker inspect 格式改用双引号以避开单引号转义）
  local remote_script
  remote_script='cid=$(docker compose -f docker-compose-prod.yml ps -q backend)
if [ -z "$cid" ]; then echo "  找不到 backend 容器"; exit 1; fi
for i in $(seq 1 90); do
  s=$(docker inspect --format="{{.State.Health.Status}}" "$cid" 2>/dev/null || echo starting)
  printf "  [%2d/90] backend health: %s\n" "$i" "$s"
  [ "$s" = "healthy" ] && exit 0
  sleep 5
done
echo "  超时：后端仍未 healthy，请用 docker logs 排查"
exit 1'
  # 以命令字符串传递（而非 stdin），避免 sshpass 的 pty 可能干扰多行 stdin；
  # printf %q 安全转义 DEPLOY_PATH，cd 失败则因 && 短路而整体失败
  local esc_path; esc_path=$(printf %q "$DEPLOY_PATH")
  if rssh "$REMOTE" "cd $esc_path && $remote_script"; then
    ok "后端已就绪"
  else
    warn "后端健康检查未通过，部署可能未完成，请登录服务器排查"
  fi
}

show_status() {
  step "容器状态"
  rssh "$REMOTE" \
    "cd '$DEPLOY_PATH' && docker compose -f docker-compose-prod.yml ps" || true
}

# ───────────────────────── 主流程 ─────────────────────────
info "部署目标: $REMOTE:$DEPLOY_PATH"
info "部署范围: $TARGET  |  构建: $([ $DO_BUILD = 1 ] && echo yes || echo no)  |  重启: $([ $DO_RESTART = 1 ] && echo yes || echo no)"

if [[ $DO_BUILD = 1 ]]; then
  case "$TARGET" in
    backend)   build_backend ;;
    frontend)  build_frontend ;;
    all)       build_backend; build_frontend ;;
  esac
fi

ensure_remote_dirs

case "$TARGET" in
  backend)   sync_backend ;;
  frontend)  sync_frontend ;;
  all)       sync_backend; sync_frontend ;;
esac
sync_config

if [[ $DO_RESTART = 1 ]]; then
  restart_containers
  wait_backend_healthy
  show_status
fi

step "部署完成"
ok "$REMOTE:$DEPLOY_PATH  ($TARGET)"
