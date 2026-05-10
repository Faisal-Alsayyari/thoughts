import { useState, useRef, useEffect } from 'react';
import type { EmailNodeData } from '../types/node';

const REPLY_TO_KEY = 'thoughts:replyTo';

interface ExpandedEmailViewProps {
  nodeId: string;
  to: string;
  subject: string;
  body: string;
  replyTo: string;
  status: EmailNodeData['status'];
  sentAt?: number;
  messageId?: string;
  lastError?: string;
  onUpdateEmail: (id: string, patch: Partial<Pick<EmailNodeData, 'to' | 'subject' | 'body' | 'replyTo'>>) => void;
  onSendEmail: (id: string, data: { to: string; subject: string; body: string; replyTo: string }) => void;
  onClose: () => void;
  remaining: number | null;
  isLimited: boolean;
  resetAtLabel: string | null;
}

export default function ExpandedEmailView({
  nodeId, to, subject, body, replyTo, status, sentAt, messageId, lastError,
  onUpdateEmail, onSendEmail, onClose, remaining, isLimited, resetAtLabel,
}: ExpandedEmailViewProps) {
  const [localTo, setLocalTo] = useState(to);
  const [localSubject, setLocalSubject] = useState(subject);
  const [localBody, setLocalBody] = useState(body);
  const [localReplyTo, setLocalReplyTo] = useState(() => replyTo || localStorage.getItem(REPLY_TO_KEY) || '');
  const [confirmSend, setConfirmSend] = useState(false);
  const [visible, setVisible] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const isSent = status === 'sent';
  const isSending = status === 'sending';
  const isDisabled = isSent || isSending || isLimited;

  // Sync local state when node data changes externally
  useEffect(() => { setLocalTo(to); }, [to]);
  useEffect(() => { setLocalSubject(subject); }, [subject]);
  useEffect(() => { setLocalBody(body); }, [body]);
  useEffect(() => { if (replyTo) setLocalReplyTo(replyTo); }, [replyTo]);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  // Auto-resize body textarea
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.style.height = 'auto';
      bodyRef.current.style.height = Math.min(bodyRef.current.scrollHeight, 400) + 'px';
    }
  }, [localBody]);

  const handleAnimatedClose = () => {
    setVisible(false);
    setTimeout(onClose, 200);
  };

  const syncField = (field: keyof Pick<EmailNodeData, 'to' | 'subject' | 'body' | 'replyTo'>, value: string) => {
    onUpdateEmail(nodeId, { [field]: value });
  };

  const handleReplyToBlur = () => {
    if (localReplyTo) localStorage.setItem(REPLY_TO_KEY, localReplyTo);
    syncField('replyTo', localReplyTo);
  };

  const isEmailValid = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const canSend = !isDisabled && localTo.trim() && isEmailValid(localTo.trim()) && localSubject.trim() && localBody.trim();

  const handleConfirmSend = () => {
    const sendData = {
      to: localTo.trim(),
      subject: localSubject.trim(),
      body: localBody.trim(),
      replyTo: localReplyTo.trim(),
    };
    // Flush local state to the node so it persists, then send.
    // Pass sendData directly so handleSendEmail never has to read it
    // from a React state updater (which is deferred and would be null).
    onUpdateEmail(nodeId, sendData);
    onSendEmail(nodeId, sendData);
    setConfirmSend(false);
  };

  const fieldStyle = (disabled: boolean): React.CSSProperties => ({
    width: '100%',
    padding: '10px 14px',
    fontSize: '14px',
    lineHeight: '1.5',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    outline: 'none',
    fontFamily: 'inherit',
    background: disabled ? '#f9fafb' : '#fff',
    color: '#111827',
    boxSizing: 'border-box',
    resize: 'none' as const,
  });

  const labelStyle: React.CSSProperties = {
    fontSize: '12px',
    fontWeight: 600,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '4px',
    display: 'block',
  };

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      zIndex: 50,
      background: '#f9fafb',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Inter, system-ui, sans-serif',
      opacity: visible ? 1 : 0,
      transform: visible ? 'scale(1)' : 'scale(0.97)',
      transition: 'opacity 0.2s ease, transform 0.2s ease',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 20px',
        borderBottom: '1px solid #e5e7eb',
        background: '#fff',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexShrink: 0,
      }}>
        <button
          onClick={handleAnimatedClose}
          style={{
            background: 'none',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '6px 12px',
            cursor: 'pointer',
            fontSize: '14px',
            color: '#374151',
          }}
        >
          ← Back to canvas
        </button>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 600, color: '#581c87' }}>
          ✉️ Email
        </span>
        {isSent && (
          <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: 600 }}>
            ✓ Sent {sentAt ? new Date(sentAt).toLocaleString() : ''}
          </span>
        )}
        {isSending && (
          <span style={{ fontSize: '12px', color: '#2563eb' }}>Sending…</span>
        )}
        {status === 'failed' && (
          <span style={{ fontSize: '12px', color: '#dc2626' }}>⚠ Send failed</span>
        )}
      </div>

      {/* Form area */}
      <div className="custom-scrollbar" style={{
        flex: 1,
        overflowY: 'auto',
        padding: '24px 20px',
      }}>
        <div style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Sender notice */}
          <div style={{
            padding: '10px 14px',
            background: '#ede9fe',
            borderRadius: '8px',
            fontSize: '12px',
            color: '#5b21b6',
          }}>
            Sent via an AgentMail inbox on your behalf.
            {localReplyTo ? ` Replies will go to ${localReplyTo}.` : ' Add a Reply-to address so recipients can reach you.'}
          </div>

          {/* To */}
          <div>
            <label style={labelStyle}>To *</label>
            <input
              type="email"
              value={localTo}
              disabled={isDisabled}
              onChange={(e) => setLocalTo(e.target.value)}
              onBlur={() => syncField('to', localTo.trim())}
              placeholder="recipient@example.com"
              style={{ ...fieldStyle(isDisabled), display: 'block' }}
            />
            {localTo && !isEmailValid(localTo) && (
              <div style={{ fontSize: '11px', color: '#dc2626', marginTop: '3px' }}>Enter a valid email address.</div>
            )}
          </div>

          {/* Subject */}
          <div>
            <label style={labelStyle}>Subject *</label>
            <input
              type="text"
              value={localSubject}
              disabled={isDisabled}
              onChange={(e) => setLocalSubject(e.target.value)}
              onBlur={() => syncField('subject', localSubject.trim())}
              placeholder="Email subject"
              style={{ ...fieldStyle(isDisabled), display: 'block' }}
            />
          </div>

          {/* Reply-to */}
          <div>
            <label style={labelStyle}>Reply-to <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional — where replies go)</span></label>
            <input
              type="email"
              value={localReplyTo}
              disabled={isDisabled}
              onChange={(e) => setLocalReplyTo(e.target.value)}
              onBlur={handleReplyToBlur}
              placeholder="you@yourmail.com"
              style={{ ...fieldStyle(isDisabled), display: 'block' }}
            />
          </div>

          {/* Body */}
          <div>
            <label style={labelStyle}>Body *</label>
            <textarea
              ref={bodyRef}
              value={localBody}
              disabled={isDisabled}
              onChange={(e) => setLocalBody(e.target.value)}
              onBlur={() => syncField('body', localBody.trim())}
              placeholder="Write your email here…"
              rows={6}
              className="custom-scrollbar"
              style={{ ...fieldStyle(isDisabled), minHeight: '160px', maxHeight: '400px', overflowY: 'auto' }}
            />
          </div>

          {/* Sent confirmation */}
          {isSent && messageId && (
            <div style={{
              padding: '10px 14px',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#15803d',
            }}>
              Message ID: <code style={{ fontFamily: 'monospace' }}>{messageId}</code>
            </div>
          )}

          {/* Error */}
          {status === 'failed' && lastError && (
            <div style={{
              padding: '10px 14px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              fontSize: '13px',
              color: '#dc2626',
            }}>
              {lastError}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: '16px 20px',
        borderTop: '1px solid #e5e7eb',
        background: '#fff',
        flexShrink: 0,
      }}>
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          {isLimited ? (
            <div style={{
              padding: '14px 16px',
              background: '#fef2f2',
              borderRadius: '12px',
              border: '1px solid #fecaca',
              textAlign: 'center',
              color: '#b91c1c',
              fontSize: '14px',
            }}>
              Daily send limit reached.
              {resetAtLabel && <> Resets at {resetAtLabel}.</>}
            </div>
          ) : confirmSend ? (
            /* Confirmation prompt */
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '14px', color: '#374151', flex: 1 }}>
                Send to <strong>{localTo}</strong>?
              </span>
              <button
                onClick={() => setConfirmSend(false)}
                style={{
                  padding: '10px 18px',
                  fontSize: '14px',
                  color: '#374151',
                  background: 'transparent',
                  border: '1px solid #e5e7eb',
                  borderRadius: '10px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSend}
                style={{
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#fff',
                  background: '#16a34a',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                }}
              >
                ✓ Send
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                {remaining !== null && !isSent && (
                  <span style={{ color: remaining <= 3 ? '#d97706' : '#9ca3af' }}>
                    {remaining} email{remaining !== 1 ? 's' : ''} remaining today
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {status === 'failed' && (
                  <button
                    onClick={() => setConfirmSend(true)}
                    disabled={!canSend}
                    style={{
                      padding: '10px 20px',
                      fontSize: '14px',
                      fontWeight: 500,
                      color: canSend ? '#dc2626' : '#9ca3af',
                      background: 'transparent',
                      border: `1px solid ${canSend ? '#dc2626' : '#d1d5db'}`,
                      borderRadius: '10px',
                      cursor: canSend ? 'pointer' : 'default',
                    }}
                  >
                    Retry send
                  </button>
                )}
                {!isSent && status !== 'failed' && (
                  <button
                    onClick={() => setConfirmSend(true)}
                    disabled={!canSend}
                    style={{
                      padding: '10px 20px',
                      fontSize: '14px',
                      fontWeight: 500,
                      color: '#fff',
                      background: canSend ? '#390c6c' : '#9ca3af',
                      border: 'none',
                      borderRadius: '10px',
                      cursor: canSend ? 'pointer' : 'default',
                      transition: 'background 0.2s',
                    }}
                  >
                    {isSending ? 'Sending…' : 'Send email'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
