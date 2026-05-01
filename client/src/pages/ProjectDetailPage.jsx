import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const STATUSES = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'];
const STATUS_LABELS = { TODO: 'To Do', IN_PROGRESS: 'In Progress', REVIEW: 'Review', DONE: 'Done' };
const STATUS_COLORS = { TODO: 'var(--status-todo)', IN_PROGRESS: 'var(--status-progress)', REVIEW: 'var(--status-review)', DONE: 'var(--status-done)' };

export default function ProjectDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null); // { type: 'task'|'project', id, name }
  const [editTask, setEditTask] = useState(null);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', priority: 'MEDIUM', assigneeId: '', dueDate: '' });
  const [memberEmail, setMemberEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  const load = async () => {
    try {
      const [pRes, tRes] = await Promise.all([api.getProject(id), api.getTasks(id)]);
      setProject(pRes.project);
      setTasks(tRes.tasks);
      const myMembership = pRes.project.members?.find(m => m.user.id === user?.id);
      setIsAdmin(myMembership?.role === 'ADMIN');
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const handleCreateTask = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const body = { ...taskForm, assigneeId: taskForm.assigneeId || null, dueDate: taskForm.dueDate || null };
      if (editTask) { await api.updateTask(editTask.id, body); }
      else { await api.createTask(id, body); }
      setShowTaskModal(false); setEditTask(null);
      setTaskForm({ title: '', description: '', priority: 'MEDIUM', assigneeId: '', dueDate: '' });
      load();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try { await api.updateTask(taskId, { status: newStatus }); load(); } catch (err) { console.error(err); }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await api.deleteTask(taskId);
      setShowDeleteConfirm(null);
      load();
    } catch (err) {
      alert(err.message);
      setShowDeleteConfirm(null);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try { await api.addMember(id, { email: memberEmail }); setShowMemberModal(false); setMemberEmail(''); load(); }
    catch (err) { setError(err.message); } finally { setSaving(false); }
  };

  const handleRemoveMember = async (memberId) => {
    try { await api.removeMember(id, memberId); load(); } catch (err) { alert(err.message); }
  };

  const handleRoleChange = async (memberId, role) => {
    try { await api.updateMember(id, memberId, { role }); load(); } catch (err) { alert(err.message); }
  };

  const openEditTask = (task) => {
    setEditTask(task);
    setTaskForm({ title: task.title, description: task.description || '', priority: task.priority, assigneeId: task.assigneeId || '', dueDate: task.dueDate ? task.dueDate.split('T')[0] : '' });
    setShowTaskModal(true); setError('');
  };

  const handleDeleteProject = async () => {
    try {
      await api.deleteProject(id);
      setShowDeleteConfirm(null);
      navigate('/projects');
    } catch (err) {
      alert(err.message);
      setShowDeleteConfirm(null);
    }
  };

  const confirmDelete = async () => {
    if (!showDeleteConfirm) return;
    if (showDeleteConfirm.type === 'task') {
      await handleDeleteTask(showDeleteConfirm.id);
    } else if (showDeleteConfirm.type === 'project') {
      await handleDeleteProject();
    }
  };

  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;
  if (!project) return <div className="empty-state"><h3>Project not found</h3></div>;

  const tasksByStatus = {};
  STATUSES.forEach(s => { tasksByStatus[s] = tasks.filter(t => t.status === s); });

  return (
    <div className="fade-in">
      {/* Project Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>{project.name}</h2>
          {project.description && <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: 4 }}>{project.description}</p>}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => { setShowMemberModal(true); setError(''); }}>👥 Members ({project._count.members})</button>
          <button className="btn btn-primary btn-sm" onClick={() => { setShowTaskModal(true); setEditTask(null); setTaskForm({ title: '', description: '', priority: 'MEDIUM', assigneeId: '', dueDate: '' }); setError(''); }}>+ Add Task</button>
          {isAdmin && (
            <button
              className="btn btn-danger btn-sm"
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteConfirm({ type: 'project', id: id, name: project.name });
              }}
            >
              🗑️ Delete Project
            </button>
          )}
        </div>
      </div>

      {/* Task Board */}
      <div className="task-board">
        {STATUSES.map(status => (
          <div key={status} className="task-column">
            <div className="task-column-header">
              <span className="task-column-title" style={{ color: STATUS_COLORS[status] }}>{STATUS_LABELS[status]}</span>
              <span className="task-column-count">{tasksByStatus[status].length}</span>
            </div>
            <div className="task-list">
              {tasksByStatus[status].map(task => (
                <div key={task.id} className="task-card" onClick={() => openEditTask(task)}>
                  <div className="task-card-title">{task.title}</div>
                  <div className="task-card-meta">
                    <span className={`badge badge-${task.priority.toLowerCase()}`}>{task.priority}</span>
                    {task.dueDate && (
                      <span style={{ fontSize: '0.75rem', color: new Date(task.dueDate) < new Date() && task.status !== 'DONE' ? 'var(--danger)' : 'var(--text-muted)' }}>
                        📅 {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  {task.assignee && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                      <div className="avatar avatar-sm">{task.assignee.name.charAt(0)}</div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{task.assignee.name}</span>
                    </div>
                  )}
                  {/* Quick status change + delete buttons */}
                  <div style={{ display: 'flex', gap: 4, marginTop: 10, flexWrap: 'wrap' }} onClick={e => e.stopPropagation()}>
                    {STATUSES.filter(s => s !== task.status).map(s => (
                      <button key={s} className="btn btn-ghost btn-sm" style={{ fontSize: '0.65rem', padding: '2px 6px', color: STATUS_COLORS[s] }} onClick={(e) => { e.stopPropagation(); handleStatusChange(task.id, s); }}>→ {STATUS_LABELS[s]}</button>
                    ))}
                    {isAdmin && (
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ fontSize: '0.65rem', padding: '2px 6px', color: 'var(--danger)' }}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowDeleteConfirm({ type: 'task', id: task.id, name: task.title });
                        }}
                      >
                        🗑️ Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {tasksByStatus[status].length === 0 && (
                <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontSize: '0.8rem' }}>No tasks</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h2 style={{ color: 'var(--danger)' }}>⚠️ Confirm Delete</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowDeleteConfirm(null)}>✕</button>
            </div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>
              Are you sure you want to delete {showDeleteConfirm.type === 'project' ? 'this project' : 'this task'}?
            </p>
            <p style={{ fontWeight: 600, marginBottom: 16 }}>
              "{showDeleteConfirm.name}"
            </p>
            {showDeleteConfirm.type === 'project' && (
              <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: 16 }}>
                This will permanently delete the project and all its tasks. This cannot be undone.
              </p>
            )}
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={confirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Task Modal */}
      {showTaskModal && (
        <div className="modal-overlay" onClick={() => setShowTaskModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editTask ? 'Edit Task' : 'New Task'}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowTaskModal(false)}>✕</button>
            </div>
            {error && <div className="error-msg" style={{ marginBottom: 16 }}>{error}</div>}
            <form onSubmit={handleCreateTask}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group">
                  <label>Title</label>
                  <input className="input" placeholder="Task title" value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea className="textarea" placeholder="Describe the task..." value={taskForm.description} onChange={e => setTaskForm({ ...taskForm, description: e.target.value })} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Priority</label>
                    <select className="select" value={taskForm.priority} onChange={e => setTaskForm({ ...taskForm, priority: e.target.value })}>
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Due Date</label>
                    <input className="input" type="date" value={taskForm.dueDate} onChange={e => setTaskForm({ ...taskForm, dueDate: e.target.value })} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Assignee</label>
                  <select className="select" value={taskForm.assigneeId} onChange={e => setTaskForm({ ...taskForm, assigneeId: e.target.value })}>
                    <option value="">Unassigned</option>
                    {project.members?.map(m => <option key={m.user.id} value={m.user.id}>{m.user.name} ({m.user.email})</option>)}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowTaskModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : (editTask ? 'Update Task' : 'Create Task')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Members Modal */}
      {showMemberModal && (
        <div className="modal-overlay" onClick={() => setShowMemberModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Team Members</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowMemberModal(false)}>✕</button>
            </div>
            {error && <div className="error-msg" style={{ marginBottom: 16 }}>{error}</div>}
            {isAdmin && (
              <form onSubmit={handleAddMember} style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                <input className="input" type="email" placeholder="Add member by email" value={memberEmail} onChange={e => setMemberEmail(e.target.value)} required />
                <button className="btn btn-primary btn-sm" type="submit" disabled={saving}>{saving ? '...' : 'Add'}</button>
              </form>
            )}
            <div className="members-list">
              {project.members?.map(m => (
                <div key={m.id} className="member-item">
                  <div className="member-info">
                    <div className="avatar">{m.user.name.charAt(0)}</div>
                    <div>
                      <div className="member-name">{m.user.name}</div>
                      <div className="member-email">{m.user.email}</div>
                    </div>
                  </div>
                  <div className="member-actions">
                    {isAdmin && m.user.id !== user?.id ? (
                      <>
                        <select className="select" style={{ width: 'auto', padding: '4px 8px', fontSize: '0.75rem' }} value={m.role} onChange={e => handleRoleChange(m.id, e.target.value)}>
                          <option value="ADMIN">Admin</option>
                          <option value="MEMBER">Member</option>
                        </select>
                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleRemoveMember(m.id)}>✕</button>
                      </>
                    ) : (
                      <span className={`badge badge-${m.role.toLowerCase()}`}>{m.role}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
