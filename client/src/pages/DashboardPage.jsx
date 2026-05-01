import { useState, useEffect } from 'react';
import { api } from '../lib/api';

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getDashboard().then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;
  if (!data) return <div className="empty-state"><h3>Unable to load dashboard</h3></div>;

  const { stats, overdueTasks, recentTasks } = data;

  return (
    <div className="fade-in">
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Tasks</div>
          <div className="stat-value">{stats.totalTasks}</div>
          <div className="stat-sub">Across {stats.projectCount} projects</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">My Tasks</div>
          <div className="stat-value">{stats.myTasks}</div>
          <div className="stat-sub">Assigned to you</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">In Progress</div>
          <div className="stat-value">{stats.byStatus.IN_PROGRESS}</div>
          <div className="stat-sub">{stats.byStatus.REVIEW} in review</div>
        </div>
        <div className="stat-card">
          <div className="stat-label" style={{ color: stats.overdue > 0 ? 'var(--danger)' : undefined }}>Overdue</div>
          <div className="stat-value" style={stats.overdue > 0 ? { background: 'linear-gradient(135deg, #ef4444, #f59e0b)', WebkitBackgroundClip: 'text' } : {}}>{stats.overdue}</div>
          <div className="stat-sub">Need attention</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Status Breakdown */}
        <div className="card">
          <h3 style={{ marginBottom: 20, fontSize: '1rem', fontWeight: 700 }}>Task Status</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: 'To Do', key: 'TODO', color: 'var(--status-todo)' },
              { label: 'In Progress', key: 'IN_PROGRESS', color: 'var(--status-progress)' },
              { label: 'In Review', key: 'REVIEW', color: 'var(--status-review)' },
              { label: 'Done', key: 'DONE', color: 'var(--status-done)' },
            ].map(s => {
              const pct = stats.totalTasks > 0 ? (stats.byStatus[s.key] / stats.totalTasks) * 100 : 0;
              return (
                <div key={s.key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 4 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
                    <span style={{ fontWeight: 600 }}>{stats.byStatus[s.key]}</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--bg-input)', borderRadius: 50, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: s.color, borderRadius: 50, transition: 'width 0.6s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Priority Breakdown */}
        <div className="card">
          <h3 style={{ marginBottom: 20, fontSize: '1rem', fontWeight: 700 }}>Priority Distribution</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: 'Urgent', key: 'URGENT', color: 'var(--priority-urgent)' },
              { label: 'High', key: 'HIGH', color: 'var(--priority-high)' },
              { label: 'Medium', key: 'MEDIUM', color: 'var(--priority-medium)' },
              { label: 'Low', key: 'LOW', color: 'var(--priority-low)' },
            ].map(p => {
              const pct = stats.totalTasks > 0 ? (stats.byPriority[p.key] / stats.totalTasks) * 100 : 0;
              return (
                <div key={p.key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 4 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{p.label}</span>
                    <span style={{ fontWeight: 600 }}>{stats.byPriority[p.key]}</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--bg-input)', borderRadius: 50, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: p.color, borderRadius: 50, transition: 'width 0.6s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Overdue Tasks */}
      {overdueTasks.length > 0 && (
        <div className="card" style={{ marginTop: 24 }}>
          <h3 style={{ marginBottom: 16, fontSize: '1rem', fontWeight: 700, color: 'var(--danger)' }}>⚠️ Overdue Tasks</h3>
          <div className="table-container">
            <table>
              <thead><tr><th>Task</th><th>Project</th><th>Due Date</th><th>Assignee</th></tr></thead>
              <tbody>
                {overdueTasks.map(t => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 600 }}>{t.title}</td>
                    <td>{t.project?.name}</td>
                    <td style={{ color: 'var(--danger)' }}>{new Date(t.dueDate).toLocaleDateString()}</td>
                    <td>{t.assignee?.name || 'Unassigned'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="card" style={{ marginTop: 24 }}>
        <h3 style={{ marginBottom: 16, fontSize: '1rem', fontWeight: 700 }}>Recent Tasks</h3>
        {recentTasks.length === 0 ? (
          <div className="empty-state" style={{ padding: 30 }}>
            <p>No tasks yet. Create a project and add some tasks!</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead><tr><th>Task</th><th>Project</th><th>Status</th><th>Assignee</th><th>Updated</th></tr></thead>
              <tbody>
                {recentTasks.map(t => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 600 }}>{t.title}</td>
                    <td>{t.project?.name}</td>
                    <td><span className={`badge badge-${t.status.toLowerCase()}`}>{t.status.replace('_', ' ')}</span></td>
                    <td>{t.assignee?.name || <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{new Date(t.updatedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
