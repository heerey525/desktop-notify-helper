# 桌面通知助手

跨平台桌面定时通知应用。设定精确到秒的提醒时间，到点在桌面弹出置顶通知卡片并播放提示音，支持自定义标题与正文、任务增删改查、通知常驻或按时长自动关闭。

![任务管理界面](build/screenshot-main.png)

![通知弹窗](build/screenshot-notify.png)

## 安装

从 [Releases](../../releases) 下载 `桌面通知助手.dmg`，双击挂载后把应用拖进 `Applications` 文件夹。

本机构建的应用使用 ad-hoc 签名，首次在其他 Mac 上打开若被 Gatekeeper 拦截，执行：

```bash
xattr -dr com.apple.quarantine /Applications/桌面通知助手.app
```

## 使用

1. 左侧选择日期并填写 `时:分:秒`，可用「1 分钟后 / 5 分钟后 / 1 小时后 / 明天 09:00」快捷填充
2. 分别填写通知标题与正文（正文支持换行）
3. 选择提示音：叮 / 铃 / 钟 / 蜂鸣 / 静音
4. 展示时长填秒数则到时自动关闭，填 `0` 表示常驻直到手动关闭
5. 保存后右侧列表显示状态（待提醒 / 已提醒 / 已错过）与逐秒倒计时，支持编辑、立即提醒、删除

到点后屏幕右下角弹出置顶卡片，多个通知向上堆叠；点「关闭」或按 `Esc` 收起。关闭管理窗口不会退出应用，剩余任务到点仍会弹窗；彻底退出需点「退出应用」或 `Cmd+Q`。

任务数据保存在本机 `notification-tasks.json`（位于系统 userData 目录），不联网、不上传。

## 从源码运行

```bash
npm install
npm start
```

Electron 二进制下载受阻时，可复用 `~/Library/Caches/electron/` 中已缓存的 zip，解压到 `node_modules/electron/dist` 并写入 `path.txt`。

## 打包

```bash
bash scripts/make-app.sh   # 产出 dist/桌面通知助手.app
bash scripts/make-dmg.sh   # 产出 dist/桌面通知助手.dmg
```

`make-app.sh` 直接用 `node_modules/electron` 的运行时组装 bundle：复制运行时、装入应用代码、改写 `Info.plist`、重新 ad-hoc 签名，全程离线。

## 目录结构

```
src/
  main.js              主进程：200ms 轮询调度、任务 IPC、通知窗口创建与堆叠
  preload.js           contextBridge 暴露 window.api，关闭 nodeIntegration
  store.js             JSON 持久化，tmp + rename 原子写入
  renderer/
    index.html app.js styles.css        任务管理界面
    notify.html notify.js notify.css    透明无边框置顶通知卡片
    sound.js                            Web Audio 合成提示音，无外部音频素材
build/                 应用图标与图标生成脚本
scripts/               打包脚本
```

## 技术说明

- 提示音由 Web Audio 振荡器实时合成，不依赖音频文件，也不受系统通知音量策略影响
- 通知卡片是独立置顶窗口而非系统横幅，因此可以常驻、可自定义时长与样式；系统横幅作为补充，未授权时自动降级为仅应用内弹窗
- 应用重启后，已过期未触发的任务标记为「已错过」，由用户决定是否补提醒，避免一次性刷屏
