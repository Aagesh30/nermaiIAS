/**
 * NERMAI SACS — Web Permission Matrix
 * 
 * A bird's-eye view of all access rules for a specific course hierarchy.
 * Displays a tree structure (Course -> Subject -> Topic -> Class/Resource)
 * crossed with Batch capabilities.
 */

import React, { useState } from 'react';
import { 
  ChevronRight, ChevronDown, Check, X, ShieldAlert, BookOpen, 
  Library, Layers, Presentation, Files
} from 'lucide-react';

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
  green:   '#34C759',
};

const NM_RAISED = '5px 5px 14px #0a0a0a, -5px -5px 14px #2c2c2c';
const NM_INSET  = 'inset 3px 3px 8px #0a0a0a, inset -3px -3px 8px #262626';
const NM_FLAT   = '3px 3px 8px #0d0d0d, -3px -3px 8px #292929';

/* ─── Types ─────────────────────────────────────────────────────────────────── */
interface MatrixNode {
  id: string;
  name: string;
  type: 'course' | 'subject' | 'topic' | 'class' | 'resource';
  level: number;
  expanded?: boolean;
  visibility: 'public' | 'batch' | 'hidden' | 'mixed';
  hasOverride: boolean;
  batchAccess: Record<string, boolean>; // batchId -> true/false
  children?: MatrixNode[];
}

const MOCK_BATCHES = [
  { id: 'b1', name: 'Online Batch A' },
  { id: 'b2', name: 'Recorded Batch B' },
  { id: 'b3', name: 'Offline Batch C' },
];

const MOCK_TREE: MatrixNode[] = [
  {
    id: 'c1', name: 'UPSC Foundation 2027', type: 'course', level: 0, expanded: true, visibility: 'batch', hasOverride: true,
    batchAccess: { b1: true, b2: true, b3: false },
    children: [
      {
        id: 's1', name: 'Indian Polity', type: 'subject', level: 1, expanded: true, visibility: 'batch', hasOverride: false,
        batchAccess: { b1: true, b2: true, b3: false },
        children: [
          {
            id: 't1', name: 'Fundamental Rights', type: 'topic', level: 2, expanded: true, visibility: 'batch', hasOverride: false,
            batchAccess: { b1: true, b2: true, b3: false },
            children: [
              { id: 'cls1', name: 'Class 1: Introduction to FR', type: 'class', level: 3, visibility: 'public', hasOverride: true, batchAccess: { b1: true, b2: true, b3: true } },
              { id: 'cls2', name: 'Class 2: Article 14-18', type: 'class', level: 3, visibility: 'batch', hasOverride: false, batchAccess: { b1: true, b2: true, b3: false } },
              { id: 'res1', name: 'Notes: Article 14-18', type: 'resource', level: 3, visibility: 'hidden', hasOverride: true, batchAccess: { b1: false, b2: false, b3: false } },
            ]
          }
        ]
      }
    ]
  }
];

const TYPE_ICONS = {
  course: BookOpen,
  subject: Library,
  topic: Layers,
  class: Presentation,
  resource: Files,
};

/* ─── Main Component ─────────────────────────────────────────────────────────── */
export const PermissionMatrix: React.FC = () => {
  const [tree, setTree] = useState<MatrixNode[]>(MOCK_TREE);

  const toggleExpand = (id: string, nodes: MatrixNode[]): MatrixNode[] => {
    return nodes.map(n => {
      if (n.id === id) return { ...n, expanded: !n.expanded };
      if (n.children) return { ...n, children: toggleExpand(id, n.children) };
      return n;
    });
  };

  const renderRows = (nodes: MatrixNode[]): React.ReactNode[] => {
    let rows: React.ReactNode[] = [];
    
    nodes.forEach(node => {
      const Icon = TYPE_ICONS[node.type];
      const hasChildren = node.children && node.children.length > 0;
      
      rows.push(
        <div key={node.id} style={rowStyle}>
          {/* Entity Name Column */}
          <div style={{ ...cellStyle, flex: 2, paddingLeft: 16 + node.level * 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {hasChildren ? (
                <button 
                  onClick={() => setTree(prev => toggleExpand(node.id, prev))}
                  style={expandBtnStyle}
                >
                  {node.expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
              ) : (
                <div style={{ width: 24 }} /> // spacer
              )}
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon size={14} color={node.hasOverride ? C.gold : C.muted} />
                <span style={{ fontSize: 13, fontWeight: node.level === 0 ? 800 : 600, color: node.hasOverride ? C.text : C.muted }}>
                  {node.name}
                </span>
                {node.hasOverride && (
                  <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, backgroundColor: `${C.gold}20`, color: C.gold, fontWeight: 700 }}>
                    OVERRIDE
                  </span>
                )}
                {node.visibility === 'hidden' && (
                  <ShieldAlert size={14} color={C.red} style={{ marginLeft: 4 }} />
                )}
              </div>
            </div>
          </div>

          {/* Batch Columns */}
          {MOCK_BATCHES.map(batch => {
            const hasAccess = node.batchAccess[batch.id];
            return (
              <div key={batch.id} style={{ ...cellStyle, justifyContent: 'center' }}>
                <div style={{
                  width: 20, height: 20, borderRadius: 6,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backgroundColor: hasAccess ? `${C.green}15` : `${C.red}10`,
                  border: `1px solid ${hasAccess ? `${C.green}40` : `${C.red}30`}`,
                  boxShadow: NM_FLAT
                }}>
                  {hasAccess ? <Check size={12} color={C.green} strokeWidth={3} /> : <X size={12} color={C.red} strokeWidth={3} />}
                </div>
              </div>
            );
          })}
        </div>
      );

      if (hasChildren && node.expanded) {
        rows = rows.concat(renderRows(node.children!));
      }
    });

    return rows;
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: C.text, margin: 0 }}>Permission Matrix</h1>
          <p style={{ color: C.muted, margin: '4px 0 0 0', fontSize: 14 }}>
            Bird's-eye view of effective permissions across the entire course tree.
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: 12 }}>
          <select style={selectStyle}>
            <option>UPSC Foundation 2027</option>
            <option>NEET Crash Course</option>
          </select>
        </div>
      </div>

      {/* Matrix Table */}
      <div style={matrixContainerStyle}>
        
        {/* Table Header */}
        <div style={headerRowStyle}>
          <div style={{ ...thStyle, flex: 2, paddingLeft: 48 }}>Content Entity</div>
          {MOCK_BATCHES.map(batch => (
            <div key={batch.id} style={{ ...thStyle, justifyContent: 'center', textAlign: 'center' }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: C.text }}>{batch.name}</div>
            </div>
          ))}
        </div>

        {/* Table Body */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {renderRows(tree)}
        </div>

      </div>
    </div>
  );
};

/* ─── Styles ─────────────────────────────────────────────────────────────────── */
const matrixContainerStyle: React.CSSProperties = {
  backgroundColor: C.surface, borderRadius: 16, border: `1px solid ${C.border}`,
  boxShadow: NM_RAISED, overflow: 'hidden'
};

const headerRowStyle: React.CSSProperties = {
  display: 'flex', borderBottom: `1px solid ${C.border}`, backgroundColor: C.surfH,
};

const thStyle: React.CSSProperties = {
  flex: 1, padding: '16px', fontSize: 11, fontWeight: 800,
  color: C.muted, textTransform: 'uppercase', letterSpacing: 1,
  display: 'flex', alignItems: 'center'
};

const rowStyle: React.CSSProperties = {
  display: 'flex', borderBottom: `1px solid rgba(255,255,255,0.03)`,
  transition: 'background-color 0.2s',
};

const cellStyle: React.CSSProperties = {
  flex: 1, padding: '12px 16px', display: 'flex', alignItems: 'center'
};

const expandBtnStyle: React.CSSProperties = {
  width: 24, height: 24, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: C.bg, border: `1px solid ${C.border}`, color: C.text, cursor: 'pointer',
  boxShadow: NM_FLAT
};

const selectStyle: React.CSSProperties = {
  background: C.surface, border: `1px solid ${C.border}`, color: C.text, fontSize: 13,
  outline: 'none', cursor: 'pointer', fontWeight: 600, padding: '8px 16px', borderRadius: 8,
  boxShadow: NM_FLAT
};


