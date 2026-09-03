'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Mail, CheckCircle2, XCircle, Send, Bell, BellOff, CalendarClock } from 'lucide-react'

const DVR_DAY_OPTIONS    = [7, 14, 30, 60]
const TRAIN_DAY_OPTIONS  = [7, 14, 30]
const HOUR_OPTIONS       = Array.from({ length: 24 }, (_, i) => i)
const REPEAT_OPTIONS     = ['ONCE', 'DAILY', 'WEEKLY'] as const

function formatHour(h: number): string {
  return `${String(h).padStart(2, '0')}:00`
}

function parseDayList(raw: string): number[] {
  return raw.split(',').map((s) => Number.parseInt(s.trim(), 10)).filter((n) => !Number.isNaN(n))
}

function serializeDayList(days: number[]): string {
  return [...days].sort((a, b) => b - a).join(',')
}

interface EmailSettings {
  id:                      string
  fromName:                string
  fromEmail:               string
  dvrReminderEnabled:      boolean
  trainingReminderEnabled: boolean
  actionReminderEnabled:   boolean
  schedulerEnabled:        boolean
  schedulerHour:           number
  dvrReminderDays:         string
  trainingReminderDays:    string
  actionGraceDays:         number
  reminderRepeatFrequency: string
  resendConfigured:        boolean
}

interface SchedulerForm {
  schedulerEnabled:        boolean
  schedulerHour:           number
  dvrReminderDays:         number[]
  trainingReminderDays:    number[]
  actionGraceDays:         number
  reminderRepeatFrequency: string
}

interface ToggleRowProps {
  label:       string
  description: string
  enabled:     boolean
  saving:      boolean
  onToggle:    () => void
}

function ToggleSwitch({ enabled, saving, onToggle, labelId }: {
  enabled: boolean; saving: boolean; onToggle: () => void; labelId?: string
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={saving}
      aria-pressed={enabled}
      aria-labelledby={labelId}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
        enabled ? 'bg-blue-600' : 'bg-gray-200'
      } ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

function ToggleRow({ label, description, enabled, saving, onToggle }: ToggleRowProps) {
  const id = `toggle-${label.replace(/\s+/g, '-').toLowerCase()}`
  return (
    <div className="flex items-center justify-between py-3 border-b last:border-0">
      <div className="flex-1 pr-4">
        <p id={id} className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
      <ToggleSwitch enabled={enabled} saving={saving} onToggle={onToggle} labelId={id} />
    </div>
  )
}

function DayCheckboxGroup({ options, selected, onChange, disabled }: {
  options: number[]; selected: number[]; onChange: (days: number[]) => void; disabled?: boolean
}) {
  function toggle(day: number) {
    if (selected.includes(day)) {
      onChange(selected.filter((d) => d !== day))
    } else {
      onChange([...selected, day])
    }
  }
  return (
    <div className="flex gap-2 flex-wrap">
      {options.map((day) => (
        <label
          key={day}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs cursor-pointer select-none transition-colors ${
            selected.includes(day)
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input
            type="checkbox"
            className="sr-only"
            checked={selected.includes(day)}
            onChange={() => { if (!disabled) toggle(day) }}
            disabled={disabled}
          />
          {day}d
        </label>
      ))}
    </div>
  )
}

export default function EmailNotificationsPage() {
  const t = useTranslations('emailSettings')
  const ts = useTranslations('schedulerConfig')

  const [settings, setSettings]         = useState<EmailSettings | null>(null)
  const [loading, setLoading]           = useState(true)
  const [savingFrom, setSavingFrom]     = useState(false)
  const [testingEmail, setTestingEmail] = useState(false)
  const [savingToggle, setSavingToggle] = useState<string | null>(null)
  const [savingSched, setSavingSched]   = useState(false)
  const [fromName, setFromName]         = useState('')
  const [fromEmail, setFromEmail]       = useState('')
  const [schedForm, setSchedForm]       = useState<SchedulerForm>({
    schedulerEnabled:        true,
    schedulerHour:           7,
    dvrReminderDays:         [30, 14, 7],
    trainingReminderDays:    [30, 14],
    actionGraceDays:         0,
    reminderRepeatFrequency: 'ONCE',
  })

  useEffect(() => {
    setLoading(true)
    fetch('/api/settings/email')
      .then((res) => res.json() as Promise<{ ok: boolean; data?: EmailSettings; message?: string }>)
      .then((json) => {
        if (json.ok && json.data) {
          setSettings(json.data)
          setFromName(json.data.fromName)
          setFromEmail(json.data.fromEmail)
          setSchedForm({
            schedulerEnabled:        json.data.schedulerEnabled,
            schedulerHour:           json.data.schedulerHour,
            dvrReminderDays:         parseDayList(json.data.dvrReminderDays),
            trainingReminderDays:    parseDayList(json.data.trainingReminderDays),
            actionGraceDays:         json.data.actionGraceDays,
            reminderRepeatFrequency: json.data.reminderRepeatFrequency,
          })
        }
      })
      .catch(() => { toast.error(t('errorLoading')) })
      .finally(() => { setLoading(false) })
  }, [t])

  async function patchSettings(body: Record<string, unknown>): Promise<EmailSettings | null> {
    const res  = await fetch('/api/settings/email', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })
    const json = await res.json() as { ok: boolean; data?: EmailSettings; message?: string }
    if (json.ok && json.data) {
      setSettings((prev) => prev ? { ...prev, ...json.data } : json.data ?? prev)
      return json.data
    }
    toast.error(json.message ?? t('errorSaving'))
    return null
  }

  async function handleSaveFrom() {
    setSavingFrom(true)
    try {
      const result = await patchSettings({ fromName, fromEmail })
      if (result) toast.success(t('senderSaved'))
    } catch {
      toast.error(t('errorSaving'))
    } finally {
      setSavingFrom(false)
    }
  }

  async function handleToggle(field: 'dvrReminderEnabled' | 'trainingReminderEnabled' | 'actionReminderEnabled') {
    if (!settings) return
    setSavingToggle(field)
    try {
      await patchSettings({ [field]: !settings[field] })
    } catch {
      toast.error(t('errorSaving'))
    } finally {
      setSavingToggle(null)
    }
  }

  async function handleTestEmail() {
    setTestingEmail(true)
    try {
      const res  = await fetch('/api/settings/email/test', { method: 'POST' })
      const json = await res.json() as { ok: boolean; data?: { to: string }; message?: string }
      if (json.ok) {
        toast.success(t('testSent', { email: json.data?.to ?? '' }))
      } else {
        toast.error(json.message ?? t('testFailed'))
      }
    } catch {
      toast.error(t('testFailed'))
    } finally {
      setTestingEmail(false)
    }
  }

  async function handleSaveScheduler() {
    setSavingSched(true)
    try {
      const result = await patchSettings({
        schedulerEnabled:        schedForm.schedulerEnabled,
        schedulerHour:           schedForm.schedulerHour,
        dvrReminderDays:         serializeDayList(schedForm.dvrReminderDays),
        trainingReminderDays:    serializeDayList(schedForm.trainingReminderDays),
        actionGraceDays:         schedForm.actionGraceDays,
        reminderRepeatFrequency: schedForm.reminderRepeatFrequency,
      })
      if (result) toast.success(ts('saved'))
    } catch {
      toast.error(t('errorSaving'))
    } finally {
      setSavingSched(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Mail className="w-6 h-6 text-blue-600" />
          {t('title')}
        </h1>
        <p className="text-sm text-gray-500 mt-1">{t('subtitle')}</p>
      </div>

      {/* Card 1 — Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('connectionStatus')}</CardTitle>
          <CardDescription>{t('connectionStatusDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-lg border">
            {settings?.resendConfigured ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-green-700">{t('resendConfigured')}</p>
                  <p className="text-xs text-gray-500">{t('resendConfiguredDesc')}</p>
                </div>
              </>
            ) : (
              <>
                <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-700">{t('resendNotConfigured')}</p>
                  <p className="text-xs text-gray-500">{t('resendNotConfiguredDesc')}</p>
                </div>
              </>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleTestEmail()}
            disabled={testingEmail || !settings?.resendConfigured}
            className="flex items-center gap-2"
          >
            {testingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {t('sendTestEmail')}
          </Button>
        </CardContent>
      </Card>

      {/* Card 2 — Sender Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('senderDetails')}</CardTitle>
          <CardDescription>{t('senderDetailsDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="em-name">{t('fromName')}</Label>
              <Input id="em-name" value={fromName} onChange={(e) => setFromName(e.target.value)} placeholder="PayrollPro" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="em-email">{t('fromEmail')}</Label>
              <Input id="em-email" type="email" value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} placeholder="noreply@yourdomain.com" />
            </div>
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={() => void handleSaveFrom()} disabled={savingFrom}>
              {savingFrom && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t('save')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Card 3 — Notification Toggles */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            {settings?.dvrReminderEnabled || settings?.trainingReminderEnabled || settings?.actionReminderEnabled
              ? <Bell className="w-4 h-4 text-blue-600" />
              : <BellOff className="w-4 h-4 text-gray-400" />}
            {t('notificationToggles')}
          </CardTitle>
          <CardDescription>{t('notificationTogglesDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          {settings && (
            <>
              <ToggleRow
                label={t('dvrReminder')}
                description={t('dvrReminderDesc')}
                enabled={settings.dvrReminderEnabled}
                saving={savingToggle === 'dvrReminderEnabled'}
                onToggle={() => void handleToggle('dvrReminderEnabled')}
              />
              <ToggleRow
                label={t('trainingReminder')}
                description={t('trainingReminderDesc')}
                enabled={settings.trainingReminderEnabled}
                saving={savingToggle === 'trainingReminderEnabled'}
                onToggle={() => void handleToggle('trainingReminderEnabled')}
              />
              <ToggleRow
                label={t('actionReminder')}
                description={t('actionReminderDesc')}
                enabled={settings.actionReminderEnabled}
                saving={savingToggle === 'actionReminderEnabled'}
                onToggle={() => void handleToggle('actionReminderEnabled')}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Card 4 — Scheduler Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-blue-600" />
            {ts('title')}
          </CardTitle>
          <CardDescription>{ts('subtitle')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Master switch */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">{ts('enableScheduler')}</p>
              <p className="text-xs text-gray-500 mt-0.5">{ts('enableSchedulerDesc')}</p>
            </div>
            <ToggleSwitch
              enabled={schedForm.schedulerEnabled}
              saving={false}
              onToggle={() => setSchedForm((f) => ({ ...f, schedulerEnabled: !f.schedulerEnabled }))}
            />
          </div>

          <div className={`space-y-5 ${!schedForm.schedulerEnabled ? 'opacity-40 pointer-events-none' : ''}`}>
            {/* Run hour */}
            <div className="space-y-1.5">
              <Label htmlFor="sched-hour">{ts('runHour')}</Label>
              <select
                id="sched-hour"
                value={schedForm.schedulerHour}
                onChange={(e) => setSchedForm((f) => ({ ...f, schedulerHour: Number.parseInt(e.target.value, 10) }))}
                className="w-40 border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {HOUR_OPTIONS.map((h) => (
                  <option key={h} value={h}>{formatHour(h)}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500">{ts('runHourDesc')}</p>
            </div>

            {/* DVR reminder days */}
            <div className="space-y-2">
              <Label>{ts('dvrReminderDays')}</Label>
              <DayCheckboxGroup
                options={DVR_DAY_OPTIONS}
                selected={schedForm.dvrReminderDays}
                onChange={(days) => setSchedForm((f) => ({ ...f, dvrReminderDays: days }))}
              />
              <p className="text-xs text-gray-500">{ts('dvrReminderDaysDesc')}</p>
            </div>

            {/* Training reminder days */}
            <div className="space-y-2">
              <Label>{ts('trainingReminderDays')}</Label>
              <DayCheckboxGroup
                options={TRAIN_DAY_OPTIONS}
                selected={schedForm.trainingReminderDays}
                onChange={(days) => setSchedForm((f) => ({ ...f, trainingReminderDays: days }))}
              />
              <p className="text-xs text-gray-500">{ts('trainingReminderDaysDesc')}</p>
            </div>

            {/* Action grace period */}
            <div className="space-y-1.5">
              <Label htmlFor="sched-grace">{ts('actionGraceDays')}</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="sched-grace"
                  type="number"
                  min={0}
                  max={30}
                  value={schedForm.actionGraceDays}
                  onChange={(e) => setSchedForm((f) => ({ ...f, actionGraceDays: Math.max(0, Math.min(30, Number.parseInt(e.target.value, 10) || 0)) }))}
                  className="w-24"
                />
                <span className="text-sm text-gray-500">{ts('days')}</span>
              </div>
              <p className="text-xs text-gray-500">{ts('actionGraceDaysDesc')}</p>
            </div>

            {/* Repeat frequency */}
            <div className="space-y-1.5">
              <Label htmlFor="sched-repeat">{ts('repeatFrequency')}</Label>
              <select
                id="sched-repeat"
                value={schedForm.reminderRepeatFrequency}
                onChange={(e) => setSchedForm((f) => ({ ...f, reminderRepeatFrequency: e.target.value }))}
                className="w-52 border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {REPEAT_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{ts(`repeat.${opt}`)}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500">{ts('repeatFrequencyDesc')}</p>
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t">
            <Button size="sm" onClick={() => void handleSaveScheduler()} disabled={savingSched}>
              {savingSched && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {ts('save')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
