import { useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { SpeakerLoudIcon } from '@radix-ui/react-icons'
import type { Transcript } from '../types'

interface TranscriptPanelProps {
  transcripts: Transcript[]
}

export function TranscriptPanel({ transcripts }: TranscriptPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (containerRef.current && transcripts.length > 0) {
      containerRef.current.scrollTop = 0
    }
  }, [transcripts])

  return (
    <Card className="h-48 flex flex-col">
      <CardHeader className="py-2 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SpeakerLoudIcon className="w-4 h-4 text-gray-900" />
            <CardTitle className="text-sm">Live Transcript</CardTitle>
          </div>
          {transcripts.length > 0 && (
            <span className="text-xs text-gray-400">
              {transcripts.length} segments
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <div
          ref={containerRef}
          className="h-full overflow-y-auto px-4 pb-4 space-y-2"
        >
          {transcripts.length === 0 ? (
            <div className="flex items-center justify-center h-full text-center text-gray-400">
              <SpeakerLoudIcon className="w-6 h-6 mr-2 opacity-50" />
              <p className="text-sm">Waiting for audio...</p>
            </div>
          ) : (
            transcripts.map((transcript, index) => {
              // Determine speaker type
              const speaker = transcript.speaker || (transcript.source === 'system' ? 'them' : 'me')
              const isCustomer = speaker === 'them'

              return (
                <div
                  key={transcript.id || `${transcript.timestamp}-${index}`}
                  className={`flex items-start gap-2 p-2 rounded-lg text-sm ${
                    isCustomer
                      ? 'bg-blue-50 border border-blue-100'
                      : 'bg-gray-50 border border-gray-100'
                  }`}
                >
                  <div className="flex-shrink-0">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-semibold ${
                      isCustomer
                        ? 'bg-blue-200 text-blue-800'
                        : 'bg-gray-200 text-gray-700'
                    }`}>
                      {isCustomer ? 'THEM' : 'ME'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`leading-relaxed ${isCustomer ? 'text-blue-900' : 'text-gray-900'}`}>
                      {transcript.text}
                    </p>
                  </div>
                  <div className="flex-shrink-0 flex items-center gap-2 text-xs text-gray-400">
                    <span>{transcript.timestamp}</span>
                    {transcript.confidence !== null && transcript.confidence !== undefined && (
                      <span className="text-gray-500">
                        {Math.round(transcript.confidence * 100)}%
                      </span>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </CardContent>
    </Card>
  )
}
