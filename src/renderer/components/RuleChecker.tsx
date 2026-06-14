import { useState, useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import type { QCRule, QCCheckResult } from '../../shared/types';
import './RuleChecker.css';

export default function RuleChecker() {
  const { qcRules, qcResults, toggleRule, runQCCheck, getAllSeries, patients } = useAppStore();
  const [isChecking, setIsChecking] = useState(false);
  const [selectedResult, setSelectedResult] = useState<QCCheckResult | null>(null);

  useEffect(() => {
    if (qcResults.length === 0) {
      handleRunCheck();
    }
  }, []);

  const allSeries = getAllSeries();

  const handleRunCheck = () => {
    setIsChecking(true);
    setTimeout(() => {
      runQCCheck();
      setIsChecking(false);
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

  const passCount = qcResults.filter((r) => r.passed).length;
  const failCount = qcResults.filter((r) => !r.passed).length;

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
          </div>
          <div className="rules-list">
            {qcRules.map((rule) => {
              const result = getResultByRule(rule.id);
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
          </div>
        </div>

        <div className="details-panel">
          <div className="panel-header">
            <h3>检查详情</h3>
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

              {selectedResult.affectedItems && selectedResult.affectedItems.length > 0 && (
                <div className="affected-items">
                  <h5>受影响序列 ({selectedResult.affectedItems.length} 个)</h5>
                  <div className="items-list">
                    {selectedResult.affectedItems.slice(0, 15).map((itemId) => {
                      const series = allSeries.find((s) => s.id === itemId);
                      const patient = series ? patients.find((p) => p.id === series.patientId) : null;
                      const study = series ? patient?.studies.find((s) => s.id === series.studyId) : null;

                      let issueDetail = '';
                      if (selectedResult.ruleId === 'rule-1' && series) {
                        issueDetail = '⚠️ 患者信息脱敏不完整';
                      } else if (selectedResult.ruleId === 'rule-3' && series) {
                        issueDetail = `⚠️ 缺失字段: ${series.missingFields.join('、')}`;
                      } else if (selectedResult.ruleId === 'rule-2' && study) {
                        issueDetail = `⚠️ 序列不完整 (应有3个，实际${study.series.length}个)`;
                      } else if (selectedResult.ruleId === 'rule-4' && series) {
                        const patientSeries = allSeries.filter((s) => s.patientId === series.patientId);
                        const statuses = [...new Set(patientSeries.map((s) => s.enrollmentStatus))];
                        const statusText: Record<string, string> = {
                          pending: '待处理', included: '已入组', excluded: '已排除', review: '待复核'
                        };
                        issueDetail = `⚠️ 入组状态不一致: ${statuses.map((s) => statusText[s] || s).join('、')}`;
                      }

                      return (
                        <div key={itemId} className="item-row with-detail">
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
                            </div>
                          </div>
                          {issueDetail && (
                            <div className="item-issue">
                              {issueDetail}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {selectedResult.affectedItems.length > 15 && (
                      <div className="items-more">
                        ...还有 {selectedResult.affectedItems.length - 15} 个受影响序列
                      </div>
                    )}
                  </div>
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
