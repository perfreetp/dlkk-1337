import { useState, useMemo } from 'react';
import { useAppStore } from '../store/appStore';
import type { Patient, EnrollmentStatus } from '../../shared/types';
import './Dashboard.css';

type GroupMode = 'patient' | 'researchNumber';
type StatusCount = { pending: number; included: number; excluded: number; review: number; total: number };

export default function Dashboard() {
  const {
    patients,
    getAllSeries,
    setCurrentView,
    setSelectedPatient,
    clearSelectedPatient,
    runQCCheck,
    pendingTagEditSeriesIds,
    setPendingTagEditSeries,
  } = useAppStore();

  const [groupMode, setGroupMode] = useState<GroupMode>('patient');

  const allSeries = useMemo(() => getAllSeries(), [getAllSeries]);

  const overallStats = useMemo<StatusCount>(() => {
    const stats: StatusCount = { pending: 0, included: 0, excluded: 0, review: 0, total: allSeries.length };
    allSeries.forEach((s) => {
      stats[s.enrollmentStatus]++;
    });
    return stats;
  }, [allSeries]);

  const groupedData = useMemo(() => {
    const groups: Record<string, { key: string; label: string; subLabel?: string; patientIds: string[]; counts: StatusCount; seriesIds: string[] }> = {};

    if (groupMode === 'patient') {
      patients.forEach((patient) => {
        const seriesOfPatient = allSeries.filter((s) => s.patientId === patient.id);
        const counts: StatusCount = { pending: 0, included: 0, excluded: 0, review: 0, total: seriesOfPatient.length };
        seriesOfPatient.forEach((s) => counts[s.enrollmentStatus]++);

        groups[patient.id] = {
          key: patient.id,
          label: patient.patientName,
          subLabel: patient.patientId,
          patientIds: [patient.id],
          counts,
          seriesIds: seriesOfPatient.map((s) => s.id),
        };
      });
    } else {
      patients.forEach((patient) => {
        const rn = patient.researchNumber || '未分配';
        const seriesOfPatient = allSeries.filter((s) => s.patientId === patient.id);

        if (!groups[rn]) {
          groups[rn] = {
            key: rn,
            label: `研究编号: ${rn}`,
            subLabel: '',
            patientIds: [],
            counts: { pending: 0, included: 0, excluded: 0, review: 0, total: 0 },
            seriesIds: [],
          };
        }

        groups[rn].patientIds.push(patient.id);
        groups[rn].seriesIds.push(...seriesOfPatient.map((s) => s.id));
        seriesOfPatient.forEach((s) => {
          groups[rn].counts[s.enrollmentStatus]++;
          groups[rn].counts.total++;
        });
      });
    }

    return Object.values(groups).sort((a, b) => {
      if (a.counts.pending !== b.counts.pending) return b.counts.pending - a.counts.pending;
      return b.counts.total - a.counts.total;
    });
  }, [patients, allSeries, groupMode]);

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

  const overallProgress = overallStats.total > 0
    ? Math.round(((overallStats.included + overallStats.excluded) / overallStats.total) * 100)
    : 0;

  const handleJumpToSeries = (group: typeof groupedData[0]) => {
    if (groupMode === 'patient' && group.patientIds.length === 1) {
      setSelectedPatient(group.patientIds[0]);
    } else {
      clearSelectedPatient();
    }
    setCurrentView('series');
  };

  const handleJumpToTags = (group: typeof groupedData[0]) => {
    if (groupMode === 'patient' && group.patientIds.length === 1) {
      setSelectedPatient(group.patientIds[0]);
    } else {
      clearSelectedPatient();
    }
    setPendingTagEditSeries(group.seriesIds);
    setCurrentView('tags');
  };

  const handleJumpToRules = () => {
    runQCCheck();
    setCurrentView('rules');
  };

  const handleJumpToPendingTags = () => {
    const pendingIds = allSeries.filter((s) => s.enrollmentStatus === 'pending').map((s) => s.id);
    setPendingTagEditSeries(pendingIds);
    setCurrentView('tags');
  };

  return (
    <div className="dashboard">
      <div className="window-header">
        <h2>处理进度</h2>
        <div className="toolbar">
          <div className="view-toggle">
            <button
              className={groupMode === 'patient' ? 'active' : ''}
              onClick={() => setGroupMode('patient')}
            >
              👤 按患者
            </button>
            <button
              className={groupMode === 'researchNumber' ? 'active' : ''}
              onClick={() => setGroupMode('researchNumber')}
            >
              🔬 按研究编号
            </button>
          </div>
        </div>
      </div>

      <div className="dashboard-overview">
        <div className="overview-card total">
          <div className="overview-icon">📊</div>
          <div className="overview-info">
            <div className="overview-value">{overallStats.total}</div>
            <div className="overview-label">总序列数</div>
          </div>
          <div className="overview-progress">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${overallProgress}%` }} />
            </div>
            <div className="progress-label">处理进度 {overallProgress}%</div>
          </div>
        </div>

        <div className="overview-card pending">
          <div className="overview-icon">⏳</div>
          <div className="overview-info">
            <div className="overview-value">{overallStats.pending}</div>
            <div className="overview-label">待处理</div>
          </div>
          <button className="overview-action" onClick={handleJumpToPendingTags}>
            批量处理 →
          </button>
        </div>

        <div className="overview-card included">
          <div className="overview-icon">✅</div>
          <div className="overview-info">
            <div className="overview-value">{overallStats.included}</div>
            <div className="overview-label">已入组</div>
          </div>
        </div>

        <div className="overview-card review">
          <div className="overview-icon">⚠️</div>
          <div className="overview-info">
            <div className="overview-value">{overallStats.review}</div>
            <div className="overview-label">待复核</div>
          </div>
          <button className="overview-action" onClick={handleJumpToRules}>
            规则检查 →
          </button>
        </div>

        <div className="overview-card excluded">
          <div className="overview-icon">❌</div>
          <div className="overview-info">
            <div className="overview-value">{overallStats.excluded}</div>
            <div className="overview-label">已排除</div>
          </div>
        </div>
      </div>

      <div className="dashboard-list">
        <div className="list-header">
          <h3>{groupMode === 'patient' ? '患者处理进度' : '研究编号处理进度'}</h3>
          <span className="list-count">{groupedData.length} 组</span>
        </div>

        <div className="group-list">
          {groupedData.map((group) => {
            const progressPct = group.counts.total > 0
              ? Math.round(((group.counts.included + group.counts.excluded) / group.counts.total) * 100)
              : 0;

            return (
              <div key={group.key} className="progress-group-card">
                <div className="group-header">
                  <div className="group-title-wrap">
                    <h4 className="group-title">{group.label}</h4>
                    {group.subLabel && <span className="group-subtitle">{group.subLabel}</span>}
                  </div>
                  <div className="group-actions">
                    <button className="btn btn-xs" onClick={() => handleJumpToSeries(group)}>
                      🖼️ 序列
                    </button>
                    <button className="btn btn-xs" onClick={() => handleJumpToTags(group)}>
                      🏷️ 标签
                    </button>
                  </div>
                </div>

                <div className="group-progress">
                  <div className="progress-bar">
                    <div
                      className="progress-fill multi"
                      style={{
                        width: '100%',
                        background: `linear-gradient(to right,
                          #10b981 0%,
                          #10b981 ${(group.counts.included / group.counts.total) * 100}%,
                          #f59e0b ${(group.counts.included / group.counts.total) * 100}%,
                          #f59e0b ${((group.counts.included + group.counts.review) / group.counts.total) * 100}%,
                          #ef4444 ${((group.counts.included + group.counts.review) / group.counts.total) * 100}%,
                          #ef4444 ${((group.counts.included + group.counts.review + group.counts.excluded) / group.counts.total) * 100}%,
                          #94a3b8 ${((group.counts.included + group.counts.review + group.counts.excluded) / group.counts.total) * 100}%,
                          #94a3b8 100%
                        )`,
                      }}
                    />
                  </div>
                  <span className="progress-text">{progressPct}%</span>
                </div>

                <div className="group-status-breakdown">
                  <div className="status-chip">
                    <span className="chip-dot" style={{ background: getStatusColor('pending') }} />
                    <span className="chip-label">{getStatusText('pending')}</span>
                    <span className="chip-count">{group.counts.pending}</span>
                  </div>
                  <div className="status-chip">
                    <span className="chip-dot" style={{ background: getStatusColor('included') }} />
                    <span className="chip-label">{getStatusText('included')}</span>
                    <span className="chip-count">{group.counts.included}</span>
                  </div>
                  <div className="status-chip">
                    <span className="chip-dot" style={{ background: getStatusColor('review') }} />
                    <span className="chip-label">{getStatusText('review')}</span>
                    <span className="chip-count">{group.counts.review}</span>
                  </div>
                  <div className="status-chip">
                    <span className="chip-dot" style={{ background: getStatusColor('excluded') }} />
                    <span className="chip-label">{getStatusText('excluded')}</span>
                    <span className="chip-count">{group.counts.excluded}</span>
                  </div>
                  <div className="status-chip total">
                    <span className="chip-label">总计</span>
                    <span className="chip-count">{group.counts.total}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
