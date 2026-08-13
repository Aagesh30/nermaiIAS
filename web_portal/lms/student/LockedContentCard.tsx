/**
 * NERMAI SACS — Web Locked Content Card (Student UX)
 * 
 * Displayed to a student when they attempt to access a locked entity.
 * Explains why it's locked and provides a neumorphic flow to request access.
 */

import React, { useState } from 'react';
import { Lock, Clock, Send, AlertTriangle } from 'lucide-react';

/* ─── Design Tokens ─────────────────────────────────────────────────────────── */
const C = {
  bg:      '#0E0E0E',
  surface: '#1B1B1B',
  surfH:   '#252525',
  gold:    '#D4AF37',
  red:     '#FF3B30',
  text:    '#F8F8F8',
  muted:   '#A0A0A0',
  border:  'rgba(255,255,255,0.07)',
};

const NM_RAISED = '5px 5px 14px #0a0a0a, -5px -5px 14px #2c2c2c';
const NM_INSET  = 'inset 3px 3px 8px #0a0a0a, inset -3px -3px 8px #262626';
const NM_FLAT   = '3px 3px 8px #0d0d0d, -3px -3px 8px #292929';

/* ─── Types ─────────────────────────────────────────────────────────────────── */
interface LockedContentCardProps {
  entityId: string;
  entityName: string;
  entityType: string;
  lockReason: 'batch_only' | 'student_only' | 'hidden_by_admin' | 'prerequisite_not_met' | 'pending_request';
  lockMessage: string;
  onSubmitRequest?: (reason: string) => Promise<void>;
}

/* ─── Main Component ─────────────────────────────────────────────────────────── */
export const LockedContentCard: React.FC<LockedContentCardProps> = ({
  entityName, entityType, lockReason, lockMessage, onSubmitRequest
}) => {
  const [showForm, setShowForm] = useState(false);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(lockReason === 'pending_request');

  const handleSubmit = async () => {
    if (!reason.trim()) return;
    setIsSubmitting(true);
    try {
      if (onSubmitRequest) await onSubmitRequest(reason);
      setSubmitted(true);
      setShowForm(false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isHidden = lockReason === 'hidden_by_admin';

  return (
    <div style={cardStyle}>
      {/* Icon */}
      <div style={iconWrapStyle(isHidden ? C.red : C.gold)}>
        {isHidden ? <AlertTriangle size={24} color={C.red} /> : <Lock size={24} color={C.gold} />}
      </div>

      {/* Text */}
      <h2 style={{ fontSize: 20, fontWeight: 800, color: C.text, margin: '0 0 8px 0', textAlign: 'center' }}>
        {isHidden ? 'Content Unavailable' : 'Content Locked'}
      </h2>
      <p style={{ fontSize: 14, color: C.muted, margin: 0, textAlign: 'center', lineHeight: 1.5, maxWidth: 300 }}>
        {lockMessage}
      </p>

      <div style={{ marginTop: 24, width: '100%' }}>
        {isHidden ? (
          <div style={badgeStyle}>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.muted }}>
              Administrators have hidden this {entityType}.
            </span>
          </div>
        ) : submitted ? (
          <div style={successBadgeStyle}>
            <Clock size={16} color={C.gold} />
            <span style={{ fontSize: 13, fontWeight: 700, color: C.gold }}>
              Access request is pending review.
            </span>
          </div>
        ) : !showForm ? (
          <button onClick={() => setShowForm(true)} style={requestBtnStyle}>
            Request Access
          </button>
        ) : (
          <div style={formStyle}>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Why do you need access to this content?"
              style={textareaStyle}
              rows={3}
            />
            <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
              <button onClick={() => setShowForm(false)} style={cancelBtnStyle}>
                Cancel
              </button>
              <button onClick={handleSubmit} disabled={isSubmitting || !reason.trim()} style={submitBtnStyle(!reason.trim() || isSubmitting)}>
                {isSubmitting ? 'Sending...' : <><Send size={14} /> Send Request</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── Styles ─────────────────────────────────────────────────────────────────── */
const cardStyle: React.CSSProperties = {
  backgroundColor: C.surface, borderRadius: 24, padding: 32,
  border: `1px solid ${C.border}`, boxShadow: NM_RAISED,
  display: 'flex', flexDirection: 'column', alignItems: 'center',
  maxWidth: 400, margin: '40px auto'
};

const iconWrapStyle = (color: string): React.CSSProperties => ({
  width: 64, height: 64, borderRadius: 20,
  backgroundColor: `${color}15`, border: `2px solid ${color}40`,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  boxShadow: `0 0 20px ${color}20`, marginBottom: 20
});

const badgeStyle: React.CSSProperties = {
  padding: '12px', borderRadius: 12, backgroundColor: C.surfH,
  border: `1px solid ${C.border}`, textAlign: 'center'
};

const successBadgeStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  padding: '14px', borderRadius: 12, backgroundColor: `${C.gold}15`,
  border: `1px solid ${C.gold}40`, boxShadow: NM_FLAT
};

const requestBtnStyle: React.CSSProperties = {
  width: '100%', padding: '14px', borderRadius: 12, border: 'none',
  background: `linear-gradient(135deg, ${C.gold}, #c9a732)`,
  color: C.bg, fontSize: 14, fontWeight: 800, cursor: 'pointer',
  boxShadow: `0 4px 16px rgba(212,175,55,0.3)`
};

const formStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column'
};

const textareaStyle: React.CSSProperties = {
  width: '100%', padding: '14px', borderRadius: 12, backgroundColor: C.bg,
  border: `1px solid ${C.border}`, color: C.text, fontSize: 13,
  boxShadow: NM_INSET, outline: 'none', boxSizing: 'border-box', resize: 'none'
};

const cancelBtnStyle: React.CSSProperties = {
  flex: 1, padding: '12px', borderRadius: 10, border: `1px solid ${C.border}`,
  backgroundColor: C.surfH, color: C.muted, fontSize: 13, fontWeight: 700,
  cursor: 'pointer', boxShadow: NM_FLAT
};

const submitBtnStyle = (disabled: boolean): React.CSSProperties => ({
  flex: 2, padding: '12px', borderRadius: 10, border: 'none',
  background: disabled ? C.surfH : `linear-gradient(135deg, ${C.gold}, #c9a732)`,
  color: disabled ? C.muted : C.bg, fontSize: 13, fontWeight: 800,
  cursor: disabled ? 'not-allowed' : 'pointer',
  boxShadow: disabled ? NM_FLAT : `0 4px 16px rgba(212,175,55,0.3)`,
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
});

