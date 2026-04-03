import React from 'react';
import { Settings, Save, Lock, Bell, Database, Zap } from 'lucide-react';

export const Configuration: React.FC = () => {
  return (
    <div className="space-y-8 max-w-4xl pb-12">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold flex items-center">
          <Settings className="mr-3 text-indigo-500" /> System Configuration
        </h2>
        <button className="flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold transition-all shadow-lg">
          <Save size={18} className="mr-2" /> Save All Changes
        </button>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* API Settings */}
        <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl overflow-hidden shadow-xl">
          <div className="p-6 border-b border-[#2a2d3e] flex items-center space-x-3 bg-[#1e2235]">
            <Zap className="text-amber-500" size={20} />
            <h3 className="font-bold">AI & API Settings</h3>
          </div>
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-200">Gemini AI Model</p>
                <p className="text-sm text-slate-500">The underlying LLM for exam generation</p>
              </div>
              <select className="bg-[#0f1117] border border-[#2a2d3e] rounded-lg p-2 text-sm text-slate-300 outline-none focus:ring-1 focus:ring-indigo-500">
                <option>gemini-pro</option>
                <option>gemini-1.5-flash</option>
                <option>gemini-ultra (Premium)</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-200">Request Timeout</p>
                <p className="text-sm text-slate-500">Maximum time for AI to respond (ms)</p>
              </div>
              <input type="number" defaultValue={60000} className="w-24 bg-[#0f1117] border border-[#2a2d3e] rounded-lg p-2 text-sm text-slate-300 text-right outline-none" />
            </div>
          </div>
        </div>

        {/* Database & Persistence */}
        <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl overflow-hidden shadow-xl">
          <div className="p-6 border-b border-[#2a2d3e] flex items-center space-x-3 bg-[#1e2235]">
            <Database className="text-blue-500" size={20} />
            <h3 className="font-bold">Database & Storage</h3>
          </div>
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-200">Redis Cache</p>
                <p className="text-sm text-slate-500">Use external Redis for faster job processing</p>
              </div>
              <div className="w-10 h-5 bg-slate-700 rounded-full relative">
                  <div className="absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-all"></div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-200">Max Upload Size</p>
                <p className="text-sm text-slate-500">Limits user material PDF uploads</p>
              </div>
              <div className="flex items-center space-x-2">
                <input type="number" defaultValue={10} className="w-16 bg-[#0f1117] border border-[#2a2d3e] rounded-lg p-2 text-sm text-slate-300 text-right" />
                <span className="text-slate-500 text-sm">MB</span>
              </div>
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl overflow-hidden shadow-xl">
          <div className="p-6 border-b border-[#2a2d3e] flex items-center space-x-3 bg-[#1e2235]">
            <Lock className="text-red-500" size={20} />
            <h3 className="font-bold">Security & Auth</h3>
          </div>
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-200">Enforce RLS</p>
                <p className="text-sm text-slate-500">Strictly enforce Row Level Security on all tables</p>
              </div>
              <div className="w-10 h-5 bg-indigo-600 rounded-full relative">
                  <div className="absolute top-1 left-6 w-3 h-3 bg-white rounded-full transition-all"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Configuration;
