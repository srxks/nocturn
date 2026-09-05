import { useState, useEffect } from 'react'
import { Database, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react'
import { testSupabaseConnection } from '../../lib/supabase'

export default function SupabaseConnectionCard() {
  const [status, setStatus] = useState({
    loading: true,
    configured: false,
    connected: false,
    message: 'Testing connection to Supabase...',
  })

  const runConnectionTest = async () => {
    setStatus((prev) => ({ ...prev, loading: true }))
    const result = await testSupabaseConnection()
    setStatus({
      loading: false,
      configured: result.configured,
      connected: result.connected,
      message: result.message,
    })
  }

  useEffect(() => {
    let isMounted = true
    testSupabaseConnection().then((result) => {
      if (isMounted) {
        setStatus({
          loading: false,
          configured: result.configured,
          connected: result.connected,
          message: result.message,
        })
      }
    })
    return () => {
      isMounted = false
    }
  }, [])

  return (
    <section className="space-y-3">
      <h2 className="text-sm sm:text-base font-semibold text-white tracking-wide px-1">
        Backend Connection (Supabase)
      </h2>
      <div className="nocturn-card p-5 sm:p-6 border border-nocturn-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-nocturn-surface border border-nocturn-border flex items-center justify-center text-nocturn-accent shrink-0">
            <Database className="w-5 h-5 stroke-[2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm sm:text-base font-bold text-white block">
                Supabase Connection
              </span>
              {status.loading ? (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/5 text-nocturn-muted border border-nocturn-border">
                  Testing...
                </span>
              ) : status.connected ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3" />
                  Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  <AlertTriangle className="w-3 h-3" />
                  Not Connected
                </span>
              )}
            </div>
            <span className="text-xs text-nocturn-muted block mt-0.5">
              {status.message}
            </span>
          </div>
        </div>

        <button
          onClick={runConnectionTest}
          disabled={status.loading}
          className="self-start sm:self-auto px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold border border-nocturn-border transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${status.loading ? 'animate-spin' : ''}`} />
          <span>Test Connection</span>
        </button>
      </div>
    </section>
  )
}
