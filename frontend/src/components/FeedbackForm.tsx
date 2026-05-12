import React, { useState } from 'react';
import { MessageSquare, X, Send, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { submitFeedback } from '../services/admin/adminApiService';

export const FeedbackForm: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState('bug_report');
  const [severity, setSeverity] = useState('medium');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (title.length < 5 || description.length < 20) return;

    try {
      setLoading(true);
      setError(null);
      await submitFeedback({
        type,
        title,
        description,
        severity: type === 'bug_report' ? severity : 'low',
        page_url: window.location.href
      });
      setSubmitted(true);
      setTimeout(() => {
        setIsOpen(false);
        setSubmitted(false);
        setTitle('');
        setDescription('');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Submission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 p-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-2xl transition-all duration-300 z-[9999] hover:scale-110 group"
      >
        <MessageSquare size={24} className="group-hover:rotate-12 transition-transform" />
        <span className="absolute right-full mr-3 bg-[#1a1d27] text-white text-sm px-3 py-1.5 rounded-lg border border-[#2a2d3e] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl">
          Report Issue / Feedback
        </span>
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
            <div className="p-6 border-b border-[#2a2d3e] flex justify-between items-center bg-[#1e2235]">
              <h3 className="text-lg font-bold flex items-center">
                <MessageSquare className="mr-2 text-indigo-500" size={20} />
                Feedback & Bug Report
              </h3>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            {submitted ? (
              <div className="p-12 text-center animate-in fade-in duration-500">
                <div className="w-16 h-16 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={32} />
                </div>
                <h4 className="text-xl font-bold mb-2">Thank You!</h4>
                <p className="text-slate-400">Your feedback has been submitted successfully. We appreciate your input!</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2 tracking-wider">Type</label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      className="w-full bg-[#0f1117] border border-[#2a2d3e] rounded-xl p-2.5 text-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    >
                      <option value="bug_report">Bug Report</option>
                      <option value="feature_request">Feature Request</option>
                      <option value="general_feedback">General Feedback</option>
                      <option value="performance_issue">Performance Issue</option>
                      <option value="ui_issue">UI Issue</option>
                    </select>
                  </div>
                  
                  {type === 'bug_report' && (
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2 tracking-wider">Severity</label>
                      <select
                        value={severity}
                        onChange={(e) => setSeverity(e.target.value)}
                        className="w-full bg-[#0f1117] border border-[#2a2d3e] rounded-xl p-2.5 text-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2 tracking-wider">Title</label>
                  <input
                    type="text"
                    required
                    minLength={5}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Brief summary..."
                    className="w-full bg-[#0f1117] border border-[#2a2d3e] rounded-xl p-2.5 text-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2 tracking-wider">Description</label>
                  <textarea
                    required
                    minLength={20}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    placeholder="Please provide details..."
                    className="w-full bg-[#0f1117] border border-[#2a2d3e] rounded-xl p-2.5 text-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                  <p className="text-[10px] text-slate-500 mt-1.5 flex items-center">
                    <AlertCircle size={10} className="mr-1" /> Minimum 20 characters
                  </p>
                </div>

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-lg flex items-center">
                    <AlertCircle size={16} className="mr-2 shrink-0" />
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || title.length < 5 || description.length < 20}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center"
                >
                  {loading ? <RefreshCw className="animate-spin mr-2" size={18} /> : <Send className="mr-2" size={18} />}
                  Submit Report
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default FeedbackForm;
