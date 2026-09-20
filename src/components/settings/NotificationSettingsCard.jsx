import { useState } from 'react'
import { Bell, BellRing, AlertCircle, Volume2 } from 'lucide-react'
import { Card, Badge, Button } from '../ui'
import {
  requestNotificationPermission,
  notifyTimerEnded,
  playCompletionChime,
} from '../../services/notificationService'

export default function NotificationSettingsCard() {
  const [isSupported] = useState(() => typeof window !== 'undefined' && 'Notification' in window)
  const [permission, setPermission] = useState(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission
    }
    return 'default'
  })
  const [testSent, setTestSent] = useState(false)

  const handleRequestPermission = async () => {
    const perm = await requestNotificationPermission()
    setPermission(perm)
  }

  const handleTestNotification = async () => {
    playCompletionChime()
    notifyTimerEnded('Test Focus Session', 25)
    setTestSent(true)
    setTimeout(() => setTestSent(false), 3000)
  }

  return (
    <section className="space-y-3">
      <h2 className="text-sm sm:text-base font-semibold text-white tracking-tight px-0.5">
        Desktop Notifications & Sound
      </h2>

      <Card className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-nocturn-accent shrink-0">
              <Bell className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-semibold text-white block">
                  Native OS Notifications
                </span>
                {!isSupported ? (
                  <Badge variant="danger" size="sm">
                    Unsupported
                  </Badge>
                ) : permission === 'granted' ? (
                  <Badge variant="success" size="sm" dot>
                    Enabled
                  </Badge>
                ) : permission === 'denied' ? (
                  <Badge variant="danger" size="sm" dot>
                    Blocked
                  </Badge>
                ) : (
                  <Badge variant="warning" size="sm" dot>
                    Not Enabled
                  </Badge>
                )}
              </div>
              <span className="text-xs text-nocturn-muted block mt-0.5">
                Delivers 5m timer warnings, session completions, and plan schedule reminders even when Nocturn is in the background.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            {permission !== 'granted' && isSupported && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleRequestPermission}
                icon={BellRing}
              >
                Enable Notifications
              </Button>
            )}

            <Button
              variant="secondary"
              size="sm"
              onClick={handleTestNotification}
              icon={Volume2}
            >
              {testSent ? 'Notification Sent!' : 'Test Sound & Alert'}
            </Button>
          </div>
        </div>

        {permission === 'denied' && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>
              Notifications are blocked in your browser settings. To receive focus warnings and plan reminders, allow notifications for this site in your browser's address bar.
            </span>
          </div>
        )}
      </Card>
    </section>
  )
}
