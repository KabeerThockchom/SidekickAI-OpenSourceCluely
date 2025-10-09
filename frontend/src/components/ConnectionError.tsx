import { ExclamationTriangleIcon } from '@radix-ui/react-icons'

interface ConnectionErrorProps {
  isVisible: boolean
  reconnectAttempts: number
}

export function ConnectionError({ isVisible, reconnectAttempts }: ConnectionErrorProps) {
  if (!isVisible) return null

  return (
    <div className="bg-gray-50 border border-gray-300 rounded-lg p-4 mb-6">
      <div className="flex items-start gap-3">
        <ExclamationTriangleIcon className="w-5 h-5 text-gray-900 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-gray-900">Connection Error</h3>
          <p className="text-sm text-gray-700 mt-1">
            Connection lost. Attempting to reconnect...
            {reconnectAttempts > 0 && ` (Attempt ${reconnectAttempts})`}
          </p>
          <p className="text-xs text-gray-600 mt-2 font-mono">
            Make sure your backend server is running at <span className="bg-gray-200 px-1 rounded">ws://localhost:8000/ws</span>
          </p>
        </div>
      </div>
    </div>
  )
}
