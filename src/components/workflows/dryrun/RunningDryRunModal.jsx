import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Play, Check, Clock, X, Loader2 } from 'lucide-react';

export default function RunningDryRunModal({
  isOpen = true,
  onClose,
  onComplete,
  onCancel,
  totalRows = 1420,
  tableName = 'OPUR_C01',
  ready = true,
  error,
  rulesCount = 5
}) {
  const [phase, setPhase] = useState(2); // 2 = Applying Rules, 3 = Synthesizing Telemetry (loading), 4 = All Done
  const [progressPercent, setProgressPercent] = useState(68);
  const [telemetryPercent, setTelemetryPercent] = useState(0);
  const [animationDone, setAnimationDone] = useState(false);

  const cleanTotalRows = Number(String(totalRows).replaceAll(',', '')) || 50;
  const processedRows = Math.round(cleanTotalRows * (progressPercent / 100));

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Escape key listener to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (onCancel) onCancel();
        else if (onClose) onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel, onClose]);

  // Lock body scroll while modal dialog is open
  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || error) return;

    setPhase(2);
    setProgressPercent(68);
    setTelemetryPercent(0);
    setAnimationDone(false);

    // Step 2: Animate business rule evaluation to 100%
    const t1 = setTimeout(() => {
      setProgressPercent(88);
    }, 450);

    // Step 2 Done -> Step 3 starts loading animation
    const t2 = setTimeout(() => {
      setProgressPercent(100);
      setPhase(3);
      setTelemetryPercent(38);
    }, 1000);

    const t3 = setTimeout(() => {
      setTelemetryPercent(84);
    }, 1550);

    // Step 3 Done -> All 3 components show green checkmarks
    const t4 = setTimeout(() => {
      setTelemetryPercent(100);
      setPhase(4);
    }, 2100);

    const t5 = setTimeout(() => {
      setAnimationDone(true);
    }, 2650);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, [isOpen, error]);

  useEffect(() => {
    if (animationDone && ready && !error) {
      if (onCompleteRef.current) {
        onCompleteRef.current();
      }
    }
  }, [animationDone, ready, error]);

  if (!isOpen) return null;

  const modalNode = (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/45 font-sans"
      role="dialog"
      aria-modal="true"
      onClick={onCancel || onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-[#18181C] border border-[#E3E6EE] dark:border-white/[0.08] rounded-[24px] max-w-[640px] max-h-[94vh] overflow-y-auto w-full p-6 shadow-2xl relative text-left"
      >
        {/* Top Header Row with Play Icon & Close */}
        <div className="flex items-start justify-between gap-4 mb-5 border-b pb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-semibold text-[#0A0F1F] dark:text-white tracking-tight">
              {error ? 'Dry run blocked' : 'Running a dry run...'}
            </h2>
          </div>

          <button
            type="button"
            onClick={onCancel || onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors cursor-pointer"
            title="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : <>
        {/* Subtitle */}
        <p className="text-xs sm:text-sm text-[#5F6678] dark:text-slate-400 mb-6">
          Checking {totalRows.toLocaleString()} rows from {tableName} with {rulesCount} rules. Nothing is written.
        </p>

        {/* 3 Step Cards */}
        <div className="space-y-3">
          {/* Step 1: Handshake & Read Rows */}
          <div className="bg-[#F8FAFC] dark:bg-white/[0.02] border border-[#E3E6EE] dark:border-white/[0.08] rounded-2xl p-4 flex items-center gap-3.5">
            <div className="w-6 h-6 rounded-full bg-emerald-100 text-[#127A52] flex items-center justify-center shrink-0">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold text-[#0A0F1F] dark:text-white">
                Read {totalRows.toLocaleString()} rows from {tableName}
              </div>
              <div className="text-[11px] text-[#5F6678] dark:text-slate-400 mt-0.5">
                Handshake verified in 0.8 s
              </div>
            </div>
          </div>

          {/* Step 2: Applying Rules with Progress Bar */}
          <div className="bg-slate-50 dark:bg-[#18181C] border border-slate-200 dark:border-blue-900/50 rounded-2xl p-4 space-y-2.5 shadow-2xs">
            <div className="flex items-center gap-3.5">
              {phase >= 3 ? (
                <div className="w-6 h-6 rounded-full bg-emerald-100 text-[#127A52] flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              ) : (
                <div className="w-6 h-6 rounded-full border-2 border-[#2D55F5] border-t-transparent animate-spin shrink-0" />
              )}
              <div>
                <div className="text-xs sm:text-sm font-bold text-[#0A0F1F] dark:text-white">
                  Applying {rulesCount} business validation rules
                </div>
                <div className="text-[11px] text-[#5F6678] dark:text-slate-400 mt-0.5">
                  {processedRows.toLocaleString()} of {cleanTotalRows.toLocaleString()} rows · {progressPercent}%
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-1.5 bg-[#F1F3F9] dark:bg-white/[0.08] rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-300 ${phase >= 3 ? 'bg-[#127A52]' : 'bg-[#2D55F5]'}`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Step 3: Telemetry & auto-fix diff */}
          <div className={`${phase >= 3 ? 'bg-slate-50 dark:bg-[#18181C] border-slate-200 dark:border-blue-900/50 shadow-2xs' : 'bg-white dark:bg-[#18181C] border-[#E3E6EE] dark:border-white/[0.08]'} border rounded-2xl p-4 space-y-2.5 transition-all duration-200`}>
            <div className="flex items-center gap-3.5">
              {phase >= 4 ? (
                <div className="w-6 h-6 rounded-full bg-emerald-100 text-[#127A52] flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              ) : phase === 3 ? (
                <div className="w-6 h-6 rounded-full border-2 border-[#2D55F5] border-t-transparent animate-spin shrink-0" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-white/[0.05] text-[#8E95A9] flex items-center justify-center shrink-0">
                  <Clock className="w-3.5 h-3.5" />
                </div>
              )}
              <div>
                <div className={`text-xs sm:text-sm ${phase >= 3 ? 'font-bold text-[#0A0F1F] dark:text-white' : 'font-semibold text-[#5F6678] dark:text-slate-300'}`}>
                  Synthesizing compliance telemetry & auto-fix diff
                </div>
                <div className="text-[11px] text-[#5F6678] dark:text-slate-400 mt-0.5">
                  {phase >= 4
                    ? 'Completed · 100% verified'
                    : phase === 3
                      ? `Compiling rule outcomes & auto-fix diff · ${telemetryPercent}%`
                      : 'Waiting'}
                </div>
              </div>
            </div>

            {phase >= 3 && (
              <div className="w-full h-1.5 bg-[#F1F3F9] dark:bg-white/[0.08] rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-300 ${phase >= 4 ? 'bg-[#127A52]' : 'bg-[#2D55F5]'}`}
                  style={{ width: `${telemetryPercent}%` }}
                />
              </div>
            )}
          </div>
        </div>

        </>}
        {/* Footer Actions */}
        <div className="mt-7 pt-4 border-t border-[#F0F2F6] dark:border-white/[0.08] flex items-center justify-between">
          <span className="text-xs text-[#8E95A9] dark:text-slate-500">
            Usually under 10 seconds. No side effects.
          </span>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={!ready || Boolean(error)}
              onClick={onComplete}
              className="disabled:opacity-40 text-xs sm:text-sm font-semibold text-[#0A0F1F] dark:text-white hover:text-[#2D55F5] transition-colors cursor-pointer"
            >
              Skip to results →
            </button>

            <button
              type="button"
              onClick={onCancel || onClose}
              className="px-5 py-2 rounded-full border border-[#CDD2DE] dark:border-white/[0.12] bg-white dark:bg-white/[0.03] hover:bg-[#F8FAFC] dark:hover:bg-white/[0.06] text-xs font-semibold text-[#0A0F1F] dark:text-white transition-all cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalNode, document.body)
    : modalNode;
}

