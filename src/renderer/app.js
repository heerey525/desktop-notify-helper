const $ = (id) => document.getElementById(id)
const SOUND_LABEL = { ding: '叮', chime: '铃', bell: '钟', buzz: '蜂鸣', none: '静音' }
const STATUS_LABEL = { scheduled: '待提醒', fired: '已提醒', missed: '已错过' }

let tasks = []
let editingId = null

const pad = (n) => String(n).padStart(2, '0')

function toDateValue(ts) {
  const d = new Date(ts)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function toTimeValue(ts) {
  const d = new Date(ts)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function formatRemain(ms) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const d = Math.floor(total / 86400)
  const h = Math.floor((total % 86400) / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (d > 0) return `${d} 天 ${pad(h)}:${pad(m)}:${pad(s)}`
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}

function el(tag, className, text) {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

function showFormError(message) {
  $('formError').textContent = message || ''
}

function readForm() {
  return {
    id: editingId || undefined,
    date: $('fDate').value,
    time: $('fTime').value,
    title: $('fTitle').value,
    body: $('fBody').value,
    sound: $('fSound').value,
    duration: Number($('fDuration').value),
  }
}

function fillForm(task) {
  $('fDate').value = task.date
  $('fTime').value = task.time
  $('fTitle').value = task.title
  $('fBody').value = task.body
  $('fSound').value = task.sound
  $('fDuration').value = String(task.duration)
}

function resetForm() {
  editingId = null
  $('formTitle').textContent = '新建通知'
  $('btnSave').textContent = '保存任务'
  $('fTitle').value = ''
  $('fBody').value = ''
  $('fDuration').value = '60'
  $('fSound').value = 'ding'
  setOffset(600)
  showFormError('')
  render()
}

function setOffset(seconds) {
  const ts = Date.now() + seconds * 1000
  $('fDate').value = toDateValue(ts)
  $('fTime').value = toTimeValue(ts)
}

function setTomorrow(hour) {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(hour, 0, 0, 0)
  $('fDate').value = toDateValue(d.getTime())
  $('fTime').value = toTimeValue(d.getTime())
}

function row(task) {
  const node = el('div', `task${editingId === task.id ? ' editing' : ''}`)
  node.dataset.id = task.id
  node.appendChild(el('div', `stripe ${task.status}`))

  const main = el('div', 'task-main')
  const title = el('div', 'task-title')
  title.appendChild(el('span', '', task.title))
  title.appendChild(el('span', `pill ${task.status}`, STATUS_LABEL[task.status] || task.status))
  main.appendChild(title)
  if (task.body) main.appendChild(el('div', 'task-body', task.body))

  const meta = el('div', 'task-meta')
  meta.appendChild(el('span', '', `计划 ${task.date} ${task.time}`))
  meta.appendChild(el('span', '', `时长 ${task.duration > 0 ? `${task.duration} 秒` : '常驻'}`))
  meta.appendChild(el('span', '', `提示音 ${SOUND_LABEL[task.sound] || task.sound}`))
  if (task.status === 'scheduled') {
    meta.appendChild(el('span', 'remain', `还有 ${formatRemain(task.dueTs - Date.now())}`))
  } else if (task.firedAt) {
    meta.appendChild(el('span', '', `提醒于 ${toDateValue(task.firedAt)} ${toTimeValue(task.firedAt)}`))
  }
  main.appendChild(meta)
  node.appendChild(main)

  const actions = el('div', 'task-actions')
  const btn = (label, cls, handler) => {
    const b = el('button', `btn small ghost${cls ? ` ${cls}` : ''}`, label)
    b.type = 'button'
    b.addEventListener('click', handler)
    return b
  }
  actions.appendChild(
    btn('编辑', '', () => {
      editingId = task.id
      fillForm(task)
      showFormError('')
      $('formTitle').textContent = '编辑通知'
      $('btnSave').textContent = '保存修改'
      render()
    }),
  )
  actions.appendChild(btn('立即提醒', '', () => window.api.fireNow(task.id)))
  actions.appendChild(
    btn('删除', 'danger', () => {
      if (editingId === task.id) resetForm()
      window.api.deleteTask(task.id)
    }),
  )
  node.appendChild(actions)
  return node
}

function render() {
  const rows = $('rows')
  rows.replaceChildren(...tasks.map(row))
  $('empty').style.display = tasks.length ? 'none' : 'block'
  const scheduled = tasks.filter((t) => t.status === 'scheduled').length
  $('counts').textContent = tasks.length ? `共 ${tasks.length} 条 · ${scheduled} 条待提醒` : ''
  $('btnClear').disabled = !tasks.some((t) => t.status !== 'scheduled')
}

function sortTasks(list) {
  const rank = { scheduled: 0, missed: 1, fired: 2 }
  return [...list].sort((a, b) => (rank[a.status] - rank[b.status]) || a.dueTs - b.dueTs)
}

async function save() {
  const res = await window.api.saveTask(readForm())
  if (!res.ok) {
    showFormError(res.error)
    return
  }
  showFormError('')
  resetForm()
}

function init() {
  const now = Date.now()
  $('fDate').value = toDateValue(now + 600000)
  $('fTime').value = toTimeValue(now + 600000)

  $('btnSave').addEventListener('click', save)
  $('btnReset').addEventListener('click', resetForm)
  $('btnClear').addEventListener('click', () => window.api.clearFinished())
  $('btnQuit').addEventListener('click', () => window.api.quit())
  $('btnPreview').addEventListener('click', async () => {
    const form = readForm()
    form.id = undefined
    const res = await window.api.preview(form)
    if (!res.ok) showFormError(res.error)
  })
  document.querySelectorAll('.chip').forEach((chip) =>
    chip.addEventListener('click', () => {
      if (chip.dataset.offset) setOffset(Number(chip.dataset.offset))
      if (chip.dataset.tomorrow) setTomorrow(Number(chip.dataset.tomorrow))
    }),
  )

  window.api.onTasksChanged((list) => {
    tasks = sortTasks(list)
    render()
  })
  window.api.listTasks().then((list) => {
    tasks = sortTasks(list)
    render()
  })
  window.api.requestPermission().then((granted) => {
    const tag = $('sysState')
    tag.textContent = granted ? '系统横幅已授权' : '仅应用内弹窗'
    tag.classList.toggle('muted', !granted)
  })

  setInterval(() => {
    document.querySelectorAll('.task').forEach((node) => {
      const task = tasks.find((t) => t.id === node.dataset.id)
      const remain = node.querySelector('.remain')
      if (task && task.status === 'scheduled' && remain) {
        remain.textContent = `还有 ${formatRemain(task.dueTs - Date.now())}`
      }
    })
  }, 1000)
}

init()
