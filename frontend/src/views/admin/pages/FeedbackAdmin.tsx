import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, AlertCircle, CheckCircle, Clock, 
  ExternalLink, User, MoreVertical, RefreshCw, Loader 
} from 'lucide-react';
import { AdminApiService, Feedback } from '../../../services/admin/adminApiService';

export const FeedbackAdmin: React.FC = () => {
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedItem, setSelectedItem] = useState<Feedback | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await AdminApiService.getFeedback(filter === 'all' ? undefined : filter);
      setFeedback(res.feedback);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filter]);

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      setUpdating(true);
      await AdminApiService.updateFeedback(id, { status, admin_notes: adminNotes });
      await fetchData();
      setSelectedItem(null);
      setAdminNotes('');
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  const getSeverityColor = (sev: string) => {
    switch (sev) {
      case 'critical': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'high': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'medium': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'low': return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
      default: return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
    }
  };

  const getTypeBadge = (type: string) => {
      switch(type) {
          case 'bug_report': return <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-500 text-[10px] font-bold">BUG</span>;
          case 'feature_request': return <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-500 text-[10px] font-bold">FEATURE</span>;
          default: return <span className="px-2 py-0.5 rounded bg-slate-500/10 text-slate-500 text-[10px] font-bold uppercase">{type.split('_')[0]}</span>;
      }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Feedback & Bug Reports</h2>
        <div className="flex bg-[#1a1d27] rounded-lg p-1 border border-[#2a2d3e]">
          {['all', 'open', 'in_review', 'resolved'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all capitalize ${
                filter === f ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {f.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#1e2235] text-xs uppercase tracking-wider text-[#94a3b8]">
              <tr>
                <th className="px-6 py-4 font-semibold">Type</th>
                <th className="px-6 py-4 font-semibold">Title</th>
                <th className="px-6 py-4 font-semibold">Severity</th>
                <th className="px-6 py-4 font-semibold">Submitted By</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Date</th>
                <th className="px-6 py-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2d3e]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <Loader className="animate-spin text-indigo-500 mx-auto" size={24} />
                  </td>
                </tr>
              ) : feedback.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    No feedback found matching the current filter.
                  </td>
                </tr>
              ) : (
                feedback.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="px-6 py-4">{getTypeBadge(item.type)}</td>
                    <td className="px-6 py-4">
                        <p className="font-medium text-slate-200">{item.title}</p>
                        <p className="text-xs text-slate-500 truncate max-w-[200px]">{item.description}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getSeverityColor(item.severity)}`}>
                        {item.severity}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center text-sm text-slate-400">
                        <User size={14} className="mr-2" />
                        {item.submitter_email || 'Anonymous'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                        item.status === 'resolved' ? 'bg-green-500/10 text-green-500' :
                        item.status === 'open' ? 'bg-red-500/10 text-red-500' :
                        'bg-blue-500/10 text-blue-500'
                      }`}>
                        {item.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-sm">
                      {new Date(item.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => {
                            setSelectedItem(item);
                            setAdminNotes(item.admin_notes || '');
                        }}
                        className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-all"
                      >
                        <ExternalLink size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal / Slide-over for details */}
      {selectedItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-6 border-b border-[#2a2d3e] flex justify-between items-center bg-[#1e2235]">
              <div className="flex items-center space-x-3">
                {getTypeBadge(selectedItem.type)}
                <h3 className="text-lg font-bold truncate max-w-[400px]">{selectedItem.title}</h3>
              </div>
              <button onClick={() => setSelectedItem(null)} className="text-slate-400 hover:text-white">
                <AlertCircle size={24} className="rotate-45" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              <section>
                <h4 className="text-xs uppercase font-bold text-slate-500 mb-2 tracking-widest">Description</h4>
                <p className="text-slate-300 bg-[#0f1117] p-4 rounded-xl border border-[#2a2d3e] whitespace-pre-wrap">
                  {selectedItem.description}
                </p>
              </section>

              <div className="grid grid-cols-2 gap-6">
                <section>
                  <h4 className="text-xs uppercase font-bold text-slate-500 mb-2 tracking-widest">Metadata</h4>
                  <div className="text-xs text-slate-400 space-y-1">
                    <p><span className="text-slate-500">Page:</span> {selectedItem.page_url || 'N/A'}</p>
                    <p className="truncate"><span className="text-slate-500">Browser:</span> {selectedItem.browser_info || 'N/A'}</p>
                    <p><span className="text-slate-500">Submitted:</span> {new Date(selectedItem.created_at).toLocaleString()}</p>
                  </div>
                </section>
                <section>
                  <h4 className="text-xs uppercase font-bold text-slate-500 mb-2 tracking-widest">User Info</h4>
                  <div className="text-xs text-slate-400 space-y-1">
                    <p><span className="text-slate-500">Email:</span> {selectedItem.submitter_email}</p>
                    <p><span className="text-slate-500">ID:</span> <span className="font-mono">{selectedItem.user_id || 'Guest'}</span></p>
                  </div>
                </section>
              </div>

              <section>
                <h4 className="text-xs uppercase font-bold text-slate-500 mb-2 tracking-widest">Admin Notes</h4>
                <textarea 
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="w-full bg-[#0f1117] border border-[#2a2d3e] rounded-xl p-4 text-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  rows={4}
                  placeholder="Internal notes for tracking resolution..."
                />
              </section>
            </div>

            <div className="p-6 border-t border-[#2a2d3e] bg-[#1e2235] flex justify-between items-center">
              <div className="flex space-x-3">
                <button 
                  disabled={updating}
                  onClick={() => handleUpdateStatus(selectedItem.id, 'resolved')}
                  className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-semibold transition-all disabled:opacity-50"
                >
                  <CheckCircle size={18} className="mr-2" /> Mark Resolved
                </button>
                <button 
                  disabled={updating}
                  onClick={() => handleUpdateStatus(selectedItem.id, 'dismissed')}
                  className="flex items-center px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-all disabled:opacity-50"
                >
                  <AlertCircle size={18} className="mr-2" /> Dismiss
                </button>
              </div>
              <button 
                disabled={updating}
                onClick={() => handleUpdateStatus(selectedItem.id, 'in_review')}
                className="text-indigo-400 font-semibold hover:underline px-2"
              >
                Move to Review
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedbackAdmin;
