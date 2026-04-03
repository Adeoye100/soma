import { motion } from 'framer-motion';
import { useState } from 'react';
import { examAnalyticsData } from '@/data/mockData';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Download, Filter, Clock, TrendingUp, AlertTriangle,
  RotateCcw, BarChart3
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

export function ExamAnalytics() {
  const [selectedExam, setSelectedExam] = useState(examAnalyticsData[0]);

  const timeDistribution = [
    { range: '0-15 min', count: 120, color: '#EF4444' },
    { range: '15-30 min', count: 340, color: '#F59E0B' },
    { range: '30-45 min', count: 580, color: '#22C55E' },
    { range: '45-60 min', count: 420, color: '#22C55E' },
    { range: '60+ min', count: 180, color: '#6C63FF' },
  ];

  const questionHeatmap = Array.from({ length: 20 }, (_, i) => ({
    id: i + 1,
    failRate: Math.random() * 100,
    skipRate: Math.random() * 50,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-white">Exam Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Detailed insights into exam performance and question difficulty.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            className="gap-2 bg-white/5 border-white/[0.07] hover:bg-white/10"
          >
            <Filter className="w-4 h-4" />
            Filter
          </Button>
          <Button 
            variant="outline" 
            className="gap-2 bg-white/5 border-white/[0.07] hover:bg-white/10"
          >
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </motion.div>

      {/* Exam Selector */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex gap-2 overflow-x-auto pb-2"
      >
        {examAnalyticsData.map((exam) => (
          <button
            key={exam.examId}
            onClick={() => setSelectedExam(exam)}
            className={`px-4 py-2 rounded-xl whitespace-nowrap transition-all ${
              selectedExam.examId === exam.examId
                ? 'bg-primary text-white'
                : 'bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-white'
            }`}
          >
            {exam.examName}
          </button>
        ))}
      </motion.div>

      {/* Key Metrics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        {[
          { 
            label: 'Total Attempts', 
            value: selectedExam.totalAttempts.toLocaleString(),
            icon: BarChart3,
            color: 'text-primary'
          },
          { 
            label: 'Pass Rate', 
            value: `${selectedExam.passRate}%`,
            icon: TrendingUp,
            color: 'text-success'
          },
          { 
            label: 'Avg Time', 
            value: `${selectedExam.avgTime} min`,
            icon: Clock,
            color: 'text-warning'
          },
          { 
            label: 'Retake Rate', 
            value: `${selectedExam.retakeRate}%`,
            icon: RotateCcw,
            color: 'text-danger'
          },
        ].map((metric) => (
          <div key={metric.label} className="card-surface p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-white/5 ${metric.color}`}>
                <metric.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{metric.label}</p>
                <p className="text-xl font-bold text-white">{metric.value}</p>
              </div>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Question Difficulty Heatmap */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card-surface p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Question Difficulty Heatmap</h3>
            <p className="text-sm text-muted-foreground">
              Fail rate by question (darker = harder)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Easy</span>
            <div className="flex gap-1">
              {[0.2, 0.4, 0.6, 0.8, 1].map((opacity) => (
                <div
                  key={opacity}
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: `rgba(239, 68, 68, ${opacity})` }}
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">Hard</span>
          </div>
        </div>

        <div className="grid grid-cols-10 gap-2">
          {questionHeatmap.map((q) => (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: q.id * 0.02 }}
              className="aspect-square rounded-lg flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
              style={{
                backgroundColor: `rgba(239, 68, 68, ${q.failRate / 100})`,
              }}
              title={`Q${q.id}: ${q.failRate.toFixed(1)}% fail rate`}
            >
              <span className="text-xs font-medium text-white">{q.id}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Time Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card-surface p-5"
        >
          <h3 className="text-lg font-semibold text-white mb-4">
            Time-to-Complete Distribution
          </h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeDistribution}>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="rgba(255,255,255,0.05)" 
                  vertical={false}
                />
                <XAxis 
                  dataKey="range" 
                  stroke="rgba(255,255,255,0.3)"
                  tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="rgba(255,255,255,0.3)"
                  tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload) {
                      return (
                        <div className="bg-card border border-white/[0.07] rounded-xl p-3 shadow-xl">
                          <p className="text-sm font-medium text-white">
                            {payload[0].payload.range}
                          </p>
                          <p className="text-lg font-bold text-white">
                            {payload[0].value} students
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {timeDistribution.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Most Skipped Questions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="card-surface p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Most Skipped Questions</h3>
            <Badge variant="outline" className="bg-warning/10 text-warning">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Review Needed
            </Badge>
          </div>

          <div className="space-y-3">
            {selectedExam.skippedQuestions.map((q, index) => (
              <motion.div
                key={q.questionId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + index * 0.1 }}
                className="flex items-center gap-4 p-3 rounded-xl bg-white/5"
              >
                <div className="w-8 h-8 rounded-lg bg-warning/20 flex items-center justify-center">
                  <span className="text-sm font-bold text-warning">{index + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{q.questionText}</p>
                  <p className="text-xs text-muted-foreground">
                    Question ID: {q.questionId}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-warning">{q.skipCount}</p>
                  <p className="text-xs text-muted-foreground">skips</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Hardest Questions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="card-surface p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Hardest Questions</h3>
          <Badge variant="outline" className="bg-danger/10 text-danger">
            <TrendingUp className="w-3 h-3 mr-1" />
            High Fail Rate
          </Badge>
        </div>

        <div className="space-y-3">
          {selectedExam.hardestQuestions.map((q, index) => (
            <motion.div
              key={q.questionId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 + index * 0.1 }}
              className="flex items-center gap-4 p-3 rounded-xl bg-white/5"
            >
              <div className="w-8 h-8 rounded-lg bg-danger/20 flex items-center justify-center">
                <span className="text-sm font-bold text-danger">{index + 1}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{q.questionText}</p>
                <p className="text-xs text-muted-foreground">
                  Question ID: {q.questionId}
                </p>
              </div>
              <div className="w-32">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-danger">{q.failRate}%</span>
                  <span className="text-xs text-muted-foreground">fail rate</span>
                </div>
                <Progress value={q.failRate} className="h-1.5" />
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
