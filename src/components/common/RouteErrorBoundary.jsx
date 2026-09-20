import React from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

export class RouteErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[RouteErrorBoundary] Caught error in route component:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  handleGoHome = () => {
    this.setState({ hasError: false, error: null })
    if (typeof window !== 'undefined') {
      window.location.href = '/tasks'
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full flex-1 flex items-center justify-center p-6 min-h-[360px]">
          <div className="max-w-md w-full bg-nocturn-card border border-nocturn-border rounded-2xl p-6 sm:p-8 text-center space-y-4 shadow-xl backdrop-blur-xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto shadow-inner">
              <AlertTriangle className="w-6 h-6 stroke-[2]" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-base sm:text-lg font-semibold text-white tracking-tight">
                Unable to display this view
              </h2>
              <p className="text-xs sm:text-sm text-nocturn-muted leading-relaxed">
                A temporary problem prevented this screen from loading properly. Your data is safe in offline storage.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.06] text-left">
                <span className="text-[11px] font-mono text-rose-300 block truncate">
                  {this.state.error.message}
                </span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs sm:text-sm font-medium bg-white/10 hover:bg-white/15 text-white border border-white/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Try Again</span>
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs sm:text-sm font-medium bg-nocturn-accent/15 hover:bg-nocturn-accent/25 text-nocturn-accent-bright border border-nocturn-accent/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Go to Tasks</span>
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default RouteErrorBoundary
