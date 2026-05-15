import React, { useState, useEffect, useRef } from 'react';
import { proctorApi, MonitorResponse, ProctorApiError } from "/services/proctorApi";

interface ProctorMonitorProps {
    examSessionId: string;
    studentId: string;
    onSessionEnd: () => void;
    onViolation?: (violation: MonitorResponse) => void;
}

interface ViolationRecord {
    timestamp: number;
    reason: string;
    status: 'warning' | 'malpractice';
    duration: number;
}

/**
 * ProctorMonitor — Real-time exam surveillance component
 *
 * Captures video frames, sends to backend for analysis, tracks violations
 *
 * Like a digital proctor: always watching, never distracted,
 * logs everything faithfully.
 */
export const ProctorMonitor: React.FC<ProctorMonitorProps> = ({
                                                                  examSessionId,
                                                                  studentId,
                                                                  onSessionEnd,
                                                                  onViolation,
                                                              }) => {
    // Video stream reference
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // Monitoring state
    const [isMonitoring, setIsMonitoring] = useState(false);
    const [violations, setViolations] = useState<ViolationRecord[]>([]);
    const [currentStatus, setCurrentStatus] = useState<'normal' | 'warning' | 'malpractice'>('normal');
    const [statusMessage, setStatusMessage] = useState('Initializing proctoring...');
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Configuration
    const FRAME_CAPTURE_INTERVAL = 5000; // Capture frame every 5 seconds
    const MALPRACTICE_THRESHOLD = 120; // 2 minutes of sustained violation

    /**
     * Initialize camera and start monitoring
     */
    useEffect(() => {
        const startMonitoring = async () => {
            try {
                setErrorMessage(null);
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: { ideal: 640 },
                        height: { ideal: 480 },
                        facingMode: 'user',
                    },
                });

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    streamRef.current = stream;
                    setIsMonitoring(true);
                    setStatusMessage('Monitoring active');
                }
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Could not access camera';
                setErrorMessage(`Camera access denied: ${message}`);
                setStatusMessage('❌ Camera access denied');
            }
        };

        startMonitoring();

        return () => {
            // Cleanup: stop all tracks
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop());
            }
        };
    }, []);

    /**
     * Capture and analyze frames at regular intervals
     */
    useEffect(() => {
        if (!isMonitoring || !videoRef.current) return;

        const monitoringInterval = setInterval(async () => {
            try {
                setIsLoading(true);

                // Capture frame from video element
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                if (!ctx || !videoRef.current) return;

                canvas.width = videoRef.current.videoWidth || 640;
                canvas.height = videoRef.current.videoHeight || 480;

                ctx.drawImage(videoRef.current, 0, 0);

                // Convert canvas to blob
                const blob = await new Promise<Blob>((resolve) => {
                    canvas.toBlob((b) => {
                        if (b) resolve(b);
                    }, 'image/jpeg', 0.8);
                });

                // Send to backend
                const result = await proctorApi.monitorFrame(studentId, blob);

                // Update UI
                setCurrentStatus(result.status);

                if (result.status === 'normal') {
                    setStatusMessage('✓ Student focused');
                } else if (result.status === 'warning') {
                    setStatusMessage(`⚠️ ${result.reason} — ${result.duration || 0}s`);
                    setViolations((prev) => [
                        ...prev,
                        {
                            timestamp: Date.now(),
                            reason: result.reason,
                            status: 'warning',
                            duration: result.duration || 0,
                        },
                    ]);
                } else if (result.status === 'malpractice') {
                    setStatusMessage('🚨 MALPRACTICE DETECTED — Auto-submitting exam');
                    setViolations((prev) => [
                        ...prev,
                        {
                            timestamp: Date.now(),
                            reason: result.reason,
                            status: 'malpractice',
                            duration: result.duration || MALPRACTICE_THRESHOLD,
                        },
                    ]);
                    onViolation?.(result);
                    onSessionEnd();
                }

                setIsLoading(false);
            } catch (error) {
                setIsLoading(false);

                if (error instanceof ProctorApiError) {
                    console.error(`[ProctorMonitor] ${error.code}:`, error.message);
                    setErrorMessage(`Monitoring error: ${error.message}`);

                    // If network fails, log but don't crash the exam
                    if (error.code === 'NETWORK_ERROR') {
                        setStatusMessage('⚠️ Connection lost — retrying...');
                    }
                } else {
                    console.error('[ProctorMonitor] Unexpected error:', error);
                }
            }
        }, FRAME_CAPTURE_INTERVAL);

        return () => clearInterval(monitoringInterval);
    }, [isMonitoring, studentId, onSessionEnd, onViolation]);

    return (
        <div className="proctor-monitor">
            {/* Video Feed */}
            <div className="video-container">
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="proctor-video"
                />

                {/* Status Overlay */}
                <div className={`status-badge status-${currentStatus}`}>
                    {statusMessage}
                </div>

                {/* Loading Indicator */}
                {isLoading && <div className="spinner">Analyzing frame...</div>}
            </div>

            {/* Error Display */}
            {errorMessage && (
                <div className="error-banner">
                    <p>{errorMessage}</p>
                    <button onClick={() => setErrorMessage(null)}>Dismiss</button>
                </div>
            )}

            {/* Violation Log */}
            {violations.length > 0 && (
                <div className="violations-panel">
                    <h3>Violation Log ({violations.length})</h3>
                    <div className="violation-list">
                        {violations.map((v, idx) => (
                            <div
                                key={idx}
                                className={`violation-item violation-${v.status}`}
                            >
                <span className="time">
                  {new Date(v.timestamp).toLocaleTimeString()}
                </span>
                                <span className="reason">{v.reason}</span>
                                <span className="duration">{v.duration}s</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <style>{`
        .proctor-monitor {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          padding: 1.5rem;
          background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
          border-radius: 12px;
          border: 2px solid #334155;
        }

        .video-container {
          position: relative;
          aspect-ratio: 4 / 3;
          background: #000;
          border-radius: 8px;
          overflow: hidden;
          border: 2px solid #475569;
        }

        .proctor-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .status-badge {
          position: absolute;
          top: 1rem;
          right: 1rem;
          padding: 0.75rem 1.25rem;
          border-radius: 6px;
          font-weight: 600;
          font-size: 0.9rem;
          backdrop-filter: blur(8px);
          z-index: 10;
        }

        .status-normal {
          background: rgba(34, 197, 94, 0.2);
          border: 1px solid rgb(34, 197, 94);
          color: #22c55e;
        }

        .status-warning {
          background: rgba(250, 204, 21, 0.2);
          border: 1px solid rgb(250, 204, 21);
          color: #facc15;
          animation: pulse 1s infinite;
        }

        .status-malpractice {
          background: rgba(239, 68, 68, 0.2);
          border: 2px solid rgb(239, 68, 68);
          color: #ef4444;
          animation: pulse 0.6s infinite;
          font-weight: 700;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }

        .spinner {
          position: absolute;
          bottom: 1rem;
          left: 1rem;
          padding: 0.5rem 1rem;
          background: rgba(0, 0, 0, 0.8);
          color: #64748b;
          border-radius: 4px;
          font-size: 0.85rem;
        }

        .error-banner {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgb(239, 68, 68);
          border-radius: 8px;
          padding: 1rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: #fca5a5;
        }

        .error-banner button {
          background: rgba(239, 68, 68, 0.2);
          border: 1px solid rgb(239, 68, 68);
          color: #fca5a5;
          padding: 0.4rem 0.8rem;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s;
        }

        .error-banner button:hover {
          background: rgb(239, 68, 68);
          color: #fff;
        }

        .violations-panel {
          background: rgba(30, 41, 59, 0.8);
          border: 1px solid #334155;
          border-radius: 8px;
          padding: 1rem;
          max-height: 200px;
          overflow-y: auto;
        }

        .violations-panel h3 {
          color: #e2e8f0;
          font-size: 0.95rem;
          font-weight: 600;
          margin: 0 0 0.75rem 0;
        }

        .violation-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .violation-item {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem 0.75rem;
          border-radius: 4px;
          font-size: 0.85rem;
          align-items: center;
        }

        .violation-warning {
          background: rgba(250, 204, 21, 0.1);
          border-left: 3px solid rgb(250, 204, 21);
          color: #fcd34d;
        }

        .violation-malpractice {
          background: rgba(239, 68, 68, 0.1);
          border-left: 3px solid rgb(239, 68, 68);
          color: #fca5a5;
          font-weight: 600;
        }

        .time {
          color: #94a3b8;
          font-size: 0.8rem;
        }

        .reason {
          flex: 1;
          margin: 0 0.75rem;
        }

        .duration {
          color: #cbd5e1;
          font-weight: 600;
          min-width: 45px;
          text-align: right;
        }
      `}</style>
        </div>
    );
};