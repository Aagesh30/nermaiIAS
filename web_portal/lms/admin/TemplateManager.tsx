/**
 * NERMAI SACS — Web Template Manager
 * 
 * Create, edit, and apply reusable permission templates.
 */

import React, { useState } from 'react';
import { BookTemplate, Plus, Trash2, CheckCircle2, Copy } from 'lucide-react';

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
interface Template {
  id: string;
  name: string;
  description: string;
  visibility: string;
  targetBatchIds: string[];
}

const MOCK_TEMPLATES: Template[] = [
  { id: '1', name: 'Online Only (Locked)', description: 'Visible only to Online Batch A', visibility: 'batch', targetBatchIds: ['b1'] },
  { id: '2', name: 'Public (All Batches)', description: 'Visible to all enrolled students', visibility: 'public', targetBatchIds: [] },
  { id: '3', name: 'Admin Only (Hidden)', description: 'Hidden from all students', visibility: 'hidden', targetBatchIds: [] },
];

/* ─── Main Component ─────────────────────────────────────────────────────────── */
export const TemplateManager: React.FC = () => {
  const [templates, setTemplates] = useState<Template[]>(MOCK_TEMPLATES);

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: C.text, margin: 0 }}>Permission Templates</h1>
          <p style={{ color: C.muted, margin: '4px 0 0 0', fontSize: 14 }}>
            Create reusable access configurations to apply quickly across courses.
          </p>
        </div>
        
        <button style={createBtnStyle}>
          <Plus size={16} /> Create Template
        </button>
      </div>

      {/* Templates Grid */}
      <div style={gridStyle}>
        {templates.map(tpl => (
          <div key={tpl.id} style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={iconWrapStyle}>
                  <BookTemplate size={18} color={C.gold} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.text }}>{tpl.name}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <span style={badgeStyle}>{tpl.visibility.toUpperCase()}</span>
                    {tpl.targetBatchIds.length > 0 && (
                      <span style={{ fontSize: 12, color: C.muted }}>
                        • {tpl.targetBatchIds.length} Batches
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <p style={{ fontSize: 13, color: C.muted, margin: '0 0 20px 0', lineHeight: 1.5 }}>
              {tpl.description}
            </p>

            <div style={{ display: 'flex', gap: 8, borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
              <button style={actionBtnStyle}>
                <CheckCircle2 size={14} /> Apply to...
              </button>
              <button style={iconBtnStyle}>
                <Copy size={14} />
              </button>
              <button style={{ ...iconBtnStyle, color: C.red }}>
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ─── Styles ─────────────────────────────────────────────────────────────────── */
const gridStyle: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20
};

const cardStyle: React.CSSProperties = {
  backgroundColor: C.surface, borderRadius: 16, padding: 20,
  border: `1px solid ${C.border}`, boxShadow: NM_RAISED,
  display: 'flex', flexDirection: 'column'
};

const iconWrapStyle: React.CSSProperties = {
  width: 40, height: 40, borderRadius: 12,
  backgroundColor: `${C.gold}15`, border: `1px solid ${C.gold}30`,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  boxShadow: NM_FLAT
};

const badgeStyle: React.CSSProperties = {
  padding: '2px 8px', borderRadius: 6, backgroundColor: `${C.gold}20`,
  color: C.gold, fontSize: 10, fontWeight: 800, letterSpacing: 0.5
};

const createBtnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8,
  padding: '10px 20px', borderRadius: 10, border: 'none',
  background: `linear-gradient(135deg, ${C.gold}, #c9a732)`,
  color: C.bg, fontSize: 14, fontWeight: 800, cursor: 'pointer',
  boxShadow: `0 4px 16px rgba(212,175,55,0.3)`
};

const actionBtnStyle: React.CSSProperties = {
  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.border}`,
  backgroundColor: C.surfH, color: C.text, fontSize: 13, fontWeight: 600,
  cursor: 'pointer', boxShadow: NM_FLAT, transition: 'all 0.2s'
};

const iconBtnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 36, height: 36, borderRadius: 8, border: `1px solid ${C.border}`,
  backgroundColor: C.surfH, color: C.muted, cursor: 'pointer',
  boxShadow: NM_FLAT, transition: 'all 0.2s'
};


