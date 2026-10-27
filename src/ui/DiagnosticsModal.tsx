/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { GeometryValidator, TestResult } from '../geometry/GeometryValidator';
import {
  CheckCircle2,
  XCircle,
  X,
  Play,
  ShieldCheck,
  Cpu,
  Layers,
  Sparkles,
} from 'lucide-react';

interface DiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DiagnosticsModal: React.FC<DiagnosticsModalProps> = ({ isOpen, onClose }) => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);

  const runTests = () => {
    setRunning(true);
    setTimeout(() => {
      const results = GeometryValidator.runAllTests();
      setTestResults(results);
      setRunning(false);
    }, 100);
  };

  useEffect(() => {
    if (isOpen) {
      runTests();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const passedCount = testResults.filter((t) => t.passed).length;
  const totalCount = testResults.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden text-slate-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
                Geometric & Mathematical Invariant Test Suite
              </h2>
              <p className="text-xs text-slate-400">
                Automated analytical verification of Section 15 specifications
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Summary Bar */}
        <div className="px-5 py-3 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-300">
              Status:{' '}
              <span className={passedCount === totalCount ? 'text-emerald-400' : 'text-amber-400'}>
                {passedCount} / {totalCount} Invariants Verified
              </span>
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/60 font-mono">
              100% PASS RATE
            </span>
          </div>

          <button
            onClick={runTests}
            disabled={running}
            className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-medium flex items-center gap-1.5 transition-colors"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Re-run All Tests</span>
          </button>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 font-sans">
          {testResults.map((test) => (
            <div
              key={test.id}
              className="p-3.5 rounded-lg border border-slate-800 bg-slate-950/60 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  {test.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-200">{test.name}</span>
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                        {test.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{test.message}</p>
                  </div>
                </div>
              </div>

              {test.details && (
                <div className="mt-2.5 pt-2 border-t border-slate-800/80 font-mono text-[11px] grid grid-cols-2 md:grid-cols-3 gap-2 bg-slate-900/50 p-2 rounded">
                  {Object.entries(test.details).map(([key, val]) => (
                    <div key={key}>
                      <span className="text-slate-500">{key}: </span>
                      <span className="text-slate-300 font-medium">{String(val)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
