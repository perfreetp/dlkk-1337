import { useState, useMemo } from 'react';
import { useAppStore } from '../store/appStore';
import type { QCConclusion } from '../../shared/types';
import './SamplingReview.css';

export default function SamplingReview() {
  const {
    getAllSeries,
    sampleForReview,
    setQCConclusion,
    lockSeries,
    unlockSeries,
    reviewRecords,
  } = useAppStore();

  const [sampleCount, setSampleCount] = useState(5);
  const [sampledIds, setSampledIds] = useState<string[]>([]);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewerName, setReviewerName] = useState('质检人员');
  const [activeTab, setActiveTab] = useState<'sample' | 'history'>('sample');

  const allSeries = useMemo(() => getAllSeries(), [getAllSeries]);

  const unlockedSeries = useMemo(
    () => allSeries.filter((s) => !s.isLocked),
    [allSeries]
  );

  const lockedSeries = useMemo(() => allSeries.filter((s) => s.isLocked), [allSeries]);

  const handleSample = () => {
    const ids = sampleForReview(sampleCount);
    setSampledIds(ids);
    setCurrentReviewIndex(0);
    setReviewComment('');
  };

  const handleConclusion = (conclusion: QCConclusion) => {
    const currentId = sampledIds[currentReviewIndex];
    if (currentId) {
      setQCConclusion(currentId, conclusion, reviewerName, reviewComment);
      if (conclusion === 'pass') {
        lockSeries(currentId);
      }
      if (currentReviewIndex < sampledIds.length - 1) {
        setCurrentReviewIndex((prev) => prev + 1);
        setReviewComment('');
      }
    }
  };

  const currentSeries = sampledIds.length > 0
    ? allSeries.find((s) => s.id === sampledIds[currentReviewIndex])
    : null;

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

  const qcStats = useMemo(() => {
    const stats: Record<string, number> = {
      pass: 0,
      fail: 0,
      pending: 0,
      rework: 0,
    };
    allSeries.forEach((s) => {
      stats[s.qcResult] = (stats[s.qcResult] || 0) + 1;
    });
    return stats;
  }, [allSeries]);

  return (
    <div className="sampling-review">
      <div className="window-header">
        <h2>抽样复核</h2>
        <div className="header-tabs">
          <button
            className={activeTab === 'sample' ? 'active' : ''}
            onClick={() => setActiveTab('sample')}
          >
            抽样质检
          </button>
          <button
            className={activeTab === 'history' ? 'active' : ''}
            onClick={() => setActiveTab('history')}
          >
            复核记录
          </button>
        </div>
      </div>

      {activeTab === 'sample' ? (
        <div className="review-body">
          <div className="review-stats">
            <div className="stat-card">
              <div className="stat-label">总序列数</div>
              <div className="stat-value">{allSeries.length}</div>
            </div>
            <div className="stat-card pass">
              <div className="stat-label">质检通过</div>
              <div className="stat-value">{qcStats.pass}</div>
            </div>
            <div className="stat-card fail">
              <div className="stat-label">质检不通过</div>
              <div className="stat-value">{qcStats.fail}</div>
            </div>
            <div className="stat-card warning">
              <div className="stat-label">待质检</div>
              <div className="stat-value">{qcStats.pending}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">已锁定</div>
              <div className="stat-value">{lockedSeries.length}</div>
            </div>
          </div>

          <div className="review-layout">
            <div className="sampling-panel">
              <div className="panel-card">
                <h3>随机抽样</h3>
                <div className="sampling-controls">
                  <div className="control-group">
                    <label>抽样数量</label>
                    <div className="count-input">
                      <button
                        className="count-btn"
                        onClick={() => setSampleCount((c) => Math.max(1, c - 1))}
                      >
                        -
                      </button>
                      <input
                        type="number"
                        value={sampleCount}
                        onChange={(e) =>
                          setSampleCount(Math.max(1, parseInt(e.target.value) || 1))
                        }
                        min="1"
                      />
                      <button
                        className="count-btn"
                        onClick={() =>
                          setSampleCount((c) => Math.min(unlockedSeries.length, c + 1))
                        }
                      >
                        +
                      </button>
                    </div>
                    <span className="count-hint">
                      可抽样: {unlockedSeries.length} 个未锁定序列
                    </span>
                  </div>

                  <div className="control-group">
                    <label>质检人员</label>
                    <input
                      type="text"
                      value={reviewerName}
                      onChange={(e) => setReviewerName(e.target.value)}
                      className="form-input"
                      placeholder="请输入质检人员姓名"
                    />
                  </div>

                  <button className="btn btn-primary btn-block" onClick={handleSample}>
                    🎲 开始随机抽样
                  </button>
                </div>

                {sampledIds.length > 0 && (
                  <div className="sampled-list">
                    <h4>抽样列表 ({sampledIds.length} 个)</h4>
                    <div className="sampled-items">
                      {sampledIds.map((id, index) => {
                        const s = allSeries.find((ser) => ser.id === id);
                        return (
                          <div
                            key={id}
                            className={`sampled-item ${
                              currentReviewIndex === index ? 'active' : ''
                            }`}
                            onClick={() => setCurrentReviewIndex(index)}
                          >
                            <span className="item-index">{index + 1}</span>
                            <span className="item-name">
                              {s?.seriesDescription || id}
                            </span>
                            {s?.qcResult !== 'pending' && (
                              <span className={`qc-mini qc-${s?.qcResult}`}>
                                {s?.qcResult === 'pass' && '✓'}
                                {s?.qcResult === 'fail' && '✗'}
                                {s?.qcResult === 'rework' && '↻'}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="review-panel">
              {currentSeries ? (
                <div className="review-detail">
                  <div className="review-progress">
                    <span>
                      第 {currentReviewIndex + 1} / {sampledIds.length} 个
                    </span>
                    <div className="progress-bar-mini">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${((currentReviewIndex + 1) / sampledIds.length) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="review-thumbnail">
                    <div className="review-thumbnail-placeholder">
                      <span className="modality-large">{currentSeries.modality}</span>
                      <span className="frame-count">{currentSeries.numInstances} 帧</span>
                    </div>
                  </div>

                  <div className="review-info">
                    <h3>{currentSeries.seriesDescription}</h3>
                    <div className="info-grid">
                      <div className="info-item">
                        <span className="info-label">患者ID</span>
                        <span className="info-value">{currentSeries.patientId}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">检查部位</span>
                        <span className="info-value">{currentSeries.bodyPartExamined}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">图像尺寸</span>
                        <span className="info-value">
                          {currentSeries.rows} × {currentSeries.cols}
                        </span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">层厚</span>
                        <span className="info-value">{currentSeries.sliceThickness} mm</span>
                      </div>
                    </div>

                    <div className="review-tags">
                      <span className="review-label">入组状态：</span>
                      <span
                        className="status-badge"
                        style={{ backgroundColor: getStatusColor(currentSeries.enrollmentStatus) }}
                      >
                        {getStatusText(currentSeries.enrollmentStatus)}
                      </span>
                    </div>

                    <div className="review-tags">
                      <span className="review-label">病种标签：</span>
                      {currentSeries.diseaseTags.length > 0 ? (
                        currentSeries.diseaseTags.map((tag) => (
                          <span key={tag} className="tag">
                            {tag}
                          </span>
                        ))
                      ) : (
                        <span className="text-muted">无</span>
                      )}
                    </div>

                    <div className="comment-section">
                      <label>质检备注</label>
                      <textarea
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        placeholder="请输入质检备注（可选）"
                        rows={3}
                        disabled={currentSeries.isLocked}
                      />
                    </div>

                    {currentSeries.isLocked ? (
                      <div className="locked-notice">
                        🔒 此序列已锁定，不可修改
                        <button
                          className="btn btn-sm"
                          onClick={() => unlockSeries(currentSeries.id)}
                        >
                          解锁
                        </button>
                      </div>
                    ) : (
                      <div className="review-actions">
                        <button
                          className="btn btn-pass"
                          onClick={() => handleConclusion('pass')}
                        >
                          ✅ 质检通过
                        </button>
                        <button
                          className="btn btn-rework"
                          onClick={() => handleConclusion('rework')}
                        >
                          🔄 需返工
                        </button>
                        <button
                          className="btn btn-fail"
                          onClick={() => handleConclusion('fail')}
                        >
                          ❌ 不通过
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="empty-review">
                  <div className="empty-icon">🔍</div>
                  <h3>开始抽样复核</h3>
                  <p>从左侧设置抽样数量，点击"开始随机抽样"按钮</p>
                  <p>系统将从未锁定的序列中随机抽取样本进行复核</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="history-panel">
          <div className="panel-header">
            <h3>复核记录</h3>
            <span className="record-count">共 {reviewRecords.length} 条记录</span>
          </div>
          {reviewRecords.length > 0 ? (
            <div className="records-list">
              {reviewRecords.map((record) => {
                const series = allSeries.find((s) => s.id === record.seriesId);
                return (
                  <div key={record.id} className="record-item">
                    <div className="record-header">
                      <span className={`qc-badge qc-${record.conclusion}`}>
                        {record.conclusion === 'pass' && '✅ 通过'}
                        {record.conclusion === 'fail' && '❌ 不通过'}
                        {record.conclusion === 'rework' && '🔄 返工'}
                        {record.conclusion === 'pending' && '⏳ 待处理'}
                      </span>
                      <span className="record-time">
                        {new Date(record.createdAt).toLocaleString('zh-CN')}
                      </span>
                    </div>
                    <div className="record-body">
                      <div className="record-series">
                        <span className="series-icon">🖼️</span>
                        <span className="series-name">
                          {series?.seriesDescription || record.seriesId}
                        </span>
                      </div>
                      <div className="record-reviewer">
                        质检人员: {record.reviewer}
                      </div>
                      {record.comment && (
                        <div className="record-comment">
                          <span className="comment-label">备注：</span>
                          {record.comment}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-history">
              <div className="empty-icon">📝</div>
              <p>暂无复核记录</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
