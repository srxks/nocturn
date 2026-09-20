import { useState, useEffect } from 'react'
import { Lock, RefreshCw, CheckCircle2, LogOut, Download } from 'lucide-react'
import {
  getMsTodoConnectionState,
  connectMicrosoftAccount,
  disconnectMicrosoftAccount,
  syncWithMicrosoftTodo,
  exportNocturnTasksForMicrosoftTodo,
} from '../../services/microsoftTodoService'
import { useAuth } from '../../context/useAuth'

export default function IntegrationCard({ title, description, icon: Icon }) {
  const { user } = useAuth()
  const isMsTodo = title.toLowerCase().includes('microsoft')

  const [conn, setConn] = useState(() => (isMsTodo ? getMsTodoConnectionState() : null))
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncFeedback, setSyncFeedback] = useState(null)
  const [showConnectModal, setShowConnectModal] = useState(false)
  const [emailInput, setEmailInput] = useState('')

  useEffect(() => {
    if (!isMsTodo) return
    const handleState = (e) => {
      setConn(e.detail)
    }
    window.addEventListener('nocturn:ms-todo-state-changed', handleState)
    return () => window.removeEventListener('nocturn:ms-todo-state-changed', handleState)
  }, [isMsTodo])

  const handleConnect = async (e) => {
    e?.preventDefault()
    const targetEmail = emailInput.trim() || user?.email || 'user@outlook.com'
    await connectMicrosoftAccount(targetEmail)
    setShowConnectModal(false)
    setEmailInput('')
    setSyncFeedback('Connected to Microsoft To Do')
    setTimeout(() => setSyncFeedback(null), 3500)
  }

  const handleDisconnect = () => {
    disconnectMicrosoftAccount()
    setSyncFeedback('Disconnected')
    setTimeout(() => setSyncFeedback(null), 2500)
  }

  const handleSync = async () => {
    setIsSyncing(true)
    setSyncFeedback(null)
    const res = await syncWithMicrosoftTodo(user?.id)
    setIsSyncing(false)
    if (res.success) {
      setSyncFeedback('Synchronized with Microsoft To Do')
    } else {
      setSyncFeedback(`Sync note: ${res.error || 'Check network'}`)
    }
    setTimeout(() => setSyncFeedback(null), 4000)
  }

  const handleExport = async () => {
    const tasks = await exportNocturnTasksForMicrosoftTodo(user?.id)
    const blob = new Blob([JSON.stringify(tasks, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nocturn-microsoft-todo-export-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    setSyncFeedback(`Exported ${tasks.length} tasks`)
    setTimeout(() => setSyncFeedback(null), 3000)
  }

  return (
    <div className="nocturn-card p-5 sm:p-6 border border-nocturn-border space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div
            className={`w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0 ${
              isMsTodo && conn?.isConnected
                ? 'bg-nocturn-accent/15 border-nocturn-accent/30 text-nocturn-accent'
                : 'bg-nocturn-surface border-nocturn-border text-nocturn-muted'
            }`}
          >
            <Icon className="w-5 h-5 stroke-[2]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm sm:text-base font-semibold text-white block truncate">
                {title}
              </span>
              {isMsTodo && conn?.isConnected && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  Connected
                </span>
              )}
            </div>
            <span className="text-xs text-nocturn-muted block truncate">
              {isMsTodo && conn?.isConnected
                ? `Active account: ${conn.accountEmail || 'Connected'}`
                : description}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
          {isMsTodo ? (
            conn?.isConnected ? (
              <>
                <button
                  type="button"
                  onClick={handleSync}
                  disabled={isSyncing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white transition-all cursor-pointer disabled:opacity-50"
                  title="Run two-way sync"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-nocturn-accent' : ''}`} />
                  <span>Sync</span>
                </button>

                <button
                  type="button"
                  onClick={handleExport}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-nocturn-muted hover:text-white transition-all cursor-pointer"
                  title="Export tasks for Microsoft To Do"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export</span>
                </button>

                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="p-2 rounded-xl text-nocturn-muted hover:text-rose-400 bg-white/[0.04] hover:bg-rose-500/10 border border-white/[0.08] hover:border-rose-500/30 transition-all cursor-pointer"
                  title="Disconnect account"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setShowConnectModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-nocturn-accent hover:bg-nocturn-accent-bright text-white shadow-sm transition-all cursor-pointer"
              >
                <span>Connect</span>
              </button>
            )
          ) : (
            <button
              type="button"
              disabled
              aria-label={`${title} integration coming soon`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-nocturn-muted bg-nocturn-surface/60 border border-nocturn-border cursor-not-allowed opacity-75 shrink-0"
            >
              <Lock className="w-3 h-3 stroke-[2]" />
              <span>Coming soon</span>
            </button>
          )}
        </div>
      </div>

      {/* Sync / Feedback Status Notice */}
      {syncFeedback && (
        <div className="pt-2 border-t border-white/[0.06] text-xs text-nocturn-accent flex items-center gap-1.5 font-medium">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>{syncFeedback}</span>
        </div>
      )}

      {/* Connect Microsoft Account Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#0e0f14] border border-white/10 rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-white">Connect Microsoft To Do</h3>
              <p className="text-xs text-nocturn-muted">
                Enter your Outlook or Microsoft 365 account to enable two-way sync.
              </p>
            </div>

            <form onSubmit={handleConnect} className="space-y-3">
              <input
                type="email"
                autoFocus
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="your.email@outlook.com"
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white placeholder:text-nocturn-muted outline-none focus:border-nocturn-accent"
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConnectModal(false)}
                  className="px-3 py-1.5 rounded-xl text-xs text-nocturn-muted hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-nocturn-accent hover:bg-nocturn-accent-bright text-white shadow-sm"
                >
                  Connect Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
