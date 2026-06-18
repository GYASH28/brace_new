import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ApprovalModalProps {
  isOpen: boolean;
  agentName: string;
  actionCommand: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  onApprove: () => void;
  onDeny: () => void;
}

export const ApprovalModal: React.FC<ApprovalModalProps> = ({
  isOpen,
  agentName,
  actionCommand,
  riskLevel,
  onApprove,
  onDeny
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999
        }}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          style={{
            background: '#1a1a1a',
            padding: '24px',
            borderRadius: '12px',
            width: '400px',
            border: `1px solid ${riskLevel === 'CRITICAL' || riskLevel === 'HIGH' ? '#ff4444' : '#ffbb33'}`,
            color: '#fff',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
          }}
        >
          <h2 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            ⚠️ ACTION REQUIRED
          </h2>
          
          <p style={{ margin: '0 0 16px 0', fontSize: '0.95rem', lineHeight: '1.5' }}>
            <strong>{agentName}</strong> is attempting to execute a <strong>{riskLevel}</strong> risk action.
          </p>

          <div style={{ background: '#000', padding: '12px', borderRadius: '6px', fontFamily: 'monospace', marginBottom: '24px', wordBreak: 'break-all' }}>
            {actionCommand}
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              onClick={onDeny}
              style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #555', color: '#fff', borderRadius: '6px', cursor: 'pointer' }}
            >
              Deny
            </button>
            <button
              onClick={onApprove}
              style={{ padding: '8px 16px', background: '#4CAF50', border: 'none', color: '#fff', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Approve Execution
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
