import { useState, useMemo, useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import type { Series, Patient, Study } from '../../shared/types';
import './SeriesBrowser.css';

type GroupBy = 'patient' | 'study' | 'researchNumber';

export default function SeriesBrowser() {
  const {
    patients,
    selectedPatientId,
    selectedStudyId,
    selectedSeriesIds,
    setSelectedPatient,
    clearSelectedPatient,
    setSelectedStudy,
    toggleSelectSeries,
    selectAllSeries,
    clearSelection,
    searchQuery,
    setSearchQuery,
    filterStatus,
    setFilterStatus,
    sortBy,
    setSortBy,
    getFilteredSeries,
    getAllSeries,
    setCurrentView,
  } = useAppStore();

  const [groupBy, setGroupBy] = useState<GroupBy>('patient');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedSeriesDetail, setSelectedSeriesDetail] = useState<Series | null>(null);

  useEffect(() => {
    setSelectedSeriesDetail(null);
  }, [selectedPatientId]);

  const filteredSeries = useMemo(() => {
    return getFilteredSeries();
  }, [getFilteredSeries, searchQuery, filterStatus, sortBy]);

  const getPatientById = (id: string): Patient | undefined => {
    return patients.find((p) => p.id === id);
  };

  const getStudyById = (patientId: string, studyId: string): Study | undefined => {
    const patient = getPatientById(patientId);
    return patient?.studies.find((s) => s.id === studyId);
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

  const groupedData = useMemo(() => {
    if (groupBy === 'patient') {
      const groups: Record<string, { patient: Patient; series: Series[] }> = {};
      filteredSeries.forEach((series) => {
        const patient = getPatientById(series.patientId);
        if (patient) {
          if (!groups[patient.id]) {
            groups[patient.id] = { patient, series: [] };
          }
          groups[patient.id].series.push(series);
        }
      });
      return Object.entries(groups).map(([key, value]) => ({
        key,
        label: `${value.patient.patientName} (${value.patient.patientId})`,
        subLabel: value.patient.researchNumber || '',
        series: value.series,
      }));
    } else if (groupBy === 'study') {
      const groups: Record<string, { study: Study; patient: Patient; series: Series[] }> = {};
      filteredSeries.forEach((series) => {
        const patient = getPatientById(series.patientId);
        const study = patient?.studies.find((s) => s.id === series.studyId);
        if (study && patient) {
          if (!groups[study.id]) {
            groups[study.id] = { study, patient, series: [] };
          }
          groups[study.id].series.push(series);
        }
      });
      return Object.entries(groups).map(([key, value]) => ({
        key,
        label: value.study.studyDescription || value.study.studyInstanceUid,
        subLabel: `${value.patient.patientName} · ${value.study.studyDate || ''}`,
        series: value.series,
      }));
    } else {
      const groups: Record<string, Series[]> = {};
      filteredSeries.forEach((series) => {
        const patient = getPatientById(series.patientId);
        const rn = patient?.researchNumber || '未分配';
        if (!groups[rn]) {
          groups[rn] = [];
        }
        groups[rn].push(series);
      });
      return Object.entries(groups).map(([key, value]) => ({
        key,
        label: `研究编号: ${key}`,
        subLabel: `${value.length} 个序列`,
        series: value,
      }));
    }
  }, [filteredSeries, groupBy, patients]);

  const SeriesThumbnail = ({ series }: { series: Series }) => {
    const isSelected = selectedSeriesIds.includes(series.id);
    return (
      <div
        className={`series-card ${isSelected ? 'selected' : ''} ${
          series.isLocked ? 'locked' : ''
        }`}
        onClick={() => {
          toggleSelectSeries(series.id);
          setSelectedSeriesDetail(series);
        }}
        onDoubleClick={() => setSelectedSeriesDetail(series)}
      >
        <div className="series-checkbox">
          <input type="checkbox" checked={isSelected} readOnly />
        </div>
        {series.isLocked && <div className="series-lock-badge">🔒</div>}
        <div className="series-thumbnail">
          <div className="thumbnail-placeholder">
            <span className="thumbnail-modality">{series.modality}</span>
            <span className="thumbnail-count">{series.numInstances}帧</span>
          </div>
        </div>
        <div className="series-info">
          <div className="series-title">{series.seriesDescription || '未命名序列'}</div>
          <div className="series-meta">
            <span>{series.bodyPartExamined}</span>
            <span>·</span>
            <span>{series.rows}×{series.cols}</span>
          </div>
          <div
            className="series-status"
            style={{ backgroundColor: getStatusColor(series.enrollmentStatus) }}
          >
            {getStatusText(series.enrollmentStatus)}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="series-browser">
      <div className="window-header">
        <h2>序列浏览</h2>
        <div className="toolbar">
          <div className="search-box">
            <span>🔍</span>
            <input
              type="text"
              placeholder="搜索患者、序列、标签..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="filter-group">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="form-select"
            >
              <option value="all">全部状态</option>
              <option value="pending">待处理</option>
              <option value="included">已入组</option>
              <option value="excluded">已排除</option>
              <option value="review">待复核</option>
            </select>

            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as GroupBy)}
              className="form-select"
            >
              <option value="patient">按患者分组</option>
              <option value="study">按检查分组</option>
              <option value="researchNumber">按研究编号分组</option>
            </select>

            <div className="view-toggle">
              <button
                className={viewMode === 'grid' ? 'active' : ''}
                onClick={() => setViewMode('grid')}
              >
                ▦ 网格
              </button>
              <button
                className={viewMode === 'list' ? 'active' : ''}
                onClick={() => setViewMode('list')}
              >
                ☰ 列表
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="browser-layout">
        <div className="patient-sidebar">
          <div className="sidebar-header">
            <h3>患者列表</h3>
            <span className="patient-count">{patients.length} 位</span>
          </div>
          <div className="patient-list">
            <div
              className={`patient-item ${!selectedPatientId ? 'active all-patients' : 'all-patients'}`}
              onClick={clearSelectedPatient}
            >
              <div className="patient-avatar">📋</div>
              <div className="patient-info">
                <div className="patient-name">全部患者</div>
                <div className="patient-id">显示所有序列</div>
              </div>
              <span className="research-badge">{getAllSeries().length}</span>
            </div>
            {patients.map((patient) => (
              <div
                key={patient.id}
                className={`patient-item ${selectedPatientId === patient.id ? 'active' : ''}`}
                onClick={() => setSelectedPatient(patient.id)}
              >
                <div className="patient-avatar">👤</div>
                <div className="patient-info">
                  <div className="patient-name">{patient.patientName}</div>
                  <div className="patient-id">{patient.patientId}</div>
                </div>
                {patient.researchNumber && (
                  <span className="research-badge">{patient.researchNumber}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="series-main">
          <div className="selection-bar">
            <span>
              已选择 <strong>{selectedSeriesIds.length}</strong> 个序列
              {selectedPatientId && (
                <span className="filter-indicator">
                  · 正在筛选: <strong>{getPatientById(selectedPatientId)?.patientName}</strong>
                  <button className="clear-filter-btn" onClick={clearSelectedPatient}>
                    × 清除筛选
                  </button>
                </span>
              )}
            </span>
            <div className="selection-actions">
              <button
                className="btn btn-sm btn-primary"
                onClick={() => setCurrentView('tags')}
              >
                ✏️ 编辑标签
              </button>
              <button className="btn btn-sm" onClick={selectAllSeries}>
                全选
              </button>
              <button className="btn btn-sm" onClick={clearSelection}>
                取消
              </button>
            </div>
          </div>

          <div className="series-content">
            {groupedData.map((group) => (
              <div key={group.key} className="series-group">
                <div className="group-header">
                  <span className="group-title">{group.label}</span>
                  {group.subLabel && <span className="group-subtitle">{group.subLabel}</span>}
                  <span className="group-count">{group.series.length} 个序列</span>
                </div>
                <div className={`series-grid ${viewMode === 'list' ? 'list-view' : ''}`}>
                  {group.series.map((series) => (
                    <SeriesThumbnail key={series.id} series={series} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {selectedSeriesDetail && (
          <div className="detail-panel">
            <div className="detail-header">
              <h3>序列详情</h3>
              <button className="close-btn" onClick={() => setSelectedSeriesDetail(null)}>
                ✕
              </button>
            </div>
            <div className="detail-thumbnail">
              <div className="detail-thumbnail-placeholder">
                <span className="thumbnail-modality-large">{selectedSeriesDetail.modality}</span>
                <span>{selectedSeriesDetail.numInstances} 帧图像</span>
              </div>
            </div>
            <div className="detail-info">
              <div className="detail-section">
                <h4>基本信息</h4>
                <div className="info-row">
                  <span className="info-label">序列描述</span>
                  <span className="info-value">{selectedSeriesDetail.seriesDescription}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">模态</span>
                  <span className="info-value">{selectedSeriesDetail.modality}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">检查部位</span>
                  <span className="info-value">{selectedSeriesDetail.bodyPartExamined}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">图像尺寸</span>
                  <span className="info-value">{selectedSeriesDetail.rows} × {selectedSeriesDetail.cols}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">层厚</span>
                  <span className="info-value">{selectedSeriesDetail.sliceThickness} mm</span>
                </div>
              </div>

              <div className="detail-section">
                <h4>标签信息</h4>
                <div className="info-row">
                  <span className="info-label">入组状态</span>
                  <span
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(selectedSeriesDetail.enrollmentStatus) }}
                  >
                    {getStatusText(selectedSeriesDetail.enrollmentStatus)}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">病种标签</span>
                  <div className="tag-list">
                    {selectedSeriesDetail.diseaseTags.length > 0 ? (
                      selectedSeriesDetail.diseaseTags.map((tag) => (
                        <span key={tag} className="tag">
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className="text-muted">未设置</span>
                    )}
                  </div>
                </div>
                <div className="info-row">
                  <span className="info-label">质检状态</span>
                  <span className={`qc-status qc-${selectedSeriesDetail.qcResult}`}>
                    {selectedSeriesDetail.qcResult === 'pass' && '✅ 通过'}
                    {selectedSeriesDetail.qcResult === 'fail' && '❌ 不通过'}
                    {selectedSeriesDetail.qcResult === 'pending' && '⏳ 待质检'}
                    {selectedSeriesDetail.qcResult === 'rework' && '🔄 需返工'}
                  </span>
                </div>
              </div>

              <div className="detail-section">
                <h4>备注</h4>
                <p className="notes-text">
                  {selectedSeriesDetail.notes || '暂无备注'}
                </p>
              </div>

              {selectedSeriesDetail.isLocked && (
                <div className="lock-notice">
                  🔒 此序列已锁定，不可修改
                </div>
              )}

              <div className="detail-actions">
                <button
                  className="btn btn-primary btn-block"
                  onClick={() => setCurrentView('tags')}
                >
                  ✏️ 编辑此序列标签
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
