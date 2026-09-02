import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const TYPE_ICON = {
  task_assigned: '📋',
  status_changed: '↻',
  overdue: '⚠',
};

export default function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const containerRef = useRef(null);

  async function load() {
    const res = await api.get('/notifications');
    setNotifications(res.data.notifications);
    setUnreadCount(res.data.unreadCount);
    setLoaded(true);
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleOpen() {
    const opening = !open;
    setOpen(opening);
    if (!opening) return;

    const res = await api.get('/notifications');
    const fresh = res.data.notifications;
    setLoaded(true);

    // Opening the panel is what marks everything read - no separate
    // "mark all read" action needed.
    if (res.data.unreadCount > 0) {
      setNotifications(fresh.map((n) => ({ ...n, read: true })));
      api.patch('/notifications/read-all').catch(() => {});
    } else {
      setNotifications(fresh);
    }
    setUnreadCount(0);
  }

  async function handleNotificationClick(n) {
    setOpen(false);
    if (n.taskId) navigate(`/task/${n.taskId}`);
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={handleOpen}
        aria-label="Notifications"
        className="relative w-9 h-9 flex items-center justify-center rounded-sm border border-rule hover:bg-paper-dark transition-colors"
      >
        <svg viewBox="0 0 20 20" width="16" height="16" fill="none" className="text-ink-soft">
          <path
            d="M10 2a5 5 0 0 0-5 5v3.2c0 .5-.2 1-.5 1.4L3 14h14l-1.5-2.4c-.3-.4-.5-.9-.5-1.4V7a5 5 0 0 0-5-5z"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <path
            d="M8 16.5a2 2 0 0 0 4 0"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-stamp text-paper text-[10px] font-mono flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-paper border border-rule rounded-sm shadow-lg z-30">
          <div className="flex items-center justify-between px-3 py-2 border-b border-rule">
            <span className="font-mono text-xs uppercase tracking-wide text-ink-soft">
              Notifications
            </span>
          </div>

          {notifications.length === 0 ? (
            <p className="font-mono text-xs text-ink-soft text-center py-6">
              No notifications yet.
            </p>
          ) : (
            <ul>
              {notifications.map((n) => (
                <li key={n._id}>
                  <button
                    onClick={() => handleNotificationClick(n)}
                    className={`w-full text-left px-3 py-2.5 border-b border-rule/60 hover:bg-paper-dark transition-colors flex gap-2 ${
                      !n.read ? 'bg-ledger/5' : ''
                    }`}
                  >
                    <span className="flex-shrink-0 mt-0.5">{TYPE_ICON[n.type] || '•'}</span>
                    <span className="min-w-0">
                      <span className={`block text-sm ${!n.read ? 'text-ink font-medium' : 'text-ink-soft'}`}>
                        {n.message}
                      </span>
                      <span className="block font-mono text-[10px] text-ink-soft mt-0.5">
                        {timeAgo(n.createdAt)}
                      </span>
                    </span>
                    {!n.read && (
                      <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-stamp mt-1.5" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}