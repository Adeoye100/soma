import React from 'react';
import { Zap, Play, CheckCircle, Settings, Shield } from 'lucide-react';

export const Automation: React.FC = () => {
  const workflows = [
    { name: 'Exam Generation', steps: 5, status: 'Active', lastRun: '2 mins ago', runs: 1240 },
    { name: 'Paper Evaluation', steps: 3, status: 'Active', lastRun: '1 hour ago', runs: 850 },
    { name: 'User Onboarding', steps: 2, status: 'Inactive', lastRun: '2 days ago', runs: 45 }
  ];

  const rules = [
    { priority: 1, name: 'Rate Limit: AI Generation', enabled: true, description: 'Limits user to 5 exams per hour' },
    { priority: 2, name: 'Fraud Detection', enabled: true, description: 'Flags suspicious attempt patterns' },
    { priority: 3, name: 'Dynamic Difficulty', enabled: false, description: 'Adjusts question difficulty based on user history' }
  ];

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Automation Engine</h2>
        <span className="px-3 py-1 bg-green-500/10 text-green-500 rounded-full text-xs font-bold uppercase tracking-wider">Engine Running</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#1a1d27] p-6 rounded-xl border border-[#2a2d3e]">
            <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-lg"><Zap size={20}/></div>
                <h4 className="font-semibold">Framework</h4>
            </div>
            <p className="text-2xl font-bold">Soma Workflow v1.0</p>
            <p className="text-xs text-slate-500 mt-2">Active & Healthy</p>
        </div>
        <div className="bg-[#1a1d27] p-6 rounded-xl border border-[#2a2d3e]">
            <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg"><Settings size={20}/></div>
                <h4 className="font-semibold">Capabilities</h4>
            </div>
            <div className="flex flex-wrap gap-2">
                {['AI-Gen', 'OCR', 'Grading', 'PDF'].map(c => (
                    <span key={c} className="px-2 py-0.5 bg-[#0f1117] text-slate-400 text-[10px] font-bold rounded border border-[#2a2d3e]">{c}</span>
                ))}
            </div>
        </div>
      </div>

      <section className="bg-[#1a1d27] rounded-xl border border-[#2a2d3e] overflow-hidden">
        <div className="p-6 border-b border-[#2a2d3e]">
            <h3 className="text-lg font-semibold">Registered Workflows</h3>
        </div>
        <table className="w-full text-left">
            <thead className="bg-[#1e2235] text-xs uppercase text-[#94a3b8]">
                <tr>
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Steps</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Last Run</th>
                    <th className="px-6 py-4">Total Runs</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2d3e]">
                {workflows.map(w => (
                    <tr key={w.name} className="hover:bg-slate-800/30">
                        <td className="px-6 py-4 font-medium">{w.name}</td>
                        <td className="px-6 py-4 text-slate-400">{w.steps}</td>
                        <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${w.status === 'Active' ? 'bg-green-500/10 text-green-500' : 'bg-slate-500/10 text-slate-500'}`}>{w.status}</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">{w.lastRun}</td>
                        <td className="px-6 py-4 text-sm text-slate-500">{w.runs}</td>
                    </tr>
                ))}
            </tbody>
        </table>
      </section>

      <section className="bg-[#1a1d27] rounded-xl border border-[#2a2d3e] overflow-hidden">
        <div className="p-6 border-b border-[#2a2d3e]">
            <h3 className="text-lg font-semibold">Business Rules</h3>
        </div>
        <table className="w-full text-left">
            <thead className="bg-[#1e2235] text-xs uppercase text-[#94a3b8]">
                <tr>
                    <th className="px-6 py-4">Priority</th>
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Description</th>
                    <th className="px-6 py-4">Enabled</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2d3e]">
                {rules.map(r => (
                    <tr key={r.name} className="hover:bg-slate-800/30">
                        <td className="px-6 py-4 font-mono text-indigo-400">{r.priority}</td>
                        <td className="px-6 py-4 font-medium">{r.name}</td>
                        <td className="px-6 py-4 text-sm text-slate-500">{r.description}</td>
                        <td className="px-6 py-4">
                            <div className={`w-10 h-5 rounded-full relative transition-colors ${r.enabled ? 'bg-indigo-600' : 'bg-slate-700'}`}>
                                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${r.enabled ? 'left-6' : 'left-1'}`}></div>
                            </div>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
      </section>
    </div>
  );
};

export default Automation;
