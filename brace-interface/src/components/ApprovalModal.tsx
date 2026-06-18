import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { braceClient } from '../lib/braceClient';

export type ApprovalLike = {
  id: string;
  tool?: string;
  input?: unknown;
  description?: string;
  createdAt?: string;
};

interface ApprovalModalProps {
  isOpen: boolean;
  approval: ApprovalLike | null;
  onClose: () => void;
  onResolved?: () => void;
}

function stringifyPayload(value: unknown) {
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch {
    return String(value);
  }
}

function inferRisk(tool?: string, input?: unknown): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  const text = `${tool || ''} ${stringifyPayload(input)}`.toLowerCase();
  if (/prod|production|delete|remove|rm\s+-rf|drop\s+table|credential|token|payment|deploy/.test(text)) return 'CRITICAL';
  if (/terminal|command|write|send|publish|git\s+push|install/.test(text)) return 'HIGH';
  if (/file|memory|note/.test(text)) return 'MEDIUM';
  return 'LOW';
}

export const ApprovalModal: React.FC<ApprovalModalProps> = ({ isOpen, approval, onClose, onResolved }) => {
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const riskLevel = useMemo(() => inferRisk(approval?.tool, approval?.input), [approval]);
  const payload = useMemo(() => stringifyPayload(approval?.input), [approval]);

  async function resolve(decision: 'approve' | 'reject') {
    if (!approval) return;
    setBusy(decision);
    setError(null);
    try {
      await braceClient.resolveApproval({ id: approval.id, decision, feedback } as { id: string; decision: 'approve' | 'reject'; feedback?: string });
      setFeedback('');
      onResolved?.();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to resolve approval.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && approval && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.74)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
          }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <motion.div
            initial={{ scale: 0.94, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.94, y: 20 }}
            style={{
              background: '#0f141d',
              borderRadius: 14,
              width: 'min(680px, 94vw)',
              maxHeight: '88vh',
              overflow: 'hidden',
              border: `1px solid ${riskLevel === 'CRITICAL' || riskLevel === 'HIGH' ? 'rgba(244,63,94,0.65)' : 'rgba(245,158,11,0.55)'}`,
              color: '#e2e8f0',
              boxShadow: riskLevel === 'CRITICAL' ? '0 0 34px rgba(244,63,94,0.25), 0 24px 70px rgba(0,0,0,0.55)' : '0 24px 70px rgba(0,0,0,0.55)',
            }}
          >
            <header style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', gap: 16 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 16 }}>Approval Gate — operator review required</h2>
                <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>{approval.description || 'An agent requested a tool action that requires explicit approval.'}</div>
              </div>
              <div style={{ color: riskLevel === 'CRITICAL' || riskLevel === 'HIGH' ? '#fb7185' : '#fbbf24', fontSize: 11, fontWeight: 800, letterSpacing: '0.12em' }}>{riskLevel}</div>
            </header>

            <main style={{ padding: 20, overflowY: 'auto', maxHeight: 'calc(88vh - 138px)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                <div style={{ background: '#151c29', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: 10 }}>
                  <div style={{ color: '#94a3b8', fontSize: 10, textTransform: 'uppercase' }}>Tool</div>
                  <div style={{ color: '#67e8f9', fontFamily: 'monospace', fontSize: 12, marginTop: 3 }}>{approval.tool || 'unknown'}</div>
                </div>
                <div style={{ background: '#151c29', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: 10 }}>
                  <div style={{ color: '#94a3b8', fontSize: 10, textTransform: 'uppercase' }}>Request id</div>
                  <div style={{ color: '#e2e8f0', fontFamily: 'monospace', fontSize: 12, marginTop: 3 }}>{approval.id}</div>
                </div>
              </div>

              <div style={{ color: '#94a3b8', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Exact payload</div>
              <pre style={{ background: '#03060a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: 14, color: '#fcd34d', fontSize: 12, lineHeight: 1.55, overflowX: 'auto', whiteSpace: 'pre-wrap' }}>{payload}</pre>

              <label style={{ display: 'block', color: '#94a3b8', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '12px 0 6px' }} htmlFor="approval-feedback">
                Denial feedback (optional)
              </label>
              <textarea
                id="approval-feedback"
                value={feedback}
                onChange={(event) => setFeedback(event.target.value)}
                placeholder="Explain what should change before this action is retried…"
                style={{ width: '100%', minHeight: 76, resize: 'vertical', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, background: '#151c29', color: '#e2e8f0', padding: 10, fontFamily: 'inherit' }}
              />
              {error && <div style={{ marginTop: 10, color: '#fda4af', fontSize: 12 }}>{error}</div>}
            </main>

            <footer style={{ padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" onClick={onClose} disabled={Boolean(busy)} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', color: '#cbd5e1', background: '#111827' }}>Cancel</button>
              <button type="button" onClick={() => resolve('reject')} disabled={Boolean(busy)} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(244,63,94,0.45)', color: '#fecdd3', background: 'rgba(244,63,94,0.12)' }}>{busy === 'reject' ? 'Denying…' : 'Deny with feedback'}</button>
              <button type="button" onClick={() => resolve('approve')} disabled={Boolean(busy)} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #f59e0b', color: '#111827', background: '#f59e0b', fontWeight: 800 }}>{busy === 'approve' ? 'Authorizing…' : 'Authorize execution'}</button>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
