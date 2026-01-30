import React, { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  PieChart, Pie, Cell, Area, AreaChart
} from 'recharts';
import { ExamResult, WeeklyPerformance, PerformanceInsight } from '../types';
import { TrendingUpIcon, ClockIcon, TargetIcon, BookOpenIcon } from './icons';

interface WeeklyPerformanceAnalysisProps {
  examHistory: ExamResult[];
  onViewDetailedResult?: (result: ExamResult) => void;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16'];

const WeeklyPerformanceAnalysis: React.FC<WeeklyPerformanceAnalysisProps> = ({
  examHistory,
  onViewDetailedResult
}) => {
  const weeklyData = useMemo(() => {
    if (examHistory.length === 0) return [];

    const now = new Date();
    const weeks = [];

    // Generate data for last 8 weeks
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (i * 7));
      weekStart.setHours(0, 0, 0, 0);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      // Get exams for this week
      const weekExams = examHistory.filter(exam => {
        const examDate = new Date(exam.date || '');
        return examDate >= weekStart && examDate <= weekEnd;
      });

      const averageScore = weekExams.length > 0
        ? weekExams.reduce((sum, exam) => sum + (exam.score || 0), 0) / weekExams.length
        : 0;

      const totalTime = weekExams.reduce((sum, exam) => sum + exam.timeTaken, 0);

      weeks.push({
        week: `${weekStart.getMonth() + 1}/${weekStart.getDate()}`,
        weekStart: weekStart.toISOString(),
        examsCompleted: weekExams.length,
        averageScore: Math.round(averageScore),
        totalTime: Math.round(totalTime / 60), // Convert to minutes
        examDetails: weekExams
      });
    }

    return weeks;
  }, [examHistory]);

  const topicPerformanceData = useMemo(() => {
    const topicScores: { [key: string]: number[] } = {};

    examHistory.forEach(exam => {
      exam.evaluations.forEach(evaluation => {
        if (!topicScores[evaluation.topic]) {
          topicScores[evaluation.topic] = [];
        }
        topicScores[evaluation.topic].push(evaluation.score);
      });
    });

    return Object.entries(topicScores).map(([topic, scores]) => ({
      topic,
      averageScore: Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length),
      maxScore: Math.max(...scores),
      minScore: Math.min(...scores),
      attempts: scores.length
    }));
  }, [examHistory]);

  const difficultyDistribution = useMemo(() => {
    const distribution: { [key: string]: number } = {};

    examHistory.forEach(exam => {
      const difficulty = exam.config.difficulty;
      distribution[difficulty] = (distribution[difficulty] || 0) + 1;
    });

    return Object.entries(distribution).map(([difficulty, count]) => ({
      name: difficulty,
      value: count,
      percentage: Math.round((count / examHistory.length) * 100)
    }));
  }, [examHistory]);

  const performanceInsights: PerformanceInsight[] = useMemo(() => {
    const insights: PerformanceInsight[] = [];

    if (examHistory.length === 0) return insights;

    // Overall performance trend
    const recentExams = examHistory.slice(0, 3);
    const olderExams = examHistory.slice(3, 6);

    if (recentExams.length > 0 && olderExams.length > 0) {
      const recentAvg = recentExams.reduce((sum, exam) => sum + (exam.score || 0), 0) / recentExams.length;
      const olderAvg = olderExams.reduce((sum, exam) => sum + (exam.score || 0), 0) / olderExams.length;
      const improvement = recentAvg - olderAvg;

      if (improvement > 5) {
        insights.push({
          type: 'improvement',
          message: `Great progress! Your scores have improved by ${Math.round(improvement)}% recently.`,
          metric: improvement
        });
      } else if (improvement < -5) {
        insights.push({
          type: 'weakness',
          message: `Your performance has declined by ${Math.abs(Math.round(improvement))}% recently. Consider reviewing the material.`,
          metric: improvement
        });
      }
    }

    // Topic-specific insights
    topicPerformanceData.forEach(topicData => {
      if (topicData.averageScore < 60) {
        insights.push({
          type: 'weakness',
          message: `${topicData.topic} needs more attention. Current average: ${topicData.averageScore}%`,
          topic: topicData.topic,
          metric: topicData.averageScore
        });
      } else if (topicData.averageScore > 85) {
        insights.push({
          type: 'strength',
          message: `Excellent work on ${topicData.topic}! Keep up the great performance.`,
          topic: topicData.topic,
          metric: topicData.averageScore
        });
      }
    });

    // Consistency insight
    const recentScores = examHistory.slice(0, 5).map(exam => exam.score || 0);
    if (recentScores.length >= 3) {
      const variance = recentScores.reduce((sum, score, _, arr) => {
        const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
        return sum + Math.pow(score - mean, 2);
      }, 0) / recentScores.length;

      if (variance < 100) {
        insights.push({
          type: 'strength',
          message: 'You have consistent performance across recent exams!',
          metric: Math.round(100 - Math.sqrt(variance))
        });
      }
    }

    return insights;
  }, [examHistory, topicPerformanceData]);

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getInsightIcon = (type: PerformanceInsight['type']) => {
    switch (type) {
      case 'improvement': return <TrendingUpIcon className="h-5 w-5 text-green-500" />;
      case 'strength': return <TargetIcon className="h-5 w-5 text-blue-500" />;
      case 'weakness': return <BookOpenIcon className="h-5 w-5 text-red-500" />;
      case 'recommendation': return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      default: return <TargetIcon className="h-5 w-5" />;
    }
  };

  if (examHistory.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg">
        <h3 className="text-xl font-bold text-center text-slate-700 dark:text-slate-300 mb-4">
          Weekly Performance Analysis
        </h3>
        <p className="text-center text-slate-500 dark:text-slate-400">
          Complete some exams to see your performance analytics!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Weekly Performance Overview */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg">
        <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-6">
          Weekly Performance Trend
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip
                formatter={(value, name) => [
                  name === 'averageScore' ? `${value}%` : value,
                  name === 'averageScore' ? 'Average Score' : 'Exams Completed'
                ]}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="averageScore"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.3}
                name="Average Score"
              />
              <Line
                type="monotone"
                dataKey="examsCompleted"
                stroke="#10b981"
                name="Exams Completed"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Topic Performance Radar */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg">
          <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-4">
            Topic Performance Analysis
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={topicPerformanceData.slice(0, 6)}>
                <PolarGrid />
                <PolarAngleAxis dataKey="topic" tick={{ fontSize: 12 }} />
                <PolarRadiusAxis tick={{ fontSize: 10 }} />
                <Radar
                  name="Average Score"
                  dataKey="averageScore"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.3}
                />
                <Tooltip formatter={(value) => [`${value}%`, 'Score']} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Difficulty Distribution */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg">
          <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-4">
            Exam Difficulty Distribution
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={difficultyDistribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percentage }) => `${name}: ${percentage}%`}
                >
                  {difficultyDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Time Investment Analysis */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg">
        <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-4">
          Time Investment Over Time
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip
                formatter={(value) => [formatTime(value as number), 'Time Spent']}
              />
              <Legend />
              <Bar dataKey="totalTime" fill="#8b5cf6" name="Time Spent (minutes)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Performance Insights */}
      {performanceInsights.length > 0 && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg">
          <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-4">
            Performance Insights & Feedback
          </h3>
          <div className="space-y-4">
            {performanceInsights.map((insight, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg"
              >
                {getInsightIcon(insight.type)}
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                    {insight.message}
                  </p>
                  {insight.topic && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Topic: {insight.topic}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detailed Exam History Table */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg">
        <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-4">
          Recent Exam Details
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left py-2 text-slate-600 dark:text-slate-400">Date</th>
                <th className="text-left py-2 text-slate-600 dark:text-slate-400">Score</th>
                <th className="text-left py-2 text-slate-600 dark:text-slate-400">Difficulty</th>
                <th className="text-left py-2 text-slate-600 dark:text-slate-400">Time</th>
                <th className="text-left py-2 text-slate-600 dark:text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {examHistory.slice(0, 10).map((exam, index) => (
                <tr key={index} className="border-b border-slate-100 dark:border-slate-700/50">
                  <td className="py-2 text-slate-800 dark:text-slate-100">
                    {new Date(exam.date || '').toLocaleDateString()}
                  </td>
                  <td className="py-2">
                    <span className={`font-semibold ${
                      (exam.score || 0) >= 70 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {Math.round(exam.score || 0)}%
                    </span>
                  </td>
                  <td className="py-2 text-slate-600 dark:text-slate-400">
                    {exam.config.difficulty}
                  </td>
                  <td className="py-2 text-slate-600 dark:text-slate-400">
                    {formatTime(Math.round(exam.timeTaken / 60))}
                  </td>
                  <td className="py-2">
                    <button
                      onClick={() => onViewDetailedResult?.(exam)}
                      className="text-blue-600 hover:text-blue-500 text-xs font-medium"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default WeeklyPerformanceAnalysis;
