import { useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
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
    <Card className="h-[calc(100vh-280px)] flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <SpeakerLoudIcon className="w-5 h-5 text-gray-900" />
          <CardTitle className="text-base">Transcription</CardTitle>
        </div>
        <CardDescription>Live speech-to-text</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <div
          ref={containerRef}
          className="h-full overflow-y-auto px-6 pb-6 space-y-3"
        >
          {transcripts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
              <SpeakerLoudIcon className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-sm">No transcripts yet</p>
            </div>
          ) : (
            transcripts.map((transcript, index) => {
              const isSystem = transcript.source === 'system'
              return (
                <div
                  key={transcript.id || `${transcript.timestamp}-${index}`}
                  className={`p-3 rounded-lg border transition-colors ${
                    isSystem
                      ? 'bg-blue-50 border-blue-200 hover:border-blue-300'
                      : 'bg-gray-50 border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`text-xs font-semibold ${isSystem ? 'text-blue-700' : 'text-gray-500'}`}>
                      {isSystem ? '🖥️ System' : '🎤 You'}
                    </span>
                    <span className="text-xs font-medium text-gray-500">
                      {transcript.timestamp}
                    </span>
                    {transcript.confidence !== null && transcript.confidence !== undefined && (
                      <span className="text-xs text-gray-600 font-medium">
                        {Math.round(transcript.confidence * 100)}%
                      </span>
                    )}
                  </div>
                  <p className={`text-sm leading-relaxed ${isSystem ? 'text-blue-900' : 'text-gray-900'}`}>
                    {transcript.text}
                  </p>
                </div>
              )
            })
          )}
        </div>
      </CardContent>
    </Card>
  )
}
