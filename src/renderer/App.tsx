import { useState } from 'react';
import { useAppStore } from './store/appStore';
import Sidebar from './components/Sidebar';
import ProjectWindow from './components/ProjectWindow';
import ImportWindow from './components/ImportWindow';
import Dashboard from './components/Dashboard';
import SeriesBrowser from './components/SeriesBrowser';
import TagEditor from './components/TagEditor';
import RuleChecker from './components/RuleChecker';
import SamplingReview from './components/SamplingReview';
import ExportCenter from './components/ExportCenter';
import './styles/App.css';

export default function App() {
  const { currentView, currentProject, isDataDirty, saveProject, closeProject } = useAppStore();

  const renderContent = () => {
    if (!currentProject && currentView !== 'project' && currentView !== 'import') {
      return (
        <div className="empty-state">
          <div className="empty-icon">📁</div>
          <h2>请先选择或创建项目</h2>
          <p>在项目窗口中创建新项目或打开已有项目开始质检工作</p>
        </div>
      );
    }

    switch (currentView) {
      case 'project':
        return <ProjectWindow />;
      case 'import':
        return <ImportWindow />;
      case 'dashboard':
        return <Dashboard />;
      case 'series':
        return <SeriesBrowser />;
      case 'tags':
        return <TagEditor />;
      case 'rules':
        return <RuleChecker />;
      case 'review':
        return <SamplingReview />;
      case 'export':
        return <ExportCenter />;
      default:
        return <ProjectWindow />;
    }
  };

  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        <header className="app-header">
          <div className="header-title">
            <h1>DICOM 标注质检客户端</h1>
            {currentProject && (
              <span className="project-badge">
                当前项目: {currentProject.name}
                {isDataDirty && <span className="dirty-dot" title="有未保存的修改">●</span>}
              </span>
            )}
          </div>
          <div className="header-actions">
            {currentProject && (
              <>
                <button className="btn btn-sm" onClick={saveProject}>
                  💾 保存
                </button>
                <button className="btn btn-sm" onClick={closeProject}>
                  关闭项目
                </button>
              </>
            )}
            <span className="version-badge">v1.0.0</span>
          </div>
        </header>
        <div className="content-area">{renderContent()}</div>
      </main>
    </div>
  );
}
