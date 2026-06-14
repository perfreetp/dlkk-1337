import { useState, useMemo } from 'react';
import { useAppStore } from '../store/appStore';
import type { Series, EnrollmentStatus } from '../../shared/types';
import './TagEditor.css';

export default function TagEditor() {
  const {
    getAllSeries,
    selectedSeriesIds,
    selectedPatientId,
    batchUpdateSeries,
    updateSeries,
    currentProject,
  } = useAppStore();

  const [selectedTagTarget, setSelectedTagTarget] = useState<string>('selected');
  const [newDiseaseTag, setNewDiseaseTag] = useState('');
  const [bulkStatus, setBulkStatus] = useState<EnrollmentStatus>('pending');
  const [bulkResearchNumber, setBulkResearchNumber] = useState('');
  const [activeTab, setActiveTab] = useState<'single' | 'batch'>('single');
  const [editingSeriesId, setEditingSeriesId] = useState<string | null>(null);

  const allSeries = useMemo(() => getAllSeries(), [getAllSeries]);

  const targetSeries = useMemo(() => {
    if (selectedTagTarget === 'selected') {
      return allSeries.filter((s) => selectedSeriesIds.includes(s.id));
    } else if (selectedTagTarget === 'currentPatient' && selectedPatientId) {
      return allSeries.filter((s) => s.patientId === selectedPatientId);
    }
    return allSeries;
  }, [selectedTagTarget, selectedSeriesIds, selectedPatientId, allSeries]);

  const handleBulkStatusChange = () => {
    const ids = targetSeries.filter((s) => !s.isLocked).map((s) => s.id);
    batchUpdateSeries(ids, { enrollmentStatus: bulkStatus });
  };

  const handleBulkAddTag = () => {
    if (!newDiseaseTag.trim()) return;
    const ids = targetSeries.filter((s) => !s.isLocked).map((s) => s.id);
    ids.forEach((id) => {
      const series = allSeries.find((s) => s.id === id);
      if (series && !series.diseaseTags.includes(newDiseaseTag.trim())) {
        updateSeries(id, { diseaseTags: [...series.diseaseTags, newDiseaseTag.trim()] });
      }
    });
    setNewDiseaseTag('');
  };

  const handleBulkRemoveTag = (tag: string) => {
    const ids = targetSeries.filter((s) => !s.isLocked).map((s) => s.id);
    ids.forEach((id) => {
      const series = allSeries.find((s) => s.id === id);
      if (series) {
        updateSeries(id, { diseaseTags: series.diseaseTags.filter((t) => t !== tag) });
      }
    });
  };

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      pending: '#94a3b8',
      included: '#10b981',
      excluded: '#ef4444',
      review: '#f59e0b',
    };
    return colors[status] || '#94a3b8';
  };

  const getStatusText = (status: string): string => {
    const texts: Record<string, string> = {
      pending: '待处理',
      included: '已入组',
      excluded: '已排除',
      review: '待复核',
    };
    return texts[status] || status;
  };

  const stats = useMemo(() => {
    const statusCount: Record<string, number> = {
      pending: 0,
      included: 0,
      excluded: 0,
      review: 0,
    };
    allSeries.forEach((s) => {
      statusCount[s.enrollmentStatus] = (statusCount[s.enrollmentStatus] || 0) + 1;
    });

    const tagCount: Record<string, number> = {};
    allSeries.forEach((s) => {
      s.diseaseTags.forEach((t) => {
        tagCount[t] = (tagCount[t] || 0) + 1;
      });
    });

    return { statusCount, tagCount };
  }, [allSeries]);

  const SeriesTagRow = ({ series }: { series: Series }) => {
    const isEditing = editingSeriesId === series.id;
    const [localNotes, setLocalNotes] = useState(series.notes);
    const [localTagInput, setLocalTagInput] = useState('');

    const handleSave = () => {
      if (!series.isLocked) {
        updateSeries(series.id, { notes: localNotes });
      }
      setEditingSeriesId(null);
    };

    const handleAddTag = () => {
      if (localTagInput.trim() && !series.isLocked) {
        const tags = [...series.diseaseTags, localTagInput.trim()];
        updateSeries(series.id, { diseaseTags: tags });
        setLocalTagInput('');
      }
    };

    const handleRemoveTag = (tag: string) => {
      if (!series.isLocked) {
        updateSeries(series.id, {
          diseaseTags: series.diseaseTags.filter((t) => t !== tag),
        });
      }
    };

    return (
      <div className={`tag-row ${series.isLocked ? 'locked' : ''}`}>
        <div className="tag-row-header">
          <div className="series-basic">
            <span className="series-name">{series.seriesDescription}</span>
            <span className="series-patient">{series.patientId}</span>
          </div>
          <div
            className="status-badge"
            style={{ backgroundColor: getStatusColor(series.enrollmentStatus) }}
          >
            {getStatusText(series.enrollmentStatus)}
          </div>
          {series.isLocked && <span className="lock-indicator">🔒</span>}
        </div>

        <div className="tag-row-content">
          <div className="field-group">
            <label>入组状态</label>
            <select
              value={series.enrollmentStatus}
              onChange={(e) => {
                if (!series.isLocked) {
                  updateSeries(series.id, { enrollmentStatus: e.target.value as EnrollmentStatus });
                }
              }}
              disabled={series.isLocked}
              className="form-select"
            >
              <option value="pending">待处理</option>
              <option value="included">已入组</option>
              <option value="excluded">已排除</option>
              <option value="review">待复核</option>
            </select>
          </div>

          <div className="field-group">
            <label>病种标签</label>
            <div className="tag-input-group">
              <div className="tag-list">
                {series.diseaseTags.map((tag) => (
                  <span key={tag} className="tag removable">
                    {tag}
                    {!series.isLocked && (
                      <button className="tag-remove" onClick={() => handleRemoveTag(tag)}>
                        ×
                      </button>
                    )}
                  </span>
                ))}
              </div>
              {!series.isLocked && (
                <div className="tag-add">
                  <input
                    type="text"
                    value={localTagInput}
                    onChange={(e) => setLocalTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                    placeholder="添加标签..."
                    className="tag-input"
                  />
                  <button className="btn btn-sm" onClick={handleAddTag}>
                    添加
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="field-group">
            <label>备注</label>
            {isEditing ? (
              <div className="notes-editor">
                <textarea
                  value={localNotes}
                  onChange={(e) => setLocalNotes(e.target.value)}
                  rows={2}
                  disabled={series.isLocked}
                />
                <div className="notes-actions">
                  <button className="btn btn-sm btn-primary" onClick={handleSave}>
                    保存
                  </button>
                  <button className="btn btn-sm" onClick={() => setEditingSeriesId(null)}>
                    取消
                  </button>
                </div>
              </div>
            ) : (
              <div className="notes-display" onClick={() => !series.isLocked && setEditingSeriesId(series.id)}>
                {series.notes || <span className="text-muted">点击添加备注</span>}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="tag-editor">
      <div className="window-header">
        <h2>标签编辑</h2>
        <div className="editor-tabs">
          <button
            className={activeTab === 'single' ? 'active' : ''}
            onClick={() => setActiveTab('single')}
          >
            单条编辑
          </button>
          <button
            className={activeTab === 'batch' ? 'active' : ''}
            onClick={() => setActiveTab('batch')}
          >
            批量修改
          </button>
        </div>
      </div>

      <div className="editor-body">
        <div className="editor-stats">
          <div className="stat-card">
            <div className="stat-label">总序列数</div>
            <div className="stat-value">{allSeries.length}</div>
          </div>
          <div className="stat-card success">
            <div className="stat-label">已入组</div>
            <div className="stat-value">{stats.statusCount.included}</div>
          </div>
          <div className="stat-card warning">
            <div className="stat-label">待复核</div>
            <div className="stat-value">{stats.statusCount.review}</div>
          </div>
          <div className="stat-card danger">
            <div className="stat-label">已排除</div>
            <div className="stat-value">{stats.statusCount.excluded}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">待处理</div>
            <div className="stat-value">{stats.statusCount.pending}</div>
          </div>
        </div>

        {activeTab === 'batch' ? (
          <div className="batch-panel">
            <div className="batch-target">
              <h3>操作范围</h3>
              <div className="radio-group">
                <label>
                  <input
                    type="radio"
                    value="selected"
                    checked={selectedTagTarget === 'selected'}
                    onChange={(e) => setSelectedTagTarget(e.target.value)}
                  />
                  已选中序列 ({selectedSeriesIds.length} 个)
                </label>
                <label>
                  <input
                    type="radio"
                    value="currentPatient"
                    checked={selectedTagTarget === 'currentPatient'}
                    onChange={(e) => setSelectedTagTarget(e.target.value)}
                    disabled={!selectedPatientId}
                  />
                  当前患者
                </label>
                <label>
                  <input
                    type="radio"
                    value="all"
                    checked={selectedTagTarget === 'all'}
                    onChange={(e) => setSelectedTagTarget(e.target.value)}
                  />
                  全部序列 ({allSeries.length} 个)
                </label>
              </div>
              <p className="target-count">
                将对 <strong>{targetSeries.length}</strong> 个序列执行操作
                （已锁定 {targetSeries.filter((s) => s.isLocked).length} 个，将被跳过）
              </p>
            </div>

            <div className="batch-actions">
              <div className="batch-section">
                <h3>批量设置入组状态</h3>
                <div className="batch-form">
                  <select
                    value={bulkStatus}
                    onChange={(e) => setBulkStatus(e.target.value as EnrollmentStatus)}
                    className="form-select"
                  >
                    <option value="pending">待处理</option>
                    <option value="included">已入组</option>
                    <option value="excluded">已排除</option>
                    <option value="review">待复核</option>
                  </select>
                  <button className="btn btn-primary" onClick={handleBulkStatusChange}>
                    应用状态
                  </button>
                </div>
              </div>

              <div className="batch-section">
                <h3>批量添加病种标签</h3>
                <div className="batch-form">
                  <input
                    type="text"
                    value={newDiseaseTag}
                    onChange={(e) => setNewDiseaseTag(e.target.value)}
                    placeholder="输入标签名称"
                    className="form-input"
                  />
                  <button className="btn btn-primary" onClick={handleBulkAddTag}>
                    添加标签
                  </button>
                </div>
                {currentProject?.diseaseTags && currentProject.diseaseTags.length > 0 && (
                  <div className="quick-tags">
                    <span className="quick-tags-label">快捷标签：</span>
                    {currentProject.diseaseTags.map((tag) => (
                      <button
                        key={tag}
                        className="quick-tag-btn"
                        onClick={() => {
                          setNewDiseaseTag(tag);
                        }}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="batch-section">
                <h3>当前标签统计</h3>
                <div className="tag-stats">
                  {Object.entries(stats.tagCount).length > 0 ? (
                    Object.entries(stats.tagCount).map(([tag, count]) => (
                      <div key={tag} className="tag-stat-item">
                        <span className="tag">{tag}</span>
                        <span className="tag-count">{count} 个序列</span>
                        <button
                          className="btn btn-xs btn-danger"
                          onClick={() => handleBulkRemoveTag(tag)}
                        >
                          批量移除
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted">暂无标签数据</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="single-panel">
            <div className="series-tag-list">
              {allSeries.slice(0, 20).map((series) => (
                <SeriesTagRow key={series.id} series={series} />
              ))}
              {allSeries.length > 20 && (
                <div className="load-more">
                  显示前 20 条，共 {allSeries.length} 条...
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
