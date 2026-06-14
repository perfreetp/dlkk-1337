import { useState } from 'react';
import { useAppStore } from '../store/appStore';
import './ProjectWindow.css';

export default function ProjectWindow() {
  const { projects, createProject, loadProject, currentProject } = useAppStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');

  const handleCreateProject = () => {
    if (newProjectName.trim()) {
      createProject(newProjectName.trim(), newProjectDesc.trim());
      setShowCreateModal(false);
      setNewProjectName('');
      setNewProjectDesc('');
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  return (
    <div className="project-window">
      <div className="window-header">
        <h2>项目管理</h2>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          ➕ 新建项目
        </button>
      </div>

      <div className="project-grid">
        {projects.map((project) => (
          <div
            key={project.id}
            className={`project-card ${currentProject?.id === project.id ? 'active' : ''}`}
            onClick={() => loadProject(project.id)}
          >
            <div className="project-card-header">
              <div className="project-icon">📁</div>
              <div className="project-status">
                {currentProject?.id === project.id ? (
                  <span className="status-badge active-badge">当前项目</span>
                ) : null}
              </div>
            </div>
            <h3 className="project-name">{project.name}</h3>
            <p className="project-desc">
              {project.description || '暂无描述'}
            </p>
            <div className="project-meta">
              <span>病种标签: {project.diseaseTags.length}个</span>
              <span>创建时间: {formatDate(project.createdAt)}</span>
            </div>
            <div className="project-footer">
              <button
                className="btn btn-outline"
                onClick={(e) => {
                  e.stopPropagation();
                  loadProject(project.id);
                }}
              >
                打开项目
              </button>
            </div>
          </div>
        ))}
      </div>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>新建项目</h3>
              <button className="close-btn" onClick={() => setShowCreateModal(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>项目名称 *</label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="请输入项目名称"
                />
              </div>
              <div className="form-group">
                <label>项目描述</label>
                <textarea
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  placeholder="请输入项目描述（可选）"
                  rows={3}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                取消
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCreateProject}
                disabled={!newProjectName.trim()}
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
