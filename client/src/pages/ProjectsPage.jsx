import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const load = () => api.getProjects().then(d => setProjects(d.projects)).catch(console.error).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await api.createProject(form);
      setShowModal(false); setForm({ name: '', description: '' });
      load();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>Your Projects</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Project</button>
      </div>

      {projects.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📁</div>
          <h3>No projects yet</h3>
          <p>Create your first project to get started</p>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>Create Project</button>
        </div>
      ) : (
        <div className="project-grid">
          {projects.map(p => (
            <div key={p.id} className="card card-clickable project-card" onClick={() => navigate(`/projects/${p.id}`)}>
              <div className="project-card-header">
                <div className="project-card-name">{p.name}</div>
                <span className="badge badge-admin" style={{ fontSize: '0.65rem' }}>{p._count.members} members</span>
              </div>
              <div className="project-card-desc">{p.description || 'No description'}</div>
              <div className="project-card-footer">
                <div className="project-card-stats">
                  <span>📋 {p._count.tasks} tasks</span>
                  <span>👤 by {p.creator?.name}</span>
                </div>
                <div className="avatar-stack">
                  {p.members?.slice(0, 3).map(m => (
                    <div key={m.id} className="avatar avatar-sm" title={m.user.name}>
                      {m.user.name.charAt(0).toUpperCase()}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New Project</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            {error && <div className="error-msg" style={{ marginBottom: 16 }}>{error}</div>}
            <form onSubmit={handleCreate}>
              <div className="auth-form">
                <div className="form-group">
                  <label>Project Name</label>
                  <input className="input" placeholder="e.g. Website Redesign" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Description (optional)</label>
                  <textarea className="textarea" placeholder="Describe your project..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creating...' : 'Create Project'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
