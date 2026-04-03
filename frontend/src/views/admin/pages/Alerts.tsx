import React, { useState, useEffect } from 'react';
import { Bell, AlertCircle, AlertTriangle, Info, CheckCircle, RefreshCw, Loader } from 'lucide-react';
import { AdminApiService } from '../../../services/admin/adminApiService';

export const Alerts: React.FC = () => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await AdminApiService.getAlerts();
      setAlerts(res.alerts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const counts = alerts.reduce((acc: any, curr: any) => {
    acc[curr.severity] = (acc[curr.severity] || 0) + 1;
    return acc;
  }, { critical: 0, warning: 0, info: 0 });

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold flex items-center">
            <Bell className="mr-3 text-indigo-500" /> System Alerts
        </h2>
        <button onClick={fetchData} className="text-indigo-400 hover:text-indigo-300 flex items-center text-sm">
            <RefreshCw size={14} className="mr-2" /> Refresh
        </button>
      </div>

      <div className="flex space-x-4">
          <div className="flex-1 bg-[#1a1d27] p-4 rounded-xl border border-[#2a2d3e] flex items-center justify-between">
              <span className="text-slate-400 text-sm font-medium">Critical</span>
              <span className="text-2xl font-bold text-red-500">{counts.critical}</span>
          </div>
          <div className="flex-1 bg-[#1a1d27] p-4 rounded-xl border border-[#2a2d3e] flex items-center justify-between">
              <span className="text-slate-400 text-sm font-medium">Warning</span>
              <span className="text-2xl font-bold text-amber-500">{counts.warning}</span>
          </div>
          <div className="flex-1 bg-[#1a1d27] p-4 rounded-xl border border-[#2a2d3e] flex items-center justify-between">
              <span className="text-slate-400 text-sm font-medium">Info</span>
              <span className="text-2xl font-bold text-blue-500">{counts.info}</span>
          </div>
      </div>

      <div className="space-y-4">
          {loading ? (
              <div className="py-20 text-center"><Loader className="animate-spin text-indigo-500 mx-auto" size={32} /></div>
          ) : alerts.length === 0 ? (
              <div className="bg-[#1a1d27] border border-green-500/20 p-12 rounded-2xl text-center">
                  <CheckCircle className="text-green-500 mx-auto mb-4" size={48} />
                  <h3 className="text-xl font-bold text-slate-200">All Systems Operational</h3>
                  <p className="text-slate-500 mt-1">No active alerts at this time.</p>
              </div>
          ) : (
              alerts.map((alert, i) => (
                  <div key={i} className={`bg-[#1a1d27] border-l-4 rounded-xl p-6 border-[#2a2d3e] shadow-lg flex items-start space-x-4 ${
                      alert.severity === 'critical' ? 'border-l-red-500' : 
                      alert.severity === 'warning' ? 'border-l-amber-500' : 
                      'border-l-blue-500'
                  }`}>
                      <div className={`p-2 rounded-lg ${
                          alert.severity === 'critical' ? 'bg-red-500/10 text-red-500' : 
                          alert.severity === 'warning' ? 'bg-amber-500/10 text-amber-500' : 
                          'bg-blue-500/10 text-blue-500'
                      }`}>
                          {alert.severity === 'critical' ? <AlertCircle size={24}/> : <AlertTriangle size={24}/>}
                      </div>
                      <div className="flex-1">
                          <div className="flex justify-between items-start">
                              <h4 className="font-bold text-slate-200">{alert.title}</h4>
                              <span className="text-xs text-slate-500 font-mono">
                                  {new Date(alert.timestamp).toLocaleTimeString()}
                              </span>
                          </div>
                          <p className="text-slate-400 mt-1">{alert.message}</p>
                      </div>
                  </div>
              ))
          )}
      </div>
    </div>
  );
};

export default Alerts;
