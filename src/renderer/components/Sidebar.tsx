import { useAppStore } from '../store/appStore';
import './Sidebar.css';

const menuItems = [
  { id: 'project', icon: '📋', label: '项目窗口', key: 'project' },
  { id: 'import', icon: '📥', label: '导入窗口', key: 'import' },
  { id: 'dashboard', icon: '📊', label: '处理进度', key: 'dashboard' },
  { id: 'collaboration', icon: '👥', label: '项目协作', key: 'collaboration' },
  { id: 'series', icon: '🖼️', label: '序列浏览', key: 'series' },
  { id: 'tags', icon: '🏷️', label: '标签编辑', key: 'tags' },
  { id: 'rules', icon: '✅', label: '规则检查', key: 'rules' },
  { id: 'review', icon: '🔍', label: '抽样复核', key: 'review' },
  { id: 'export', icon: '📤', label: '导出中心', key: 'export' },
];

export default function Sidebar() {
  const { currentView, setCurrentView, currentProject, patients, getAllSeries } = useAppStore();

  const disabledItems = !currentProject
    ? ['dashboard', 'collaboration', 'series', 'tags', 'rules', 'review', 'export']
    : [];

  const totalSeries = currentProject ? getAllSeries().length : 0;

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span className="logo-icon">🩺</span>
        <span className="logo-text">DICOM QC</span>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const isActive = currentView === item.id;
          const isDisabled = disabledItems.includes(item.id);
          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`}
              onClick={() => !isDisabled && setCurrentView(item.id)}
              disabled={isDisabled}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-stats">
          {currentProject && (
            <>
              <div className="stat-item">
                <span className="stat-label">患者数</span>
                <span className="stat-value">{patients.length}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">序列数</span>
                <span className="stat-value">{totalSeries}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
