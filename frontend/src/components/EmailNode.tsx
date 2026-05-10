import { useState, useRef, useEffect } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import type { EmailNodeData } from '../types/node';

function StatusBadge({ status }: { status: EmailNodeData['status'] }) {
  const configs: Record<EmailNodeData['status'], { label: string; bg: string; color: string }> = {
    idle:    { label: 'Draft',   bg: '#f3f4f6', color: '#6b7280' },
    sending: { label: 'Sending…', bg: '#eff6ff', color: '#2563eb' },
    sent:    { label: 'Sent',    bg: '#f0fdf4', color: '#16a34a' },
    failed:  { label: 'Failed',  bg: '#fef2f2', color: '#dc2626' },
  };
  const c = configs[status];
  return (
    <span style={{
      fontSize: '10px',
      fontWeight: 600,
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
      padding: '2px 7px',
      borderRadius: '999px',
      background: c.bg,
      color: c.color,
    }}>
      {status === 'sending' ? '⟳ ' : ''}{c.label}
    </span>
  );
}

export default function EmailNode({ id, data, isConnectable }: NodeProps<Node<EmailNodeData>>) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as unknown as Element)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const bodyPreview = data.body
    ? data.body.replace(/\s+/g, ' ').trim().slice(0, 80) + (data.body.length > 80 ? '…' : '')
    : '';

  return (
    <div
      className="react-flow__node-default"
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('[data-action="add-child"]')) return;
        data.onExpand?.(id);
      }}
      style={{
        padding: '15px',
        borderRadius: '12px',
        border: '1px solid #ddd6fe',
        background: '#faf5ff',
        width: '350px',
        textAlign: 'left',
        boxShadow: '0 4px 6px -1px rgba(88,28,135,0.08), 0 2px 4px -1px rgba(88,28,135,0.04)',
        fontFamily: 'Inter, system-ui, sans-serif',
        cursor: 'pointer',
        transition: 'box-shadow 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 8px 25px -5px rgba(88,28,135,0.15), 0 4px 6px -1px rgba(88,28,135,0.08)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(88,28,135,0.08), 0 2px 4px -1px rgba(88,28,135,0.04)';
      }}
    >
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '15px' }}>✉️</span>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#581c87', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Email
          </span>
        </div>
        <StatusBadge status={data.status} />
      </div>

      {/* Content preview */}
      {!data.to && !data.subject && !data.body ? (
        <div style={{ fontSize: '14px', color: '#9ca3af', fontStyle: 'italic', padding: '4px 0' }}>
          Click to compose email…
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {data.to && (
            <div style={{ fontSize: '12px', color: '#6b7280' }}>
              <span style={{ fontWeight: 600, color: '#374151' }}>To: </span>
              <span style={{ fontFamily: 'monospace' }}>{data.to}</span>
            </div>
          )}
          {data.subject && (
            <div style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#1f2937',
              lineHeight: '1.3',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {data.subject}
            </div>
          )}
          {bodyPreview && (
            <div style={{ fontSize: '13px', color: '#6b7280', lineHeight: '1.4' }}>
              {bodyPreview}
            </div>
          )}
          {data.status === 'sent' && data.sentAt && (
            <div style={{ fontSize: '11px', color: '#16a34a', marginTop: '2px' }}>
              ✓ Sent {new Date(data.sentAt).toLocaleString()}
            </div>
          )}
          {data.status === 'failed' && data.lastError && (
            <div style={{ fontSize: '11px', color: '#dc2626', marginTop: '2px' }}>
              ⚠ {data.lastError}
            </div>
          )}
        </div>
      )}

      {/* Action Bar */}
      <div
        data-action="add-child"
        ref={menuRef}
        style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end', position: 'relative' }}
      >
        <button
          className="nodrag"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen(o => !o);
          }}
          style={{
            padding: '6px 12px',
            fontSize: '12px',
            fontWeight: 500,
            color: '#581c87',
            backgroundColor: 'transparent',
            border: '1px solid #ddd6fe',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#ede9fe'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
        >
          + Add ▾
        </button>

        {menuOpen && (
          <div
            className="nodrag"
            style={{
              position: 'absolute',
              bottom: '100%',
              right: 0,
              marginBottom: '4px',
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              overflow: 'hidden',
              zIndex: 10,
              minWidth: '148px',
            }}
          >
            {(['chat', 'email'] as const).map((kind) => (
              <button
                key={kind}
                className="nodrag"
                onClick={(e) => {
                  e.stopPropagation();
                  data.onAddChild?.(id, kind);
                  setMenuOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '9px 14px',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#374151',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                {kind === 'chat' ? '💬' : '✉️'}
                {kind === 'chat' ? 'Chat node' : 'Email node'}
              </button>
            ))}
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} />
    </div>
  );
}
