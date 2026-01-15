import type { QuickActionType } from '../types'

interface QuickActionsProps {
  onAction: (action: QuickActionType) => void
  isLoading?: boolean
}

const actions: Array<{ type: QuickActionType; icon: string; label: string; shortcut: string }> = [
  { type: 'objection_handler', icon: '🛡️', label: 'Objection Handler', shortcut: 'O' },
  { type: 'competitor_intel', icon: '🔍', label: 'Competitor Intel', shortcut: 'C' },
  { type: 'discovery_qs', icon: '💡', label: 'Discovery Qs', shortcut: 'D' },
  { type: 'roi_calculator', icon: '📊', label: 'ROI Calculator', shortcut: 'R' },
  { type: 'meeting_summary', icon: '📝', label: 'Meeting Summary', shortcut: 'S' },
  { type: 'next_steps', icon: '🎯', label: 'Next Steps', shortcut: 'N' }
]

export function QuickActions({ onAction, isLoading = false }: QuickActionsProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Quick Actions</h3>
        <span className="text-xs text-gray-400">Cmd/Ctrl + key</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {actions.map(action => (
          <button
            key={action.type}
            onClick={() => onAction(action.type)}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={`${action.label} (Cmd/Ctrl+${action.shortcut})`}
          >
            <span className="text-base">{action.icon}</span>
            <span className="text-gray-700">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
