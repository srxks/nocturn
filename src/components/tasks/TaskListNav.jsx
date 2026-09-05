import { useState } from 'react'
import {
  Sun,
  ListTodo,
  CheckCircle2,
  CheckSquare,
  FolderPlus,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
} from 'lucide-react'
import { useTasks } from '../../context/useTasks'

export default function TaskListNav() {
  const {
    lists,
    activeListId,
    setActiveListId,
    tasks,
    createList,
    renameList,
    deleteList,
  } = useTasks()

  const [isAddingList, setIsAddingList] = useState(false)
  const [newListTitle, setNewListTitle] = useState('')
  const [editingListId, setEditingListId] = useState(null)
  const [editingName, setEditingName] = useState('')

  const handleCreateList = (e) => {
    e.preventDefault()
    if (!newListTitle.trim()) return
    createList(newListTitle.trim())
    setNewListTitle('')
    setIsAddingList(false)
  }

  const handleStartRename = (list) => {
    setEditingListId(list.id)
    setEditingName(list.name)
  }

  const handleSaveRename = (id) => {
    if (editingName.trim()) {
      renameList(id, editingName.trim())
    }
    setEditingListId(null)
  }

  // Count helper functions
  const myDayCount = tasks.filter((t) => (t.inMyDay || t.dueDate === new Date().toISOString().slice(0, 10)) && !t.completed).length
  const allCount = tasks.filter((t) => !t.completed).length
  const completedCount = tasks.filter((t) => t.completed).length

  const SYSTEM_VIEWS = [
    { id: 'my-day', name: 'My Day', icon: Sun, count: myDayCount },
    { id: 'all', name: 'All', icon: ListTodo, count: allCount },
    { id: 'completed', name: 'Completed', icon: CheckCircle2, count: completedCount },
  ]

  return (
    <aside className="w-full space-y-4 select-none">
      {/* System Views Navigation */}
      <div className="space-y-1">
        <span className="text-[11px] font-bold text-nocturn-muted uppercase tracking-wider px-2">
          Views
        </span>
        <div className="flex sm:flex-col overflow-x-auto gap-1 py-1 no-scrollbar">
          {SYSTEM_VIEWS.map((view) => {
            const Icon = view.icon
            const active = activeListId === view.id

            return (
              <button
                key={view.id}
                type="button"
                onClick={() => setActiveListId(view.id)}
                className={`flex-1 sm:flex-none flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer shrink-0 ${
                  active
                    ? 'bg-nocturn-accent/15 text-nocturn-accent-bright font-semibold border border-nocturn-accent/35 shadow-[0_0_12px_rgba(0,230,118,0.2)]'
                    : 'text-nocturn-muted hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 stroke-[2.2] ${active ? 'text-nocturn-accent' : ''}`} />
                  <span>{view.name}</span>
                </div>
                {view.count > 0 && (
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                      active
                        ? 'bg-nocturn-accent text-black'
                        : 'bg-nocturn-surface text-nocturn-muted border border-nocturn-border'
                    }`}
                  >
                    {view.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* User Custom Lists Navigation */}
      <div className="space-y-1.5 pt-2 border-t border-nocturn-border/60">
        <div className="flex items-center justify-between px-2">
          <span className="text-[11px] font-bold text-nocturn-muted uppercase tracking-wider">
            Lists
          </span>
          <button
            type="button"
            onClick={() => setIsAddingList(true)}
            aria-label="Create new list"
            className="text-nocturn-accent hover:text-nocturn-accent-bright p-1 rounded-lg hover:bg-nocturn-accent/10 transition-colors cursor-pointer"
          >
            <FolderPlus className="w-4 h-4 stroke-[2]" />
          </button>
        </div>

        {/* Custom Lists List */}
        <div className="space-y-1">
          {lists.map((list) => {
            const active = activeListId === list.id
            const listTasksCount = tasks.filter((t) => t.listId === list.id && !t.completed).length
            const isEditing = editingListId === list.id

            return (
              <div
                key={list.id}
                className={`group flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                  active
                    ? 'bg-nocturn-surface text-white font-semibold border border-nocturn-accent/30'
                    : 'text-nocturn-muted hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                {isEditing ? (
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      autoFocus
                      className="w-full bg-nocturn-bg text-white text-xs px-2 py-1 rounded border border-nocturn-accent outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveRename(list.id)}
                      className="text-nocturn-accent hover:text-white p-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingListId(null)}
                      className="text-nocturn-muted hover:text-white p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setActiveListId(list.id)}
                      className="flex-1 flex items-center gap-2.5 text-left truncate cursor-pointer py-1"
                    >
                      <CheckSquare className="w-4 h-4 stroke-[2] shrink-0 text-nocturn-accent/80" />
                      <span className="truncate">{list.name}</span>
                    </button>

                    <div className="flex items-center gap-1 shrink-0">
                      {listTasksCount > 0 && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-nocturn-card border border-nocturn-border text-nocturn-muted">
                          {listTasksCount}
                        </span>
                      )}

                      {!list.system && (
                        <div className="hidden group-hover:flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleStartRename(list)}
                            aria-label={`Rename ${list.name}`}
                            className="p-1 text-nocturn-muted hover:text-white rounded hover:bg-white/10"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteList(list.id)}
                            aria-label={`Delete ${list.name}`}
                            className="p-1 text-nocturn-muted hover:text-rose-400 rounded hover:bg-rose-400/10"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>

        {/* Add List Input Form */}
        {isAddingList && (
          <form onSubmit={handleCreateList} className="flex items-center gap-1.5 p-1 pt-2">
            <input
              type="text"
              value={newListTitle}
              onChange={(e) => setNewListTitle(e.target.value)}
              placeholder="List name..."
              autoFocus
              className="w-full bg-nocturn-surface text-white text-xs px-2.5 py-1.5 rounded-lg border border-nocturn-accent outline-none"
            />
            <button
              type="submit"
              disabled={!newListTitle.trim()}
              className="p-1.5 bg-nocturn-accent text-black rounded-lg disabled:opacity-40"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
            <button
              type="button"
              onClick={() => setIsAddingList(false)}
              className="p-1.5 text-nocturn-muted hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </form>
        )}
      </div>
    </aside>
  )
}
