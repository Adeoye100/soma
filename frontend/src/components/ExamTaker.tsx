import React, { useState, useEffect } from 'react'
import { ProctorMonitor } from './ProctorMonitor'
import type { SAMPLE_EXAMS } from '@/data/exams'

type ExamData = typeof SAMPLE_EXAMS['physics-101']

interface ExamTakerProps {
  exam: ExamData
  onComplete?: (score: number) => void
}

export const ExamTaker: React.FC<ExamTakerProps> = ({ exam, onComplete }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [timeLeft, setTimeLeft] = useState(exam.duration * 60)
  const [isComplete, setIsComplete] = useState(false)
  const [examSessionId] = useState(
    `exam_${exam.id}_${Date.now()}`
  )

  // Timer
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setIsComplete(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const handleAnswer = (optionIndex: number) => {
    setAnswers(prev => ({
      ...prev,
      [exam.questions[currentQuestion].id]: optionIndex
    }))
  }

  const handleNext = () => {
    if (currentQuestion < exam.questions.length - 1) {
      setCurrentQuestion(prev => prev + 1)
    }
  }

  const handlePrev = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1)
    }
  }

  const handleSubmit = () => {
    // Calculate score
    let correct = 0
    exam.questions.forEach(q => {
      if (answers[q.id] === q.correct) {
        correct++
      }
    })
    const score = Math.round((correct / exam.questions.length) * 100)
    onComplete?.(score)
    setIsComplete(true)
  }

  const question = exam.questions[currentQuestion]
  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60

  if (isComplete) {
    const correct = exam.questions.filter(
      q => answers[q.id] === q.correct
    ).length
    const score = Math.round((correct / exam.questions.length) * 100)
    const passed = score >= exam.passingScore

    return (
      <div className="max-w-2xl mx-auto p-6 bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg">
        <h2 className="text-3xl font-bold text-white mb-4">Exam Complete!</h2>
        <div className={`text-6xl font-bold mb-4 ${passed ? 'text-green-400' : 'text-red-400'}`}>
          {score}%
        </div>
        <p className="text-xl text-slate-300 mb-6">
          You got {correct} out of {exam.questions.length} questions correct
        </p>
        <p className={`text-lg font-semibold ${passed ? 'text-green-400' : 'text-red-400'}`}>
          {passed ? '✓ PASSED' : '✗ FAILED'}
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
      {/* Proctoring Monitor */}
      <div className="lg:col-span-1">
        <ProctorMonitor
          examSessionId={examSessionId}
          onSessionEnd={() => setIsComplete(true)}
        />
      </div>

      {/* Exam Content */}
      <div className="lg:col-span-2">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg p-6">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">{exam.title}</h2>
            <div className="flex justify-between items-center text-slate-400">
              <span>Question {currentQuestion + 1} of {exam.questions.length}</span>
              <span className="text-lg font-bold text-blue-400">
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </span>
            </div>
            <div className="mt-3 bg-slate-700 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{ width: `${((currentQuestion + 1) / exam.questions.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Question */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-white mb-6">{question.text}</h3>

            <div className="space-y-3">
              {question.options.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAnswer(idx)}
                  className={`w-full p-4 rounded-lg text-left font-semibold transition-all ${
                    answers[question.id] === idx
                      ? 'bg-blue-500 text-white border-2 border-blue-600'
                      : 'bg-slate-700 text-slate-200 border-2 border-slate-600 hover:border-blue-400'
                  }`}
                >
                  <span className="font-bold mr-3">{String.fromCharCode(65 + idx)}</span>
                  {option}
                </button>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex gap-3">
            <button
              onClick={handlePrev}
              disabled={currentQuestion === 0}
              className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded-lg font-semibold transition-all"
            >
              ← Previous
            </button>
            {currentQuestion < exam.questions.length - 1 ? (
              <button
                onClick={handleNext}
                className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all"
              >
                Next →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-all"
              >
                Submit Exam
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
