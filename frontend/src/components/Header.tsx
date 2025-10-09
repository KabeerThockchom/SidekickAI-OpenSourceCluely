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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left: Logo and Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center">
              <SpeakerLoudIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Live Transcription</h1>
              <p className="text-xs text-gray-500">Real-time speech-to-text with AI</p>
            </div>
          </div>

          {/* Right: Status and Actions */}
          <div className="flex items-center gap-3">
            {/* Connection Status */}
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm text-gray-600">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>

            {/* Reconnect Button */}
            {!isConnected && (
              <Button variant="outline" size="sm" onClick={onReconnect}>
                <ReloadIcon className="w-4 h-4" />
                Reconnect
              </Button>
            )}

            {/* Start Recording Button */}
            <Button
              size="sm"
              onClick={onStartRecording}
              disabled={!isConnected}
            >
              <SpeakerLoudIcon className="w-4 h-4" />
              Start Recording
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
