#!/bin/bash
# 用本地 node_modules/electron 的运行时组装成可双击的 .app，全程离线
set -euo pipefail

APP_NAME="桌面通知助手"
EXEC_NAME="NotifyHelper"
BUNDLE_ID="com.heerey.notify-helper"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RUNTIME="$ROOT/node_modules/electron/dist/Electron.app"
OUT="$ROOT/dist/$APP_NAME.app"
CONTENTS="$OUT/Contents"
RES="$CONTENTS/Resources"

[ -d "$RUNTIME" ] || { echo "缺少 Electron 运行时：$RUNTIME"; exit 1; }

echo "==> 清理旧产物"
rm -rf "$OUT"
mkdir -p "$OUT"

echo "==> 复制 Electron 运行时"
cp -R "$RUNTIME"/. "$OUT/"

echo "==> 装入应用代码"
rm -f "$RES/default_app.asar"
mkdir -p "$RES/app"
cp "$ROOT/package.json" "$RES/app/package.json"
cp -R "$ROOT/src" "$RES/app/src"

if [ -f "$ROOT/build/icon.icns" ]; then
  cp "$ROOT/build/icon.icns" "$RES/app.icns"
fi

echo "==> 改写 Info.plist"
PB=/usr/libexec/PlistBuddy
PLIST="$CONTENTS/Info.plist"
set_key() {
  local key="$1" val="$2"
  $PB -c "Set :$key $val" "$PLIST" 2>/dev/null || $PB -c "Add :$key string $val" "$PLIST"
}
mv "$CONTENTS/MacOS/Electron" "$CONTENTS/MacOS/$EXEC_NAME"
set_key CFBundleExecutable "$EXEC_NAME"
set_key CFBundleName "$APP_NAME"
set_key CFBundleDisplayName "$APP_NAME"
set_key CFBundleIdentifier "$BUNDLE_ID"
set_key CFBundleIconFile "app.icns"
set_key NSHumanReadableCopyright "本地定时通知，数据仅存于本机"

echo "==> 重新签名（ad-hoc）"
codesign --remove-signature "$OUT" 2>/dev/null || true
codesign --force --deep --sign - "$OUT"
xattr -dr com.apple.quarantine "$OUT" 2>/dev/null || true

echo "==> 完成：$OUT"
