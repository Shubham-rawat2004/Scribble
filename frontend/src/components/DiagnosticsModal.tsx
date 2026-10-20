import React from 'react';
import {
  Activity,
  Database,
  Radio,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  X,
  Server,
} from 'lucide-react';

interface HealthData {
  status: string;
  timestamp: string;
  service: string;
  database: string;
}

interface LogItem {
  id: string;
  time: string;
  message: string;
  type: 'info' | 'success' | 'warn';
}

interface DiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  healthData: HealthData | null;
  socketConnected: boolean;
  socketId: string;
  latency: number | null;
  logs: LogItem[];
  apiLoading: boolean;
  onTestLatency: () => void;
  onRefreshHealth: () => void;
}

export const DiagnosticsModal: React.FC<DiagnosticsModalProps> = ({
  isOpen,
  onClose,
  healthData,
  socketConnected,
  socketId,
  latency,
  logs,
  apiLoading,
  onTestLatency,
  onRefreshHealth,
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(5px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '780px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #cbd5e1',
          padding: '1.75rem',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ background: '#eff6ff', padding: '0.5rem', borderRadius: '10px', color: '#2563eb' }}>
              <Server size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Architecture & System Diagnostics
              </h2>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                Full-Stack Technical Interview Telemetry & Live Infrastructure Status
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn btn-outline"
            style={{ padding: '0.4rem', borderRadius: '50%', width: '36px', height: '36px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* 4 Health Status Boxes */}
        <div className="status-grid" style={{ marginBottom: '1.25rem' }}>
          {/* 1. REST Backend */}
          <div className="status-box">
            <div className="status-info">
              <span className="status-label">Express REST API</span>
              <span className="status-value">{healthData ? 'Port 5000 Online' : 'Checking /api/health...'}</span>
            </div>
            {healthData ? (
              <span className="badge badge-success">
                <CheckCircle2 size={14} /> OK
              </span>
            ) : (
              <span className="badge badge-danger">
                <XCircle size={14} /> Offline
              </span>
            )}
          </div>

          {/* 2. Socket.IO WebSocket */}
          <div className="status-box">
            <div className="status-info">
              <span className="status-label">Socket.IO Real-Time</span>
              <span className="status-value" style={{ fontSize: '0.85rem', fontFamily: 'monospace' }}>
                {socketConnected ? socketId : 'Disconnected'}
              </span>
            </div>
            {socketConnected ? (
              <span className="badge badge-success">
                <Radio size={14} /> Connected
              </span>
            ) : (
              <span className="badge badge-danger">
                <XCircle size={14} /> Offline
              </span>
            )}
          </div>

          {/* 3. Docker MySQL */}
          <div className="status-box">
            <div className="status-info">
              <span className="status-label">Docker MySQL 8.0</span>
              <span className="status-value">
                {healthData?.database === 'connected' ? 'Port 3307 Ready' : 'Database Offline'}
              </span>
            </div>
            {healthData?.database === 'connected' ? (
              <span className="badge badge-success">
                <Database size={14} /> Ready
              </span>
            ) : (
              <span className="badge badge-warning">
                <XCircle size={14} /> Disconnected
              </span>
            )}
          </div>

          {/* 4. WebSocket Latency */}
          <div className="status-box">
            <div className="status-info">
              <span className="status-label">Roundtrip Latency</span>
              <span className="status-value">{latency !== null ? `${latency} ms` : 'Not tested'}</span>
            </div>
            <span className="badge badge-success">
              <Clock size={14} /> Real-Time
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="button-group" style={{ marginBottom: '1.25rem' }}>
          <button className="btn btn-primary" onClick={onTestLatency} disabled={!socketConnected}>
            <Radio size={16} /> Test Socket Ping
          </button>
          <button className="btn btn-outline" onClick={onRefreshHealth} disabled={apiLoading}>
            <RefreshCw size={16} className={apiLoading ? 'animate-spin' : ''} /> Refresh Health
          </button>
        </div>

        {/* Live Event Feed */}
        <div style={{ marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#334155', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Activity size={16} color="#0284c7" />
            Live WebSocket & Event Feed
          </h3>
          <div className="log-box" style={{ maxHeight: '160px' }}>
            {logs.length === 0 ? (
              <div className="log-entry">
                <span className="log-time">[Startup]</span>
                <span>Waiting for server events...</span>
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="log-entry">
                  <span className="log-time">[{log.time}]</span>
                  <span style={{ color: log.type === 'success' ? '#4ade80' : log.type === 'warn' ? '#f87171' : '#38bdf8' }}>
                    {log.message}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Architecture Capabilities Card */}
        <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Sparkles size={16} color="#2563eb" />
            Active Architecture Highlights
          </h4>
          <p style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.5, margin: 0 }}>
            • <b>Containerized Storage:</b> MySQL 8.0 on host port 3307 with persistent volumes & 6 relational tables.<br />
            • <b>Real-Time Event Gateway:</b> Socket.IO room isolation, heartbeat pings, and disconnect handling.<br />
            • <b>Room State Management:</b> In-memory OOP <code>Room</code> & <code>Player</code> with write-through MySQL persistence.
          </p>
        </div>
      </div>
    </div>
  );
};
