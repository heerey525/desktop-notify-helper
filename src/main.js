const path = require('path')
const crypto = require('crypto')
const { app, BrowserWindow, ipcMain, Notification, Menu, screen } = require('electron')
const JsonStore = require('./store')

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')

const NOTIFY_W = 440
const NOTIFY_H = 224
const NOTIFY_GAP = 14
const NOTIFY_MARGIN = 18
const TICK_MS = 200

let tasks = []
let store = null
let mainWindow = null
let uiReady = false
const notifyWindows = new Map()

function nextId() {
  return crypto.randomUUID()
}

function persist() {
  store.save(tasks)
}

function broadcast() {
  if (!mainWindow || mainWindow.isDestroyed() || !uiReady) return
  mainWindow.webContents.send('tasks:changed', tasks)
}

// date: "YYYY-MM-DD", time: "HH:mm:ss" | "HH:mm" -> 本地时区时间戳
function toTimestamp(date, time) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date || ''))
  const t = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(String(time || ''))
  if (!m || !t) return NaN
  const ts = new Date(+m[1], +m[2] - 1, +m[3], +t[1], +t[2], t[3] ? +t[3] : 0, 0).getTime()
  return Number.isFinite(ts) ? ts : NaN
}

function pad(n) {
  return String(n).padStart(2, '0')
}

function fromDateInput(ts) {
  const d = new Date(ts)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function fromTimeInput(ts) {
  const d = new Date(ts)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function normalize(input) {
  const title = String(input.title || '').trim()
  const body = String(input.body || '').trim()
  if (!title && !body) return { error: '请至少填写通知标题或正文' }
  const dueTs = toTimestamp(input.date, input.time)
  if (!Number.isFinite(dueTs)) return { error: '请填写有效的日期和时间（时:分:秒）' }
  if (dueTs < Date.now() - 1500) return { error: '提醒时间已过，请设置为将来的时间' }
  const sound = ['ding', 'bell', 'buzz', 'chime', 'none'].includes(input.sound) ? input.sound : 'ding'
  const duration = Math.max(0, Math.min(24 * 3600, Math.floor(Number(input.duration) || 0)))
  return {
    task: {
      id: String(input.id || nextId()),
      date: String(input.date),
      time: String(input.time),
      title: title || '提醒',
      body,
      sound,
      duration,
      dueTs,
      createdAt: Number(input.createdAt) || Date.now(),
      status: 'scheduled',
      firedAt: 0,
    },
  }
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1040,
    height: 760,
    minWidth: 880,
    minHeight: 600,
    title: '桌面通知助手',
    backgroundColor: '#f4f6fa',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
    },
  })
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'))
  mainWindow.webContents.on('did-finish-load', () => {
    uiReady = true
    broadcast()
  })
  // 关闭管理窗口后继续后台调度，通知到点仍会弹出
  mainWindow.on('close', (e) => {
    if (app.isQuitting) return
    e.preventDefault()
    mainWindow.hide()
  })
}

function stackNotifyWindows() {
  const alive = [...notifyWindows.values()].filter((w) => !w.isDestroyed())
  const { workArea } = screen.getPrimaryDisplay()
  alive.forEach((win, i) => {
    win.setBounds({
      x: workArea.x + workArea.width - NOTIFY_MARGIN - NOTIFY_W,
      y: workArea.y + workArea.height - NOTIFY_MARGIN - NOTIFY_H - i * (NOTIFY_H + NOTIFY_GAP),
      width: NOTIFY_W,
      height: NOTIFY_H,
    })
  })
}

function showNotifyWindow(task) {
  const win = new BrowserWindow({
    width: NOTIFY_W,
    height: NOTIFY_H,
    show: false,
    frame: false,
    resizable: false,
    movable: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    transparent: true,
    title: task.title,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  notifyWindows.set(task.id, win)

  const query = new URLSearchParams({
    id: task.id,
    title: task.title,
    body: task.body,
    sound: task.sound,
    duration: String(task.duration),
    due: new Date(task.dueTs).toLocaleString('zh-CN', { hour12: false }),
  })
  win.loadFile(path.join(__dirname, 'renderer', 'notify.html'), { search: `?${query}` })

  win.once('ready-to-show', () => {
    stackNotifyWindows()
    win.setAlwaysOnTop(true, 'screen-saver', 1)
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
    win.show()
    win.focus()
    if (process.platform === 'darwin') app.dock.bounce('informational')
  })
  win.on('closed', () => {
    notifyWindows.delete(task.id)
    stackNotifyWindows()
  })
}

function fire(task) {
  task.status = 'fired'
  task.firedAt = Date.now()
  persist()
  broadcast()
  showNotifyWindow(task)
  // 系统级通知横幅作为补充（需系统授权，失败不影响弹窗）
  if (Notification.isSupported()) {
    try {
      const n = new Notification({ title: task.title, body: task.body, silent: true })
      n.show()
    } catch {}
  }
}

function tick() {
  const now = Date.now()
  let changed = false
  for (const task of tasks) {
    if (task.status === 'scheduled' && task.dueTs <= now) {
      fire(task)
      changed = true
    }
  }
  if (changed) broadcast()
}

function findTask(id) {
  return tasks.find((t) => t.id === id)
}

ipcMain.handle('tasks:list', () => tasks)

ipcMain.handle('tasks:save', (_e, input) => {
  const { task, error } = normalize(input || {})
  if (error) return { ok: false, error }
  const existing = findTask(task.id)
  if (existing) {
    Object.assign(existing, task, { createdAt: existing.createdAt })
  } else {
    tasks.push(task)
  }
  tasks.sort((a, b) => a.dueTs - b.dueTs)
  persist()
  broadcast()
  return { ok: true }
})

ipcMain.handle('tasks:delete', (_e, id) => {
  tasks = tasks.filter((t) => t.id !== id)
  const win = notifyWindows.get(id)
  if (win && !win.isDestroyed()) win.close()
  persist()
  broadcast()
  return { ok: true }
})

ipcMain.handle('tasks:fire-now', (_e, id) => {
  const task = findTask(id)
  if (!task) return { ok: false, error: '任务不存在' }
  task.dueTs = Date.now()
  task.date = fromDateInput(task.dueTs)
  task.time = fromTimeInput(task.dueTs)
  fire(task)
  return { ok: true }
})

ipcMain.handle('notify:preview', (_e, input) => {
  const now = new Date()
  const { task, error } = normalize({
    ...input,
    date: fromDateInput(now.getTime()),
    time: fromTimeInput(now.getTime()),
  })
  if (error) return { ok: false, error }
  task.id = nextId()
  task.dueTs = now.getTime()
  showNotifyWindow(task)
  return { ok: true }
})

ipcMain.handle('tasks:clear-finished', () => {
  tasks = tasks.filter((t) => t.status === 'scheduled')
  persist()
  broadcast()
  return { ok: true }
})

ipcMain.handle('app:quit', () => {
  app.quit()
  return { ok: true }
})

ipcMain.on('notify:done', (_e, id) => {
  const win = notifyWindows.get(id)
  if (win && !win.isDestroyed()) win.close()
})

// 供界面探测 macOS 系统通知授权状态
ipcMain.handle('notify:request-permission', async () => {
  if (!Notification.isSupported()) return false
  if (Notification.permission === 'granted') return true
  try {
    return (await Notification.requestPermission()) === 'granted'
  } catch {
    return false
  }
})

app.on('before-quit', () => {
  app.isQuitting = true
})

app.on('window-all-closed', () => {
  // 全部窗口关闭时保持后台运行，剩余任务到点仍会弹窗
})

app.on('activate', () => {
  if (!mainWindow || mainWindow.isDestroyed()) createMainWindow()
  else mainWindow.show()
})

app.whenReady().then(() => {
  store = new JsonStore(path.join(app.getPath('userData'), 'notification-tasks.json'))
  tasks = store.load([])

  // 关机/退出期间错过的任务标记为已错过，交由用户决定是否补提醒
  const now = Date.now()
  for (const task of tasks) {
    if (task.status === 'scheduled' && task.dueTs <= now) task.status = 'missed'
  }

  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      { role: 'appMenu' },
      { role: 'fileMenu' },
      { role: 'editMenu' },
      { role: 'viewMenu' },
      { role: 'windowMenu' },
    ]),
  )

  createMainWindow()
  stackNotifyWindows()
  tick()
  setInterval(tick, TICK_MS)
})
