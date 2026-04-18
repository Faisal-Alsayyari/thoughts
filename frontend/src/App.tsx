import { useState, useEffect, useCallback, useRef } from 'react';
import Canvas from './components/Canvas';
import { listConversations, deleteConversation, renameConversation, pinConversation } from './lib/db';
import type { Conversation } from './types/node';

export default function App() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const refreshList = useCallback(async () => {
    const list = await listConversations();
    // Sort: pinned first, then by updatedAt (already newest-first from DB)
    list.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return 0;
    });
    setConversations(list);
    return list;
  }, []);

  // Load conversation list on mount
  useEffect(() => {
    refreshList().then((list) => {
      if (list.length > 0) {
        setActiveId(list[0].id);
      } else {
        const id = crypto.randomUUID();
        setActiveId(id);
      }
    });
  }, [refreshList]);

  const handleNew = () => {
    const id = crypto.randomUUID();
    setActiveId(id);
    setTimeout(refreshList, 1000);
  };

  const handleDelete = async (id: string) => {
    setMenuOpenId(null);
    await deleteConversation(id);
    const list = await refreshList();
    if (activeId === id) {
      if (list.length > 0) {
        setActiveId(list[0].id);
      } else {
        handleNew();
      }
    }
  };

  const handleSelect = (id: string) => {
    setActiveId(id);
  };

  const handleRenameStart = (conv: Conversation) => {
    setMenuOpenId(null);
    setRenamingId(conv.id);
    setRenameValue(conv.title || '');
    setTimeout(() => renameInputRef.current?.focus(), 0);
  };

  const handleRenameCommit = async () => {
    if (renamingId && renameValue.trim()) {
      await renameConversation(renamingId, renameValue.trim());
      await refreshList();
    }
    setRenamingId(null);
    setRenameValue('');
  };

  const handlePin = async (conv: Conversation) => {
    setMenuOpenId(null);
    await pinConversation(conv.id, !conv.pinned);
    await refreshList();
  };

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as globalThis.Node)) {
        setMenuOpenId(null);
      }
    };
    if (menuOpenId) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpenId]);

  // Periodically refresh sidebar to pick up title changes from auto-save
  useEffect(() => {
    const interval = setInterval(refreshList, 3000);
    return () => clearInterval(interval);
  }, [refreshList]);

  if (!activeId) return null;

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%' }}>
      {/* Sidebar */}
      <div style={{
        width: sidebarOpen ? '260px' : '0px',
        minWidth: sidebarOpen ? '260px' : '0px',
        height: '100%',
        background: '#f9fafb',
        borderRight: sidebarOpen ? '1px solid #e5e7eb' : 'none',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: 'width 0.2s, min-width 0.2s',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}>
        <div style={{
          padding: '16px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{ fontWeight: 600, fontSize: '14px', color: '#111827' }}>Conversations</span>
          <button
            onClick={handleNew}
            style={{
              padding: '4px 10px',
              fontSize: '12px',
              fontWeight: 500,
              color: '#fff',
              backgroundColor: '#390c6c',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            + New
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {conversations.map((conv) => (
            <SidebarItem
              key={conv.id}
              conv={conv}
              isActive={conv.id === activeId}
              isRenaming={conv.id === renamingId}
              renameValue={renameValue}
              renameInputRef={conv.id === renamingId ? renameInputRef : undefined}
              menuOpen={conv.id === menuOpenId}
              menuRef={conv.id === menuOpenId ? menuRef : undefined}
              onSelect={() => handleSelect(conv.id)}
              onMenuToggle={() => setMenuOpenId(menuOpenId === conv.id ? null : conv.id)}
              onRenameStart={() => handleRenameStart(conv)}
              onRenameChange={setRenameValue}
              onRenameCommit={handleRenameCommit}
              onPin={() => handlePin(conv)}
              onDelete={() => handleDelete(conv.id)}
            />
          ))}
          {conversations.length === 0 && (
            <div style={{ fontSize: '13px', color: '#9ca3af', textAlign: 'center', marginTop: '20px' }}>
              No conversations yet
            </div>
          )}
        </div>
      </div>

      {/* Toggle sidebar button */}
      <button
        onClick={() => setSidebarOpen((v) => !v)}
        style={{
          position: 'absolute',
          top: '12px',
          left: sidebarOpen ? '268px' : '8px',
          zIndex: 10,
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: '6px',
          padding: '4px 8px',
          cursor: 'pointer',
          fontSize: '14px',
          color: '#6b7280',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          transition: 'left 0.2s',
        }}
      >
        {sidebarOpen ? '◀' : '▶'}
      </button>

      {/* Canvas area */}
      <div style={{ flex: 1, height: '100%' }}>
        <Canvas key={activeId} conversationId={activeId} />
      </div>
    </div>
  );
}

/* ── Sidebar conversation item ── */

function SidebarItem({ conv, isActive, isRenaming, renameValue, renameInputRef, menuOpen, menuRef, onSelect, onMenuToggle, onRenameStart, onRenameChange, onRenameCommit, onPin, onDelete }: {
  conv: Conversation;
  isActive: boolean;
  isRenaming: boolean;
  renameValue: string;
  renameInputRef?: React.RefObject<HTMLInputElement | null>;
  menuOpen: boolean;
  menuRef?: React.RefObject<HTMLDivElement | null>;
  onSelect: () => void;
  onMenuToggle: () => void;
  onRenameStart: () => void;
  onRenameChange: (v: string) => void;
  onRenameCommit: () => void;
  onPin: () => void;
  onDelete: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); }}
      style={{
        padding: '10px 12px',
        marginBottom: '4px',
        borderRadius: '8px',
        cursor: 'pointer',
        background: isActive ? '#ede9fe' : hovered ? '#f3f4f6' : 'transparent',
        border: isActive ? '1px solid #c4b5fd' : '1px solid transparent',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '8px',
        position: 'relative',
      }}
    >
      <div style={{ overflow: 'hidden', flex: 1 }}>
        {isRenaming ? (
          <div style={{
            position: 'relative',
            margin: '-4px -6px',
          }}>
            <input
              ref={renameInputRef}
              value={renameValue}
              onChange={(e) => onRenameChange(e.target.value)}
              onBlur={onRenameCommit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onRenameCommit();
                if (e.key === 'Escape') onRenameCommit();
              }}
              onClick={(e) => e.stopPropagation()}
              style={{
                fontSize: '13px',
                fontWeight: 500,
                color: '#111827',
                border: '1.5px solid #a78bfa',
                borderRadius: '6px',
                padding: '6px 10px',
                width: '100%',
                outline: 'none',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
                background: '#fff',
                boxShadow: '0 0 0 3px rgba(167, 139, 250, 0.15), 0 1px 3px rgba(0,0,0,0.06)',
                transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
            />
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '4px',
              marginTop: '4px',
            }}>
              <button
                onClick={(e) => { e.stopPropagation(); onRenameCommit(); }}
                style={{
                  fontSize: '11px',
                  fontWeight: 500,
                  color: '#fff',
                    background: '#390c6c',
                  border: 'none',
                    borderRadius: '999px',
                    padding: '4px 12px',
                  cursor: 'pointer',
                    lineHeight: '18px',
                    boxShadow: '0 1px 2px rgba(57, 12, 108, 0.22)',
                    transition: 'background-color 0.2s ease, transform 0.2s ease',
                }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#270949';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#390c6c';
                  }}
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <>
            <div style={{
              fontSize: '13px',
              fontWeight: 500,
              color: '#111827',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}>
              {conv.pinned && <span style={{ fontSize: '11px' }} title="Pinned">📌</span>}
              {conv.title || 'New conversation'}
            </div>
            <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
              {new Date(conv.updatedAt).toLocaleDateString()}
            </div>
          </>
        )}
      </div>

      {/* 3-dot menu trigger — visible on hover or when menu is open */}
      {(hovered || menuOpen) && !isRenaming && (
        <button
          onClick={(e) => { e.stopPropagation(); onMenuToggle(); }}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#6b7280',
            fontSize: '18px',
            padding: '2px 4px',
            borderRadius: '4px',
            lineHeight: 1,
            flexShrink: 0,
          }}
          title="More options"
        >
          ⋯
        </button>
      )}

      {/* Dropdown menu */}
      {menuOpen && (
        <div
          ref={menuRef}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: '100%',
            right: '8px',
            marginTop: '2px',
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            zIndex: 20,
            minWidth: '140px',
            overflow: 'hidden',
          }}
        >
          <MenuButton label="Rename" onClick={onRenameStart} />
          <MenuButton label={conv.pinned ? 'Unpin' : 'Pin'} onClick={onPin} />
          <MenuButton label="Delete" onClick={onDelete} danger />
        </div>
      )}
    </div>
  );
}

function MenuButton({ label, onClick, danger }: { label: string; onClick: () => void; danger?: boolean }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'block',
        width: '100%',
        padding: '8px 14px',
        fontSize: '13px',
        fontWeight: 400,
        color: danger ? '#dc2626' : '#374151',
        background: hovered ? (danger ? '#fef2f2' : '#f9fafb') : 'transparent',
        border: 'none',
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: 'inherit',
      }}
    >
      {label}
    </button>
  );
}