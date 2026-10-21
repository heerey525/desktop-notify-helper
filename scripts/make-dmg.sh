#!/bin/bash
# 先构建 .app，再生成可拖拽安装的 .dmg
set -euo pipefail

APP_NAME="桌面通知助手"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STAGE="$ROOT/dist/dmg-staging"
DMG="$ROOT/dist/$APP_NAME.dmg"

bash "$ROOT/scripts/make-app.sh"

VERSION="$(node -p "require('$ROOT/package.json').version")"
echo "==> 准备 DMG 内容（$APP_NAME $VERSION）"
rm -rf "$STAGE" "$DMG"
mkdir -p "$STAGE"
cp -R "$ROOT/dist/$APP_NAME.app" "$STAGE/"
ln -s /Applications "$STAGE/Applications"

echo "==> 生成压缩镜像"
hdiutil create -volname "$APP_NAME" -srcfolder "$STAGE" -ov -format UDZO -imagekey zlib-level=9 "$DMG" >/dev/null
rm -rf "$STAGE"

echo "==> 完成：$DMG（$(du -h "$DMG" | cut -f1)）"
