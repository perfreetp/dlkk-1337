import { useState, useCallback } from 'react';
import { useAppStore } from '../store/appStore';
import './ImportWindow.css';

export default function ImportWindow() {
  const { importProgress, setImportProgress, setCurrentView, currentProject } = useAppStore();
  const [isDragging, setIsDragging] = useState(false);
  const [importedFolders, setImportedFolders] = useState<string[]>([]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    const folderNames = files.map((f) => f.name);
    if (folderNames.length > 0) {
      simulateImport(folderNames);
    }
  }, []);

  const handleSelectFolder = async () => {
    if (window.electronAPI) {
      const paths = await window.electronAPI.selectDirectory();
      if (paths.length > 0) {
        simulateImport(paths);
      }
    } else {
      simulateImport(['示例数据文件夹1', '示例数据文件夹2']);
    }
  };

  const simulateImport = (paths: string[]) => {
    setImportedFolders((prev) => [...prev, ...paths]);
    setImportProgress({
      status: 'scanning',
      total: 100,
      current: 0,
      message: '正在扫描DICOM文件...',
      currentPath: paths[0],
    });

    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setImportProgress({
          status: 'done',
          total: 100,
          current: 100,
          message: '导入完成！发现 12 位患者，共 36 个序列',
          currentPath: '',
        });
        setTimeout(() => {
          if (currentProject) {
            setCurrentView('series');
          }
        }, 1000);
      } else {
        const statuses = ['scanning', 'parsing', 'grouping'] as const;
        const statusIndex = Math.floor(progress / 33);
        const messages = [
          '正在扫描DICOM文件...',
          '正在解析患者和检查信息...',
          '正在按研究编号分组...',
        ];
        setImportProgress({
          status: statuses[statusIndex] || 'scanning',
          total: 100,
          current: Math.floor(progress),
          message: messages[statusIndex] || '正在处理...',
          currentPath: paths[Math.floor(Math.random() * paths.length)],
        });
      }
    }, 300);
  };

  const statusText: Record<string, string> = {
    idle: '等待导入',
    scanning: '扫描中',
    parsing: '解析中',
    grouping: '分组中',
    done: '完成',
    error: '错误',
  };

  return (
    <div className="import-window">
      <div className="window-header">
        <h2>数据导入</h2>
        <div className="header-info">
          <span>支持拖拽文件夹或选择目录导入</span>
        </div>
      </div>

      <div
        className={`drop-zone ${isDragging ? 'dragging' : ''} ${
          importProgress.status === 'done' ? 'success' : ''
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleSelectFolder}
      >
        <div className="drop-zone-icon">
          {importProgress.status === 'done' ? '✅' : isDragging ? '📂' : '📥'}
        </div>
        <div className="drop-zone-title">
          {importProgress.status === 'done'
            ? '导入成功！'
            : isDragging
            ? '释放鼠标开始导入'
            : '拖拽文件夹到此处'}
        </div>
        <div className="drop-zone-subtitle">
          {importProgress.status === 'done'
            ? '点击查看导入结果'
            : '或者点击选择文件夹，支持 DICOM 格式影像数据'}
        </div>

        {importProgress.status !== 'idle' && importProgress.status !== 'done' && (
          <div className="import-progress">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${importProgress.current}%` }}
              />
            </div>
            <div className="progress-info">
              <span className="progress-status">{statusText[importProgress.status]}</span>
              <span className="progress-percent">{importProgress.current}%</span>
            </div>
            {importProgress.currentPath && (
              <div className="progress-path">当前: {importProgress.currentPath}</div>
            )}
            <div className="progress-message">{importProgress.message}</div>
          </div>
        )}
      </div>

      {importedFolders.length > 0 && (
        <div className="import-history">
          <h3>已导入文件夹</h3>
          <ul className="folder-list">
            {importedFolders.map((folder, index) => (
              <li key={index} className="folder-item">
                <span className="folder-icon">📁</span>
                <span className="folder-name">{folder}</span>
                <span className="folder-status success">已导入</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="import-tips">
        <h3>📋 导入说明</h3>
        <ul>
          <li>支持标准 DICOM 格式的医学影像文件</li>
          <li>系统自动识别患者信息、检查信息和序列信息</li>
          <li>可按研究编号自动分组，便于后续管理</li>
          <li>支持多层级文件夹结构，自动遍历子目录</li>
          <li>导入过程中请保持程序运行，避免数据丢失</li>
        </ul>
      </div>
    </div>
  );
}
