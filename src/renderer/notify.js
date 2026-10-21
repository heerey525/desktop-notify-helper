const params = new URLSearchParams(location.search)
const id = params.get('id') || ''
const duration = Math.max(0, Math.floor(Number(params.get('duration')) || 0))

document.getElementById('title').textContent = params.get('title') || '提醒'
document.getElementById('body').textContent = params.get('body') || ''
document.getElementById('due').textContent = `计划时间 ${params.get('due') || ''}`

const timerEl = document.getElementById('timer')

function closeSelf() {
  window.api.dismissNotify(id)
  window.close()
}

document.getElementById('close').addEventListener('click', closeSelf)
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeSelf()
})

setTimeout(() => playSound(params.get('sound') || 'ding'), 120)

if (duration > 0) {
  let left = duration
  const paint = () => {
    timerEl.textContent = `${left} 秒后自动关闭`
  }
  paint()
  const interval = setInterval(() => {
    left -= 1
    if (left <= 0) {
      clearInterval(interval)
      closeSelf()
      return
    }
    paint()
  }, 1000)
}
