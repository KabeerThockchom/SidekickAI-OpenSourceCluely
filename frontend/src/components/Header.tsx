import { Button } from './ui/button'
import { ReloadIcon, SpeakerLoudIcon } from '@radix-ui/react-icons'
import type { ConnectionStatus } from '../types'

interface HeaderProps {
  status: ConnectionStatus
  onReconnect: () => void
  onStartRecording: () => void
}

export function Header({ status, onReconnect, onStartRecording }: HeaderProps) {
  const { isConnected } = status

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Left: Logo and Title */}
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="SidekickAI"
              className="h-10 object-contain"
            />
            <div className="border-l border-gray-200 pl-3">
              <h1 className="text-lg font-semibold text-gray-900">Sales Engineer Copilot</h1>
              <p className="text-xs text-gray-500">Real-time meeting assistant</p>
            </div>
          </div>

          {/* Right: Status and Actions */}
          <div className="flex items-center gap-3">
            {/* Connection Status */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-full">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-xs font-medium text-gray-600">
                {isConnected ? 'Live' : 'Offline'}
              </span>
            </div>

            {/* Reconnect Button */}
            {!isConnected && (
              <Button variant="outline" size="sm" onClick={onReconnect}>
                <ReloadIcon className="w-4 h-4 mr-1" />
                Reconnect
              </Button>
            )}

            {/* Start Recording Button */}
            <Button
              size="sm"
              onClick={onStartRecording}
              disabled={!isConnected}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <SpeakerLoudIcon className="w-4 h-4 mr-1" />
              {isConnected ? 'Recording...' : 'Start Recording'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
