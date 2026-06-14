import { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '../store/appStore';
import type { QCRule, QCCheckResult } from '../../shared/types';
import './RuleChecker.css';

export default function RuleChecker() {
  const {
    qcRules,
    qcResults,
    toggleRule,
    runQCCheck,
    getAllSeries,
    patients,
    selectedPatientId,
    selectedResearchNumber,
    setCurrentView,
    setSelectedPatient,
    navigateToSeries,
    setPendingTagEditSeries,
    getFilteredPatients,
  } = useAppStore();
  const [isChecking, setIsChecking] = useState(false);
  const [selectedResult, setSelectedResult] = useState<QCCheckResult | null>(null);
  const [resultFilter, setResultFilter] = useState<'all' | 'pass' | 'fail'>('all');
  const [patientFilter, setPatientFilter] = useState<string>('all');
  const [researchFilter, setResearchFilter] = useState<string>('all');
  const [expandedRuleId, setExpandedRuleId] = useState<string | null>(null);

  useEffect(() => {
    if (qcResults.length === 0) {
      handleRunCheck();
    }
  }, []);

  useEffect(() => {
    if (!selectedResult && qcResults.length > 0) {
      const firstFail = qcResults.find((r) => !r.passed);
      if (firstFail) setSelectedResult(firstFail);
    }
  }, [qcResults]);

  useEffect(() => {
    if (selectedResearchNumber) {
      setResearchFilter(selectedResearchNumber);
      setPatientFilter('all');
    } else if (selectedPatientId) {
      setPatientFilter(selectedPatientId);
      setResearchFilter('all');
    }
  }, [selectedPatientId, selectedResearchNumber]);

  useEffect(() => {
    if (selectedResult) {
      const stillVisible = filteredResults.some((r) => r.ruleId === selectedResult.ruleId);
      if (!stillVisible && filteredResults.length > 0) {
        setSelectedResult(filteredResults[0]);
      } else if (!stillVisible) {
        setSelectedResult(null);
      }
    }
  }, [resultFilter]);

  const allSeries = getAllSeries();

  const researchNumbers = useMemo(() => {
    const set = new Set<string>();
    patients.forEach((p) => {
      if (p.researchNumber) set.add(p.researchNumber);
    });
    return Array.from(set);
  }, [patients]);

  const handleRunCheck = () => {
    setIsChecking(true);
    setTimeout(() => {
      runQCCheck();
      setIsChecking(false);
      setSelectedResult(null);
    }, 1500);
  };

  const getResultByRule = (ruleId: string): QCCheckResult | undefined => {
    return qcResults.find((r) => r.ruleId === ruleId);
  };

  const getRuleIcon = (type: string): string => {
    const icons: Record<string, string> = {
      desensitization: '🔐',
      completeness: '📋',
      consistency: '🔗',
      custom: '⚙️',
    };
    return icons[type] || '📋';
  };

  const filteredResults = useMemo(() => {
    return qcResults.filter((r) => {
      if (resultFilter === 'pass' && !r.passed) return false;
      if (resultFilter === 'fail' && r.passed) return false;
      return true;
    });
  }, [qcResults, resultFilter]);

  const getFilteredAffectedItems = (result: QCCheckResult) => {
    if (!result.affectedItems) return [];
    let items = result.affectedItems;

    if (patientFilter !== 'all') {
      items = items.filter((itemId) => {
        const series = allSeries.find((s) => s.id === itemId);
        return series?.patientId === patientFilter;
      });
    }

    if (researchFilter !== 'all') {
      items = items.filter((itemId) => {
        const series = allSeries.find((s) => s.id === itemId);
        const patient = patients.find((p) => p.id === series?.patientId);
        return patient?.researchNumber === researchFilter;
      });
    }

    return items;
  };

  const goToSeries = (seriesId: string) => {
    navigateToSeries(seriesId, 'series');
  };

  const goToTagEdit = (seriesId: string) => {
    navigateToSeries(seriesId, 'tags');
  };

  const batchEditAffected = () => {
    if (selectedResult?.affectedItems && selectedResult.affectedItems.length > 0) {
      setPendingTagEditSeries(selectedResult.affectedItems);
      setCurrentView('tags');
    }
  };

  const getIssueDetail = (result: QCCheckResult, seriesId: string): string => {
    const series = allSeries.find((s) => s.id === seriesId);
    const patient = series ? patients.find((p) => p.id === series.patientId) : null;
    const study = series ? patient?.studies.find((s) => s.id === series.studyId) : null;

    if (result.ruleId === 'rule-1') {
      return '患者信息脱敏不完整';
    } else if (result.ruleId === 'rule-3' && series) {
      return `缺失字段: ${series.missingFields.join('、')}`;
    } else if (result.ruleId === 'rule-2' && study) {
      return `序列不完整 (应有3个，实际${study.series.length}个)`;
    } else if (result.ruleId === 'rule-4' && series) {
      const patientSeries = allSeries.filter((s) => s.patientId === series.patientId);
      const statusMap: Record<string, number> = {};
      patientSeries.forEach((s) => {
        statusMap[s.enrollmentStatus] = (statusMap[s.enrollmentStatus] || 0) + 1;
      });
      const statusText: Record<string, string> = {
        pending: '待处理', included: '已入组', excluded: '已排除', review: '待复核'
      };
      const parts = Object.entries(statusMap).map(
        ([k, v]) => `${statusText[k] || k}(${v}个)`
      );
      return `入组状态不一致: ${parts.join('、')}`;
    }
    return '';
  };

  const passCount = qcResults.filter((r) => r.passed).length;
  const failCount = qcResults.filter((r) => !r.passed).length;

  const toggleRuleExpand = (ruleId: string) => {
    setExpandedRuleId(expandedRuleId === ruleId ? null : ruleId);
  };

  return (
    <div className="rule-checker">
      <div className="window-header">
        <h2>规则检查</h2>
        <div className="header-actions">
          <button
            className="btn btn-primary"
            onClick={handleRunCheck}
            disabled={isChecking}
          >
            {isChecking ? '⏳ 检查中...' : '▶️ 执行检查'}
          </button>
        </div>
      </div>

      <div className="checker-summary">
        {(selectedResearchNumber || selectedPatientId) && (
          <div className="filter-banner rule-filter-banner">
            <span>
              正在筛选:
              {selectedResearchNumber && <strong> 🔬 研究编号 {selectedResearchNumber}</strong>}
              {selectedPatientId && (
                <strong>
                  {' '}👤 {getFilteredPatients().find((p) => p.id === selectedPatientId)?.patientName || selectedPatientId}
                </strong>
              )}
            </span>
            <button
              className="clear-filter-btn"
              onClick={() => {
                const { setSelectedPatient, clearSelectedPatient, clearSelectedResearchNumber } = useAppStore.getState();
                clearSelectedPatient();
                clearSelectedResearchNumber();
              }}
            >
              × 清除筛选
            </button>
          </div>
        )}
        <div className="summary-card total">
          <div className="summary-icon">📊</div>
          <div className="summary-info">
            <div className="summary-value">{qcRules.length}</div>
            <div className="summary-label">检查规则</div>
          </div>
        </div>
        <div className="summary-card pass">
          <div className="summary-icon">✅</div>
          <div className="summary-info">
            <div className="summary-value">{passCount}</div>
            <div className="summary-label">通过</div>
          </div>
        </div>
        <div className="summary-card fail">
          <div className="summary-icon">❌</div>
          <div className="summary-info">
            <div className="summary-value">{failCount}</div>
            <div className="summary-label">未通过</div>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon">🖼️</div>
          <div className="summary-info">
            <div className="summary-value">{allSeries.length}</div>
            <div className="summary-label">检查序列</div>
          </div>
        </div>
      </div>

      <div className="checker-layout">
        <div className="rules-panel">
          <div className="panel-header">
            <h3>质检规则</h3>
            {resultFilter !== 'all' && (
              <span className="filter-badge">
                {resultFilter === 'pass' ? '只看通过' : '只看未通过'}
                <button
                  className="filter-badge-close"
                  onClick={() => setResultFilter('all')}
                >
                  ×
                </button>
              </span>
            )}
          </div>
          <div className="rules-list">
            {qcRules.map((rule) => {
              const result = getResultByRule(rule.id);
              const matchesFilter =
                resultFilter === 'all' ||
                (result && resultFilter === 'pass' && result.passed) ||
                (result && resultFilter === 'fail' && !result.passed);

              if (!matchesFilter) return null;

              return (
                <div
                  key={rule.id}
                  className={`rule-card ${!rule.enabled ? 'disabled' : ''} ${
                    selectedResult?.ruleId === rule.id ? 'active' : ''
                  }`}
                  onClick={() => result && setSelectedResult(result)}
                >
                  <div className="rule-header">
                    <span className="rule-icon">{getRuleIcon(rule.type)}</span>
                    <div className="rule-info">
                      <div className="rule-name">{rule.name}</div>
                      <div className="rule-desc">{rule.description}</div>
                    </div>
                    <div className="rule-toggle">
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={rule.enabled}
                          onChange={(e) => {
                            e.stopPropagation();
                            toggleRule(rule.id);
                          }}
                        />
                        <span className="slider"></span>
                      </label>
                    </div>
                  </div>
                  {result && (
                    <div className="rule-result">
                      <span className={`result-badge ${result.passed ? 'pass' : 'fail'}`}>
                        {result.passed ? '✅ 通过' : '❌ 未通过'}
                      </span>
                      <span className="result-message">{result.message}</span>
                    </div>
                  )}
                </div>
              );
            })}
            {qcRules.filter((rule) => {
              const result = getResultByRule(rule.id);
              return (
                resultFilter === 'all' ||
                (result && resultFilter === 'pass' && result.passed) ||
                (result && resultFilter === 'fail' && !result.passed)
              );
            }).length === 0 && (
              <div className="empty-rules">
                当前筛选条件下没有匹配的规则
              </div>
            )}
          </div>
        </div>

        <div className="details-panel">
          <div className="panel-header">
            <h3>检查详情</h3>
          </div>

          <div className="detail-filters">
            <div className="filter-row">
              <span className="filter-label">结果:</span>
              <div className="filter-tabs">
                <button
                  className={`filter-tab ${resultFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setResultFilter('all')}
                >
                  全部
                </button>
                <button
                  className={`filter-tab ${resultFilter === 'pass' ? 'active' : ''}`}
                  onClick={() => setResultFilter('pass')}
                >
                  通过
                </button>
                <button
                  className={`filter-tab ${resultFilter === 'fail' ? 'active' : ''}`}
                  onClick={() => setResultFilter('fail')}
                >
                  未通过
                </button>
              </div>
            </div>
            <div className="filter-row">
              <span className="filter-label">患者:</span>
              <select
                value={patientFilter}
                onChange={(e) => setPatientFilter(e.target.value)}
                className="form-select form-select-sm"
              >
                <option value="all">全部患者</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.patientName} ({p.patientId})
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-row">
              <span className="filter-label">研究编号:</span>
              <select
                value={researchFilter}
                onChange={(e) => setResearchFilter(e.target.value)}
                className="form-select form-select-sm"
              >
                <option value="all">全部编号</option>
                {researchNumbers.map((rn) => (
                  <option key={rn} value={rn}>{rn}</option>
                ))}
              </select>
            </div>
          </div>

          {selectedResult ? (
            <div className="result-detail">
              <div className="detail-header">
                <div
                  className={`detail-status ${selectedResult.passed ? 'pass' : 'fail'}`}
                >
                  {selectedResult.passed ? '✅ 检查通过' : '❌ 检查未通过'}
                </div>
                <h4>{selectedResult.ruleName}</h4>
              </div>
              <p className="detail-message">{selectedResult.message}</p>

              {selectedResult.affectedItems && selectedResult.affectedItems.length > 0 ? (
                <div className="affected-items">
                  <div className="affected-header">
                    <h5>
                      受影响序列 ({getFilteredAffectedItems(selectedResult).length} 个)
                    </h5>
                    {getFilteredAffectedItems(selectedResult).length > 0 && (
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={batchEditAffected}
                      >
                        ✏️ 批量修改标签
                      </button>
                    )}
                  </div>
                  <div className="items-list scrollable-list">
                    {getFilteredAffectedItems(selectedResult).map((itemId) => {
                      const series = allSeries.find((s) => s.id === itemId);
                      const patient = series ? patients.find((p) => p.id === series.patientId) : null;
                      const study = series ? patient?.studies.find((s) => s.id === series.studyId) : null;
                      const issueDetail = getIssueDetail(selectedResult, itemId);
                      const collabStatus = series?.collaboration?.status;
                      const collabAssignee = series?.collaboration?.assignee;

                      return (
                        <div key={itemId} className="item-row with-detail clickable"
                          onClick={() => goToSeries(itemId)}
                        >
                          <div className="item-main">
                            <span className="item-icon">
                              {selectedResult.ruleId === 'rule-4' ? '⚠️' : '🖼️'}
                            </span>
                            <div className="item-text">
                              <span className="item-name">
                                {patient?.patientName || '未知患者'} ({series?.patientId || itemId})
                              </span>
                              <span className="item-series">
                                {study?.studyDescription || ''} → {series?.seriesDescription || itemId}
                              </span>
                              {(collabStatus || collabAssignee) && (
                                <span className="item-collab">
                                  {collabAssignee && <span className="collab-assignee">👤 {collabAssignee}</span>}
                                  {collabStatus && (
                                    <span className={`collab-status cs-${collabStatus}`}>
                                      {collabStatus === 'unassigned' && '未分配'}
                                      {collabStatus === 'in_progress' && '处理中'}
                                      {collabStatus === 'needs_review' && '待复核'}
                                      {collabStatus === 'done' && '已完成'}
                                    </span>
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                          {issueDetail && (
                            <div className="item-issue">
                              {issueDetail}
                            </div>
                          )}
                          <div className="item-actions" onClick={(e) => e.stopPropagation()}>
                            <button
                              className="btn btn-xs btn-primary"
                              onClick={() => goToSeries(itemId)}
                              title="查看序列"
                            >
                              👁 查看
                            </button>
                            <button
                              className="btn btn-xs"
                              onClick={() => goToTagEdit(itemId)}
                              title="编辑标签"
                            >
                              ✏️ 标签
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {getFilteredAffectedItems(selectedResult).length === 0 && (
                      <div className="empty-filter">
                        当前筛选条件下没有匹配的问题
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="empty-items">
                  ✅ 没有受影响的序列
                </div>
              )}
            </div>
          ) : (
            <div className="empty-detail">
              <div className="empty-icon">📋</div>
              <p>点击左侧规则查看详细检查结果</p>
            </div>
          )}
        </div>
      </div>

      <div className="check-tips">
        <h3>📌 检查说明</h3>
        <div className="tips-grid">
          <div className="tip-item">
            <span className="tip-icon">🔐</span>
            <div>
              <h4>脱敏检查</h4>
              <p>检查患者姓名、ID等隐私信息是否已脱敏处理，确保数据安全合规</p>
            </div>
          </div>
          <div className="tip-item">
            <span className="tip-icon">📋</span>
            <div>
              <h4>完整性检查</h4>
              <p>检查必填字段是否完整，序列数量是否符合要求</p>
            </div>
          </div>
          <div className="tip-item">
            <span className="tip-icon">🔗</span>
            <div>
              <h4>一致性检查</h4>
              <p>检查同一患者不同检查之间的标签和状态是否一致</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
