/**
 * NERMAI SACS — Universal Neumorphic Permission Panel (Web)
 *
 * Embeds in every entity editor (Course, Subject, Topic, Class, Resource…).
 * Provides Inherit/Override toggle + full SACS visibility controls.
 *
 * Usage:
 *   <PermissionPanel
 *     entityId={courseId}
 *     entityType="course"
 *     parentId={undefined}
 *   />
 */

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, ChevronDown, ChevronUp, Users, Layers,
  AlertTriangle, Check, Lock, Globe, Eye, EyeOff, Blend,
  Filter
} from 'lucide-react';
import { StudentApi, AccessRulesApi, BatchApi } from '../core/services';

/* ─── Design Tokens (mirrored from @nermai/theme) ────────────────────────────── */
const C = {
  bg:      '#0E0E0E',
  surface: '#1B1B1B',
  surfH:   '#252525',
  gold:    '#D4AF37',
  red:     '#FF3B30',
  text:    '#F8F8F8',
  muted:   '#A0A0A0',
  border:  'rgba(255,255,255,0.07)',
  green:   '#34C759',
  warn:    '#FF9500',
};

const NM_RAISED = '5px 5px 14px #0a0a0a, -5px -5px 14px #2c2c2c';
const NM_INSET  = 'inset 3px 3px 8px #0a0a0a, inset -3px -3px 8px #262626';
const NM_FLAT   = '3px 3px 8px #0d0d0d, -3px -3px 8px #292929';
const NM_GOLD   = `3px 3px 10px #080808, -3px -3px 10px #2d2d2d, 0 0 0 1px rgba(212,175,55,0.3)`;

/* ─── Types ──────────────────────────────────────────────────────────────────── */
type EntityType = 'course'|'subject'|'topic'|'class'|'resource'|'assignment'|'test'|'live_session';
type VisMode    = 'public'|'batch'|'student'|'mixed'|'hidden';
type CascadeMode = 'this_only'|'inheriting_children'|'force_all';

interface PermissionPanelProps {
  entityId:   string;
  entityType: EntityType;
  parentId?:  string;
  /** Called when admin saves */
  onSave?: (data: {
    permissionMode: 'inherit'|'override';
    visibility?: VisMode;
    targetBatchIds?: string[];
    targetStudentIds?: string[];
    cascade?: CascadeMode;
    unlocksAt?: string;
  }) => Promise<void>;
}

interface Batch   { id: string; name: string; type: string; }
interface Student { id: string; name: string; rollNo?: string; }

/* Mock data — replace with real API calls */
// We will fetch these from the API now instead of using mocks


const VIS_OPTIONS: { key: VisMode; label: string; desc: string; Icon: React.ElementType; color: string }[] = [
  { key: 'public',  label: 'Public',  desc: 'All enrolled students',            Icon: Globe,   color: C.green },
  { key: 'batch',   label: 'Batch',   desc: 'Selected batches only',            Icon: Layers,  color: C.gold  },
  { key: 'student', label: 'Student', desc: 'Specific students only',           Icon: Users,   color: '#667EEA' },
  { key: 'mixed',   label: 'Mixed',   desc: 'Combination of batch + students',  Icon: Blend,   color: C.warn  },
  { key: 'hidden',  label: 'Hidden',  desc: 'Admin only — nobody else sees it', Icon: EyeOff,  color: C.red   },
];

/* ─── Main Component ─────────────────────────────────────────────────────────── */
export const PermissionPanel: React.FC<PermissionPanelProps> = ({
  entityId, entityType, parentId, onSave,
}) => {
  const [expanded, setExpanded]               = useState(true);
  const [mode, setMode]                       = useState<'inherit'|'override'>('inherit');
  const [vis, setVis]                         = useState<VisMode>('public');
  const [selectedBatches, setSelectedBatches] = useState<string[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [cascade, setCascade]                 = useState<CascadeMode>('this_only');
  const [unlocksAt, setUnlocksAt]             = useState('');
  const [conflict, setConflict]               = useState<string | null>(null);
  const [saving, setSaving]                   = useState(false);
  const [showCascadeModal, setShowCascadeModal] = useState(false);

  // Data fetching
  const [dbStudents, setDbStudents] = useState<Student[]>([]);
  const [dbBatches, setDbBatches] = useState<Batch[]>([]);
  const [requestedStudentIds, setRequestedStudentIds] = useState<Set<string>>(new Set());
  const [studentFilterMode, setStudentFilterMode] = useState<'all' | 'requested'>('requested');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [studentsRes, batchesRes, requestsRes] = await Promise.all([
          StudentApi.listStudents(),
          BatchApi.listBatches(),
          AccessRulesApi.listAccessRequests({ entityId })
        ]);
        
        // Map API models to local interface if needed
        setDbStudents(studentsRes.data?.data || []);
        setDbBatches(batchesRes.data?.data || []);
        
        const reqIds = (requestsRes.data?.data || [])
          .filter((req: any) => req.status === 'pending')
          .map((req: any) => req.studentId);
        setRequestedStudentIds(new Set(reqIds));

        // If no pending requests, default to showing all students
        if (reqIds.length === 0) setStudentFilterMode('all');
      } catch (err) {
        console.error('Failed to fetch SACS panel data', err);
      }
    };
    fetchData();
  }, [entityId]);

  /** Warn-only conflict detection (advisory) */
  useEffect(() => {
    if (mode === 'override' && vis === 'hidden' && parentId) {
      setConflict('This entity is hidden, but its parent is visible. Students who can navigate to the parent will see this entity as locked.');
    } else if (mode === 'override' && vis === 'batch' && selectedBatches.length === 0 && parentId) {
      setConflict('Batch mode selected but no batches chosen — all students will be denied access.');
    } else {
      setConflict(null);
    }
  }, [mode, vis, selectedBatches, parentId]);

  const toggleBatch = (id: string) => {
    setSelectedBatches(prev => prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]);
  };
  const toggleStudent = (id: string) => {
    setSelectedStudents(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const handleSave = async () => {
    if (mode === 'override') {
      setShowCascadeModal(true);
    } else {
      await _save('this_only');
    }
  };

  const _save = async (cas: CascadeMode) => {
    setShowCascadeModal(false);
    setSaving(true);
    try {
      await onSave?.({
        permissionMode: mode,
        visibility:       mode === 'override' ? vis : undefined,
        targetBatchIds:   (mode === 'override' && (vis === 'batch'   || vis === 'mixed')) ? selectedBatches   : undefined,
        targetStudentIds: (mode === 'override' && (vis === 'student' || vis === 'mixed')) ? selectedStudents  : undefined,
        cascade: cas,
        unlocksAt: unlocksAt || undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={panelStyle}>
      {/* ── Header ── */}
      <button onClick={() => setExpanded(e => !e)} style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={iconWrapStyle}>
            <ShieldCheck size={16} color={C.gold} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Visibility & Access</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>
              {mode === 'inherit' ? 'Inheriting from parent' : `Override: ${vis}`}
            </div>
          </div>
        </div>
        <div style={{ color: C.muted }}>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {expanded && (
        <div style={{ padding: '16px 20px 20px' }}>

          {/* ── Conflict Warning (advisory only) ── */}
          {conflict && (
            <div style={conflictBannerStyle}>
              <AlertTriangle size={14} color={C.warn} style={{ flexShrink: 0 }} />
              <div style={{ fontSize: 12, color: C.warn, lineHeight: 1.5 }}>{conflict}</div>
              <button style={conflictDismissStyle} onClick={() => setConflict(null)}>Dismiss</button>
            </div>
          )}

          {/* ── Mode Toggle (Inherit / Override) ── */}
          <div style={sectionStyle}>
            <div style={sectionLabelStyle}>Permission Mode</div>
            <div style={toggleRowStyle}>
              <ModeBtn active={mode === 'inherit'} onClick={() => setMode('inherit')} label="↑ Inherit Parent" />
              <ModeBtn active={mode === 'override'} onClick={() => setMode('override')} label="✎ Override" />
            </div>
            {mode === 'inherit' && (
              <div style={inheritBadgeStyle}>
                Currently inheriting: <strong style={{ color: C.gold }}>Online + Recorded Batches</strong>
              </div>
            )}
          </div>

          {/* ── Visibility Options (only when override) ── */}
          {mode === 'override' && (
            <>
              <div style={sectionStyle}>
                <div style={sectionLabelStyle}>Visibility Mode</div>
                <div style={visGridStyle}>
                  {VIS_OPTIONS.map(opt => (
                    <VisCard
                      key={opt.key}
                      opt={opt}
                      selected={vis === opt.key}
                      onClick={() => setVis(opt.key)}
                    />
                  ))}
                </div>
              </div>

              {/* Batch selector */}
              {(vis === 'batch' || vis === 'mixed') && (
                <div style={sectionStyle}>
                  <div style={sectionLabelStyle}>Select Batches</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {dbBatches.map(b => (
                      <CheckRow
                        key={b.id}
                        label={b.name}
                        sub={b.type}
                        checked={selectedBatches.includes(b.id)}
                        onChange={() => toggleBatch(b.id)}
                        color={C.gold}
                      />
                    ))}
                    {dbBatches.length === 0 && <div style={{ fontSize: 12, color: C.muted }}>Loading batches...</div>}
                  </div>
                </div>
              )}

              {/* Student selector */}
              {(vis === 'student' || vis === 'mixed') && (
                <div style={sectionStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 10 }}>
                    <div style={{ ...sectionLabelStyle, marginBottom: 0 }}>Select Students</div>
                    
                    {/* Filter Toggle */}
                    <div style={filterToggleWrapStyle}>
                      <button 
                        onClick={() => setStudentFilterMode('requested')}
                        style={filterToggleBtnStyle(studentFilterMode === 'requested')}
                      >
                        Requested ({requestedStudentIds.size})
                      </button>
                      <button 
                        onClick={() => setStudentFilterMode('all')}
                        style={filterToggleBtnStyle(studentFilterMode === 'all')}
                      >
                        All
                      </button>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {dbStudents
                      .filter(s => studentFilterMode === 'all' || requestedStudentIds.has(s.id))
                      .map(s => (
                        <CheckRow
                          key={s.id}
                          label={s.name || 'Unnamed Student'}
                          sub={s.rollNo}
                          checked={selectedStudents.includes(s.id)}
                          onChange={() => toggleStudent(s.id)}
                          color='#667EEA'
                        />
                    ))}
                    {dbStudents.length === 0 && <div style={{ fontSize: 12, color: C.muted }}>Loading students...</div>}
                    {dbStudents.length > 0 && studentFilterMode === 'requested' && requestedStudentIds.size === 0 && (
                      <div style={{ fontSize: 12, color: C.muted, padding: 8, textAlign: 'center' }}>No pending requests for this content.</div>
                    )}
                  </div>
                </div>
              )}

              {/* Scheduled unlock */}
              <div style={sectionStyle}>
                <div style={sectionLabelStyle}>Scheduled Unlock (optional)</div>
                <input
                  type="datetime-local"
                  value={unlocksAt}
                  onChange={e => setUnlocksAt(e.target.value)}
                  style={datetimeInputStyle}
                />
              </div>
            </>
          )}

          {/* ── Save Button ── */}
          <button
            onClick={handleSave}
            disabled={saving}
            style={saveButtonStyle(saving)}
          >
            {saving ? 'Saving…' : <><Check size={14} style={{ marginRight: 6 }} />Save Permissions</>}
          </button>
        </div>
      )}

      {/* ── Cascade Modal ── */}
      {showCascadeModal && (
        <CascadeModal
          onSelect={cas => _save(cas)}
          onClose={() => setShowCascadeModal(false)}
        />
      )}
    </div>
  );
};

/* ─── Cascade Modal ──────────────────────────────────────────────────────────── */
const CASCADES: { key: CascadeMode; label: string; desc: string }[] = [
  { key: 'this_only',           label: 'This item only',                  desc: 'Only this entity will change. Children keep their own settings.'                },
  { key: 'inheriting_children', label: 'This + inheriting children',      desc: 'Update this entity and all children that are still inheriting (safe).'          },
  { key: 'force_all',           label: 'Force update all children',       desc: 'Reset ALL children to inherit this rule, overriding their individual settings.'  },
];

const CascadeModal: React.FC<{ onSelect: (c: CascadeMode) => void; onClose: () => void }> = ({
  onSelect, onClose,
}) => {
  const [selected, setSelected] = useState<CascadeMode>('this_only');

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 4 }}>
          Apply to Children?
        </div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 20 }}>
          Choose how this permission change cascades down the hierarchy.
        </div>
        {CASCADES.map(c => (
          <button
            key={c.key}
            onClick={() => setSelected(c.key)}
            style={{
              ...cascadeItemStyle,
              borderColor: selected === c.key ? C.gold : C.border,
              background:  selected === c.key ? `rgba(212,175,55,0.08)` : C.surfH,
              boxShadow:   selected === c.key ? NM_GOLD : NM_FLAT,
            }}
          >
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{
                width: 16, height: 16, borderRadius: 8, border: `2px solid ${selected === c.key ? C.gold : C.muted}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
              }}>
                {selected === c.key && <div style={{ width: 6, height: 6, borderRadius: 3, background: C.gold }} />}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: selected === c.key ? C.gold : C.text }}>
                  {c.label}
                </div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 3, lineHeight: 1.5 }}>{c.desc}</div>
              </div>
            </div>
          </button>
        ))}
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={cancelBtnStyle}>Cancel</button>
          <button onClick={() => onSelect(selected)} style={confirmBtnStyle}>Apply</button>
        </div>
      </div>
    </div>
  );
};

/* ─── Sub-components ─────────────────────────────────────────────────────────── */
const ModeBtn: React.FC<{ active: boolean; onClick: () => void; label: string }> = ({
  active, onClick, label,
}) => (
  <button onClick={onClick} style={{
    flex: 1, padding: '9px 0', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 12,
    fontWeight: active ? 700 : 500,
    color:      active ? C.bg : C.muted,
    background: active ? `linear-gradient(135deg, ${C.gold}, #c9a732)` : C.surfH,
    boxShadow:  active ? `0 2px 10px rgba(212,175,55,0.4)` : NM_INSET,
    transition: 'all 0.2s',
  }}>
    {label}
  </button>
);

const VisCard: React.FC<{
  opt: typeof VIS_OPTIONS[0]; selected: boolean; onClick: () => void;
}> = ({ opt, selected, onClick }) => (
  <button onClick={onClick} style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
    padding: '12px 6px', borderRadius: 12, border: 'none', cursor: 'pointer',
    background: selected ? `${opt.color}15` : C.bg,
    boxShadow:  selected ? `3px 3px 10px #080808, -3px -3px 10px #2d2d2d, 0 0 0 1.5px ${opt.color}50` : NM_FLAT,
    transition: 'all 0.2s',
  }}>
    <opt.Icon size={18} color={selected ? opt.color : C.muted} />
    <span style={{ fontSize: 11, fontWeight: selected ? 700 : 500, color: selected ? opt.color : C.muted }}>
      {opt.label}
    </span>
  </button>
);

const CheckRow: React.FC<{
  label: string; sub?: string; checked: boolean; onChange: () => void; color: string;
}> = ({ label, sub, checked, onChange, color }) => (
  <button onClick={onChange} style={{
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '10px 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
    background: checked ? `${color}10` : C.bg,
    boxShadow:  checked ? `inset 2px 2px 6px #0a0a0a, inset -2px -2px 6px #262626, 0 0 0 1px ${color}30` : NM_FLAT,
    transition: 'all 0.15s', textAlign: 'left',
  }}>
    <div style={{
      width: 18, height: 18, borderRadius: 5, border: `2px solid ${checked ? color : C.muted}`,
      background: checked ? color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      {checked && <Check size={10} color="#000" strokeWidth={3} />}
    </div>
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: checked ? C.text : C.muted }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>{sub}</div>}
    </div>
  </button>
);

/* ─── Styles ─────────────────────────────────────────────────────────────────── */
const panelStyle: React.CSSProperties = {
  backgroundColor: C.surface,
  borderRadius: 16,
  border: `1px solid ${C.border}`,
  boxShadow: NM_RAISED,
  overflow: 'hidden',
  marginBottom: 20,
};

const headerStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer',
  width: '100%', borderBottom: `1px solid ${C.border}`,
};

const iconWrapStyle: React.CSSProperties = {
  width: 34, height: 34, borderRadius: 10,
  background: `rgba(212,175,55,0.12)`,
  border: `1px solid rgba(212,175,55,0.25)`,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  boxShadow: NM_FLAT,
};

const sectionStyle: React.CSSProperties = { marginBottom: 20 };
const sectionLabelStyle: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, color: C.gold,
  letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10,
};

const toggleRowStyle: React.CSSProperties = {
  display: 'flex', gap: 10,
  background: C.bg, borderRadius: 12, padding: 6,
  boxShadow: NM_INSET,
};

const inheritBadgeStyle: React.CSSProperties = {
  marginTop: 10, padding: '8px 12px', borderRadius: 8,
  background: `rgba(212,175,55,0.08)`,
  border: `1px solid rgba(212,175,55,0.2)`,
  fontSize: 12, color: C.muted,
};

const visGridStyle: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8,
};

const filterToggleWrapStyle: React.CSSProperties = {
  display: 'flex', background: C.bg, borderRadius: 8, padding: 4,
  boxShadow: NM_INSET, gap: 4
};

const filterToggleBtnStyle = (active: boolean): React.CSSProperties => ({
  background: active ? C.surface : 'transparent',
  color: active ? C.text : C.muted,
  border: active ? `1px solid ${C.border}` : '1px solid transparent',
  borderRadius: 6, fontSize: 11, fontWeight: active ? 700 : 500,
  padding: '4px 10px', cursor: 'pointer', boxShadow: active ? NM_FLAT : 'none',
  transition: 'all 0.2s'
});

const datetimeInputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 10,
  background: C.bg, border: `1px solid ${C.border}`,
  color: C.text, fontSize: 13,
  boxShadow: NM_INSET, outline: 'none',
  boxSizing: 'border-box',
};

const saveButtonStyle = (saving: boolean): React.CSSProperties => ({
  width: '100%', padding: '12px', borderRadius: 12, border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
  background: saving ? C.surfH : `linear-gradient(135deg, ${C.gold}, #c9a732)`,
  color: saving ? C.muted : C.bg, fontSize: 14, fontWeight: 800, letterSpacing: 0.5,
  boxShadow: saving ? NM_INSET : `0 4px 16px rgba(212,175,55,0.35)`,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'all 0.2s',
});

const conflictBannerStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', borderRadius: 10,
  background: `rgba(255,149,0,0.08)`, border: `1px solid rgba(255,149,0,0.25)`,
  marginBottom: 16,
};

const conflictDismissStyle: React.CSSProperties = {
  marginLeft: 'auto', background: 'none', border: 'none',
  color: C.warn, cursor: 'pointer', fontSize: 11, fontWeight: 700, flexShrink: 0,
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
  backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
};

const modalStyle: React.CSSProperties = {
  background: C.surface, borderRadius: 20, padding: '24px', width: 420,
  boxShadow: `${NM_RAISED}, 0 0 0 1px ${C.border}`,
};

const cascadeItemStyle: React.CSSProperties = {
  width: '100%', padding: 16, borderRadius: 12, border: '1px solid',
  cursor: 'pointer', marginBottom: 10, textAlign: 'left', transition: 'all 0.18s',
};

const cancelBtnStyle: React.CSSProperties = {
  flex: 1, padding: 12, borderRadius: 10, border: `1px solid ${C.border}`,
  background: C.surfH, color: C.muted, cursor: 'pointer', fontWeight: 700, boxShadow: NM_FLAT,
};

const confirmBtnStyle: React.CSSProperties = {
  flex: 2, padding: 12, borderRadius: 10, border: 'none',
  background: `linear-gradient(135deg, ${C.gold}, #c9a732)`,
  color: C.bg, cursor: 'pointer', fontWeight: 800, boxShadow: `0 4px 16px rgba(212,175,55,0.35)`,
};


