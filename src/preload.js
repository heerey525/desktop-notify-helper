const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  listTasks: () => ipcRenderer.invoke('tasks:list'),
  saveTask: (task) => ipcRenderer.invoke('tasks:save', task),
  deleteTask: (id) => ipcRenderer.invoke('tasks:delete', id),
  fireNow: (id) => ipcRenderer.invoke('tasks:fire-now', id),
  preview: (task) => ipcRenderer.invoke('notify:preview', task),
  clearFinished: () => ipcRenderer.invoke('tasks:clear-finished'),
  requestPermission: () => ipcRenderer.invoke('notify:request-permission'),
  quit: () => ipcRenderer.invoke('app:quit'),
  dismissNotify: (id) => ipcRenderer.send('notify:done', id),
  onTasksChanged: (cb) => {
    ipcRenderer.on('tasks:changed', (_e, list) => cb(list))
  },
})
