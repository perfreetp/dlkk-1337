import { useState, useMemo } from 'react';
import { useAppStore } from '../store/appStore';
import type { Series, CollaborationStatus } from '../../shared/types';
import './Collaboration.css';

const ASSIGNEES = ['张医生', '李医生', '王医生', '未分配'];

const COLLAB_STATUS_OPTIONS: { value: CollaborationStatus | 'all'; label: string; color: string }[] = [
  { value: 'all', label: '全部状态', color: '#94a3b8' },
  { value: 'unassigned', label: '未分配', color: '#64748b' },
  { value: 'in_progress', label: '处理中', color: '#2563eb' },
  { value: 'needs_review', label: '待复核', color: '#d97706' },
  { value: 'done', label: '已完成', color: '#059669' },
];

export default function Collaboration() {
  const {
    getAllSeries,
    patients,
    selectedPatientId,
    selectedResearchNumber,
    clearSelectedPatient,
    clearSelectedResearchNumber,
    updateCollaboration,
    batchUpdateCollaboration,
    selectedSeriesIds,
    clearSelection,
    toggleSelectSeries,
    navigateToSeries,
    setCurrentView,
  } = useAppStore();

  const [statusFilter, setStatusFilter] = useState<CollaborationStatus | 'all'>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [bulkAssignee, setBulkAssignee] = useState('张医生');
  const [bulkStatus, setBulkStatus] = useState<CollaborationStatus>('in_progress');

  const allSeries = useMemo(() => getAllSeries(), [getAllSeries]);

  const filteredSeries = useMemo(() => {
    return allSeries.filter((s) => {
      if (selectedResearchNumber) {
        const patient = patients.find((p) => p.id === s.patientId);
        if (patient?.researchNumber !== selectedResearchNumber) return false;
      }
      if (selectedPatientId && s.patientId !== selectedPatientId) return false;
      if (statusFilter !== 'all' && s.collaboration?.status !== statusFilter) return false;
      if (assigneeFilter !== 'all') {
        if (assigneeFilter === '未分配' && s.collaboration?.assignee) return false;
        if (assigneeFilter !== '未分配' && s.collaboration?.assignee !== assigneeFilter) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const patient = patients.find((p) => p.id === s.patientId);
        return (
          patient?.patientName.toLowerCase().includes(q) ||
          s.seriesDescription?.toLowerCase().includes(q) ||
          s.collaboration?.assignee?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allSeries, selectedPatientId, selectedResearchNumber, statusFilter, assigneeFilter, searchQuery, patients]);

  const stats = useMemo(() => {
    const counts: Record<CollaborationStatus, number> = {
      unassigned: 0, in_progress: 0, needs_review: 0, done: 0,
    };
    const byAssignee: Record<string, number> = {};
    allSeries.forEach((s) => {
      const status = s.collaboration?.status || 'unassigned';
      counts[status]++;
      const assignee = s.collaboration?.assignee || '未分配';
      byAssignee[assignee] = (byAssignee[assignee] || 0) + 1;
    });
    return { counts, byAssignee, total: allSeries.length };
  }, [allSeries]);

  const getPatient = (id: string) => patients.find((p) => p.id === id);

  const formatTime = (iso?: string) => {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch { return ''; }
  };

  const handleBulkAssign = () => {
    if (selectedSeriesIds.length === 0) return;
    batchUpdateCollaboration(selectedSeriesIds, {
      assignee: bulkAssignee === '未分配' ? undefined : bulkAssignee,
      status: bulkStatus,
    });
  };

  const handleSelectAllFiltered = () => {
    filteredSeries.forEach((s) => {
      if (!selectedSeriesIds.includes(s.id)) toggleSelectSeries(s.id);
    });
  };

  return (
    <div className="collaboration">
      <div className="window-header">
        <h2>项目协作</h2>
        <div className="collab-header-actions">
          {selectedSeriesIds.length > 0 && (
            <span className="selection-hint">已选择 {selectedSeriesIds.length} 条</span>
          )}
        </div>
      </div>

      <div className="collab-overview">
        {COLLAB_STATUS_OPTIONS.filter((o) => o.value !== 'all').map((opt) => (
          <div key={opt.value} className={`collab-stat-card cs-${opt.value}`}>
            <div className="stat-dot" style={{ background: opt.color }} />
            <div className="stat-info">
              <div className="stat-value">{stats.counts[opt.value as CollaborationStatus]}</div>
              <div className="stat-label">{opt.label}</div>
            </div>
          </div>
        ))}
        <div className="collab-stat-card total">
          <div className="stat-dot" />
          <div className="stat-info">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">总计</div>
          </div>
        </div>
      </div>

      <div className="collab-toolbar">
        {(selectedResearchNumber || selectedPatientId) && (
          <div className="filter-banner collab-filter-banner">
            <span>
              正在筛选:
              {selectedResearchNumber && <strong> 🔬 研究编号 {selectedResearchNumber}</strong>}
              {selectedPatientId && (
                <strong> 👤 {getPatient(selectedPatientId)?.patientName || selectedPatientId}</strong>
              )}
            </span>
            <button
              className="clear-filter-btn"
              onClick={() => { clearSelectedPatient(); clearSelectedResearchNumber(); }}
            >
              × 清除筛选
            </button>
          </div>
        )}
        <div className="toolbar-left">
          <div className="search-box">
            <span>🔍</span>
            <input
              type="text"
              placeholder="搜索患者、序列、处理人..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="form-select"
          >
            {COLLAB_STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="form-select"
          >
            <option value="all">全部处理人</option>
            {ASSIGNEES.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <div className="toolbar-right">
          <button className="btn btn-sm" onClick={handleSelectAllFiltered}>
            全选当前 ({filteredSeries.length})
          </button>
          {selectedSeriesIds.length > 0 && (
            <button className="btn btn-sm" onClick={clearSelection}>
              清空选择
            </button>
          )}
          <div className="bulk-assign-bar">
            <select
              value={bulkAssignee}
              onChange={(e) => setBulkAssignee(e.target.value)}
              className="form-select"
            >
              {ASSIGNEES.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value as any)}
              className="form-select"
            >
              {COLLAB_STATUS_OPTIONS.filter((o) => o.value !== 'all').map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <button
              className="btn btn-sm btn-primary"
              onClick={handleBulkAssign}
              disabled={selectedSeriesIds.length === 0}
            >
              批量分配
            </button>
          </div>
        </div>
      </div>

      <div className="collab-list">
        {filteredSeries.length === 0 ? (
          <div className="empty-collab">
            <div className="empty-icon">📭</div>
            <p>暂无符合条件的协作记录</p>
          </div>
        ) : (
          filteredSeries.map((s) => {
            const patient = getPatient(s.patientId);
            const collab = s.collaboration || { status: 'unassigned' as const };
            const isSelected = selectedSeriesIds.includes(s.id);

            return (
              <div
                key={s.id}
                className={`collab-row ${isSelected ? 'selected' : ''}`}
                onClick={() => toggleSelectSeries(s.id)}
              >
                <div className="collab-checkbox">
                  <input type="checkbox" checked={isSelected} readOnly />
                </div>
                <div className="collab-main">
                  <div className="collab-title">
                    <strong>{patient?.patientName || '未知'}</strong>
                    <span className="collab-id">({patient?.patientId || s.patientId})</span>
                    <span className="collab-series">· {s.seriesDescription || s.id}</span>
                    {patient?.researchNumber && (
                      <span className="research-badge">{patient.researchNumber}</span>
                    )}
                  </div>
                  <div className="collab-meta">
                    <span className={`collab-status cs-${collab.status}`}>
                      {collab.status === 'unassigned' && '未分配'}
                      {collab.status === 'in_progress' && '处理中'}
                      {collab.status === 'needs_review' && '待复核'}
                      {collab.status === 'done' && '已完成'}
                    </span>
                    <span className="collab-assignee-inline">
                      👤 {collab.assignee || '未分配'}
                    </span>
                    {collab.lastUpdatedAt && (
                      <span className="collab-time">🕒 {formatTime(collab.lastUpdatedAt)}</span>
                    )}
                  </div>
                </div>
                <div className="collab-quick" onClick={(e) => e.stopPropagation()}>
                  <select
                    value={collab.assignee || '未分配'}
                    onChange={(e) => {
                      const val = e.target.value;
                      updateCollaboration(s.id, {
                        assignee: val === '未分配' ? undefined : val,
                      });
                    }}
                    className="form-select small"
                  >
                    {ASSIGNEES.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                  <select
                    value={collab.status}
                    onChange={(e) => {
                      updateCollaboration(s.id, { status: e.target.value as any });
                    }}
                    className="form-select small"
                  >
                    {COLLAB_STATUS_OPTIONS.filter((o) => o.value !== 'all').map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <button className="btn btn-xs" onClick={() => navigateToSeries(s.id, 'series')}>
                    👁
                  </button>
                  <button className="btn btn-xs" onClick={() => navigateToSeries(s.id, 'tags')}>
                    ✏️
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
