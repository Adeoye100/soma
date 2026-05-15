import React, { useRef, useEffect, useState } from 'react'
import { AlertTriangle, Camera, CheckCircle } from 'lucide-react'

interface ProctorMonitorProps {
  examSessionId: string
  onViolation?: (violation: string) => void
  onSessionEnd?: () => void
}

export const ProctorMonitor: React.FC<ProctorMonitorProps> = ({
  examSessionId,
  onViolation,
  onSessionEnd
}) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [integrityScore, setIntegrityScore] = useState(100)
  const [violations, setViolations] = useState<string[]>([])
  const [faceDetected, setFaceDetected] = useState(false)
  const [isMonitoring, setIsMonitoring] = useState(true)

  // Start webcam
  useEffect(() => {
    const startWebcam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 }
        })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      } catch (error) {
        console.error('Failed to access webcam:', error)
        alert('Please allow webcam access for proctoring')
      }
    }

    startWebcam()

    return () => {
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
        tracks.forEach(track => track.stop())
      }
    }
  }, [])

  // Send frames to Python service
  useEffect(() => {
    if (!isMonitoring) return

    const interval = setInterval(async () => {
      if (canvasRef.current && videoRef.current && videoRef.current.readyState === 4) {
        try {
          const ctx = canvasRef.current.getContext('2d')
          if (ctx) {
            ctx.drawImage(videoRef.current, 0, 0)

            canvasRef.current.toBlob(async blob => {
              if (!blob) return

              const formData = new FormData()
              formData.append('file', blob)

              const response = await fetch('http://localhost:8000/api/proctoring/analyze-frame', {
                method: 'POST',
                body: formData
              })

              const data = await response.json()

              if (data.success) {
                setFaceDetected(data.face_detected)
                setViolations(data.violations)

                // Update integrity score
                setIntegrityScore(prev => {
                  const penalty = data.violations.length * 5
                  const newScore = Math.max(0, prev - penalty)
                  return newScore
                })

                // Call violation callback
                if (data.violations.length > 0 && onViolation) {
                  onViolation(data.violations[0])
                }

                // Log to backend
                try {
                  await fetch('/api/proctoring/log-violation', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      examSessionId,
                      ...data
                    })
                  })
                } catch (err) {
                  console.error('Failed to log violation:', err)
                }
              }
            }, 'image/jpeg')
          }
        } catch (error) {
          console.error('Frame analysis error:', error)
        }
      }
    }, 2000) // Send frame every 2 seconds

    return () => clearInterval(interval)
  }, [isMonitoring, examSessionId, onViolation])

  return (
    <div className="proctor-monitor bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg p-6 max-w-2xl mx-auto">
      {/* Video Feed */}
      <div className="relative mb-6 rounded-lg overflow-hidden border-2 border-blue-500 shadow-lg">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full aspect-video bg-black"
        />
        <canvas ref={canvasRef} className="hidden" width={640} height={480} />

        {/* Face Detection Indicator */}
        <div className="absolute top-4 right-4">
          {faceDetected ? (
            <div className="flex items-center gap-2 bg-green-500/90 text-white px-3 py-1 rounded-full text-sm font-semibold">
              <CheckCircle size={16} />
              Face Detected
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-red-500/90 text-white px-3 py-1 rounded-full text-sm font-semibold">
              <AlertTriangle size={16} />
              No Face
            </div>
          )}
        </div>
      </div>

      {/* Stats Panel */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Integrity Score */}
        <div className="bg-slate-700 rounded-lg p-4">
          <p className="text-slate-300 text-sm font-semibold mb-2">Integrity Score</p>
          <div className="flex items-end gap-3">
            <div className="text-4xl font-bold text-blue-400">{integrityScore}%</div>
            <div className="flex-1 bg-slate-600 rounded-full h-2">
              <div
                className={`h-full rounded-full transition-all ${
                  integrityScore >= 70
                    ? 'bg-green-500'
                    : integrityScore >= 40
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${integrityScore}%` }}
              />
            </div>
          </div>
        </div>

        {/* Session Info */}
        <div className="bg-slate-700 rounded-lg p-4">
          <p className="text-slate-300 text-sm font-semibold mb-2">Session</p>
          <p className="text-slate-400 text-xs font-mono truncate">{examSessionId}</p>
          <p className="text-slate-400 text-xs mt-2">
            Status: <span className="text-green-400">● Active</span>
          </p>
        </div>
      </div>

      {/* Violations Alert */}
      {violations.length > 0 && (
        <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={18} className="text-red-400" />
            <h3 className="text-red-400 font-semibold">Integrity Violations Detected</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {violations.map((violation, idx) => (
              <span
                key={idx}
                className="bg-red-500/30 text-red-200 px-3 py-1 rounded-full text-xs font-semibold"
              >
                {violation.replace('_', ' ')}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-3">
        <button
          onClick={() => setIsMonitoring(!isMonitoring)}
          className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-all ${
            isMonitoring
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-green-500 hover:bg-green-600 text-white'
          }`}
        >
          {isMonitoring ? '⏸ Pause Monitoring' : '▶ Resume Monitoring'}
        </button>
        <button
          onClick={() => {
            setIsMonitoring(false)
            onSessionEnd?.()
          }}
          className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-semibold transition-all"
        >
          End Session
        </button>
      </div>
    </div>
  )
}
