import { useState, useMemo } from 'react';
import { useAppStore } from '../store/appStore';
import type { ExportOptions } from '../../shared/types';
import './ExportCenter.css';

export default function ExportCenter() {
  const { getAllSeries, currentProject, patients } = useAppStore();
  const [exportFormat, setExportFormat] = useState<'csv' | 'json' | 'excel'>('csv');
  const [includeQCResults, setIncludeQCResults] = useState(true);
  const [includeThumbnails, setIncludeThumbnails] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterQC, setFilterQC] = useState<string>('all');

  const allSeries = useMemo(() => getAllSeries(), [getAllSeries]);

  const filteredSeries = useMemo(() => {
    let result = allSeries;
    if (filterStatus !== 'all') {
      result = result.filter((s) => s.enrollmentStatus === filterStatus);
    }
    if (filterQC !== 'all') {
      result = result.filter((s) => s.qcResult === filterQC);
    }
    return result;
  }, [allSeries, filterStatus, filterQC]);

  const stats = useMemo(() => {
    const statusCount: Record<string, number> = {};
    const qcCount: Record<string, number> = {};
    allSeries.forEach((s) => {
      statusCount[s.enrollmentStatus] = (statusCount[s.enrollmentStatus] || 0) + 1;
      qcCount[s.qcResult] = (qcCount[s.qcResult] || 0) + 1;
    });
    return { statusCount, qcCount };
  }, [allSeries]);

  const handleExport = async (type: 'list' | 'report') => {
    const data = type === 'list' ? generateListData() : generateReportData();
    const content = formatData(data, exportFormat);

    if (window.electronAPI) {
      const filePath = await window.electronAPI.saveDialog({
        defaultPath: type === 'list' ? `样本清单.${exportFormat}` : `质检报告.${exportFormat}`,
        filters: [
          { name: 'CSV文件', extensions: ['csv'] },
          { name: 'JSON文件', extensions: ['json'] },
          { name: 'Excel文件', extensions: ['xlsx'] },
        ],
      });
      if (filePath) {
        await window.electronAPI.writeFile(filePath, content);
        alert(`导出成功: ${filePath}`);
      }
    } else {
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = type === 'list' ? `样本清单.${exportFormat}` : `质检报告.${exportFormat}`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const generateListData = () => {
    return filteredSeries.map((series) => {
      const patient = patients.find((p) => p.id === series.patientId);
      const study = patient?.studies.find((s) => s.id === series.studyId);
      return {
        患者ID: series.patientId,
        患者姓名: patient?.patientName || '',
        研究编号: patient?.researchNumber || '',
        检查日期: study?.studyDate || '',
        序列名称: series.seriesDescription || '',
        模态: series.modality || '',
        检查部位: series.bodyPartExamined || '',
        图像数量: series.numInstances || 0,
        入组状态: getStatusText(series.enrollmentStatus),
        病种标签: series.diseaseTags.join('、'),
        质检结果: getQCText(series.qcResult),
        质检人员: series.qcReviewer || '',
        备注: series.notes || '',
        是否锁定: series.isLocked ? '是' : '否',
        脱敏检查: series.desensitizationCheck ? '通过' : '未通过',
      };
    });
  };

  const generateReportData = () => {
    const passRate =
      allSeries.length > 0
        ? ((stats.qcCount.pass || 0) / allSeries.length) * 100
        : 0;
    const enrollmentRate =
      allSeries.length > 0
        ? ((stats.statusCount.included || 0) / allSeries.length) * 100
        : 0;

    return {
      项目名称: currentProject?.name || '',
      报告生成时间: new Date().toLocaleString('zh-CN'),
      统计概览: {
        患者总数: patients.length,
        序列总数: allSeries.length,
        已入组数: stats.statusCount.included || 0,
        入组率: `${enrollmentRate.toFixed(1)}%`,
        质检通过数: stats.qcCount.pass || 0,
        质检通过率: `${passRate.toFixed(1)}%`,
        待质检数: stats.qcCount.pending || 0,
        已锁定数: allSeries.filter((s) => s.isLocked).length,
      },
      入组状态分布: stats.statusCount,
      质检结果分布: stats.qcCount,
      病种分布: getDiseaseDistribution(),
    };
  };

  const getDiseaseDistribution = () => {
    const dist: Record<string, number> = {};
    allSeries.forEach((s) => {
      s.diseaseTags.forEach((t) => {
        dist[t] = (dist[t] || 0) + 1;
      });
    });
    return dist;
  };

  const formatData = (data: any, format: string): string => {
    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    }
    if (format === 'csv') {
      if (Array.isArray(data)) {
        if (data.length === 0) return '';
        const headers = Object.keys(data[0]);
        const rows = data.map((row) =>
          headers.map((h) => `"${String(row[h] || '').replace(/"/g, '""')}"`).join(',')
        );
        return [headers.join(','), ...rows].join('\n');
      } else {
        return JSON.stringify(data, null, 2);
      }
    }
    return JSON.stringify(data, null, 2);
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

  const getQCText = (result: string): string => {
    const texts: Record<string, string> = {
      pass: '通过',
      fail: '不通过',
      pending: '待质检',
      rework: '需返工',
    };
    return texts[result] || result;
  };

  const [activeTab, setActiveTab] = useState<'list' | 'report'>('list');

  return (
    <div className="export-center">
      <div className="window-header">
        <h2>导出中心</h2>
        <div className="header-tabs">
          <button
            className={activeTab === 'list' ? 'active' : ''}
            onClick={() => setActiveTab('list')}
          >
            样本清单
          </button>
          <button
            className={activeTab === 'report' ? 'active' : ''}
            onClick={() => setActiveTab('report')}
          >
            质检报告
          </button>
        </div>
      </div>

      <div className="export-body">
        <div className="export-layout">
          <div className="export-settings">
            <div className="panel-card">
              <h3>导出设置</h3>

              <div className="setting-group">
                <label>导出格式</label>
                <div className="format-options">
                  <label className="format-option">
                    <input
                      type="radio"
                      name="format"
                      value="csv"
                      checked={exportFormat === 'csv'}
                      onChange={(e) => setExportFormat(e.target.value as any)}
                    />
                    <span className="format-icon">📄</span>
                    <span>CSV</span>
                  </label>
                  <label className="format-option">
                    <input
                      type="radio"
                      name="format"
                      value="json"
                      checked={exportFormat === 'json'}
                      onChange={(e) => setExportFormat(e.target.value as any)}
                    />
                    <span className="format-icon">📋</span>
                    <span>JSON</span>
                  </label>
                  <label className="format-option">
                    <input
                      type="radio"
                      name="format"
                      value="excel"
                      checked={exportFormat === 'excel'}
                      onChange={(e) => setExportFormat(e.target.value as any)}
                      disabled
                    />
                    <span className="format-icon">📊</span>
                    <span>Excel</span>
                    <span className="soon-badge">即将推出</span>
                  </label>
                </div>
              </div>

              <div className="setting-group">
                <label>筛选条件</label>
                <div className="filter-options">
                  <div className="filter-item">
                    <span>入组状态</span>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="form-select"
                    >
                      <option value="all">全部</option>
                      <option value="pending">待处理</option>
                      <option value="included">已入组</option>
                      <option value="excluded">已排除</option>
                      <option value="review">待复核</option>
                    </select>
                  </div>
                  <div className="filter-item">
                    <span>质检结果</span>
                    <select
                      value={filterQC}
                      onChange={(e) => setFilterQC(e.target.value)}
                      className="form-select"
                    >
                      <option value="all">全部</option>
                      <option value="pass">通过</option>
                      <option value="fail">不通过</option>
                      <option value="pending">待质检</option>
                      <option value="rework">需返工</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="setting-group">
                <label>包含内容</label>
                <div className="checkbox-options">
                  <label className="checkbox-option">
                    <input
                      type="checkbox"
                      checked={includeQCResults}
                      onChange={(e) => setIncludeQCResults(e.target.checked)}
                    />
                    <span>包含质检结果</span>
                  </label>
                  <label className="checkbox-option">
                    <input
                      type="checkbox"
                      checked={includeThumbnails}
                      onChange={(e) => setIncludeThumbnails(e.target.checked)}
                      disabled
                    />
                    <span>包含缩略图</span>
                    <span className="soon-badge">即将推出</span>
                  </label>
                </div>
              </div>

              <div className="export-preview">
                <span>将导出 <strong>{filteredSeries.length}</strong> 个序列</span>
              </div>

              <button
                className="btn btn-primary btn-block btn-large"
                onClick={() => handleExport(activeTab)}
              >
                📤 导出{activeTab === 'list' ? '样本清单' : '质检报告'}
              </button>
            </div>
          </div>

          <div className="export-preview-panel">
            {activeTab === 'list' ? (
              <div className="preview-list">
                <div className="panel-header">
                  <h3>预览 - 样本清单</h3>
                  <span className="preview-count">{filteredSeries.length} 条记录</span>
                </div>
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>患者ID</th>
                        <th>序列名称</th>
                        <th>模态</th>
                        <th>入组状态</th>
                        <th>病种标签</th>
                        <th>质检结果</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSeries.slice(0, 10).map((series) => {
                        const patient = patients.find((p) => p.id === series.patientId);
                        return (
                          <tr key={series.id}>
                            <td>{series.patientId}</td>
                            <td>{series.seriesDescription}</td>
                            <td>{series.modality}</td>
                            <td>
                              <span className="table-status">{getStatusText(series.enrollmentStatus)}</span>
                            </td>
                            <td>{series.diseaseTags.join('、') || '-'}</td>
                            <td>
                              <span className={`qc-mini qc-${series.qcResult}`}>
                                {getQCText(series.qcResult)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {filteredSeries.length > 10 && (
                    <div className="table-more">
                      显示前 10 条，共 {filteredSeries.length} 条记录
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="preview-report">
                <div className="panel-header">
                  <h3>预览 - 质检报告</h3>
                </div>
                <div className="report-content">
                  <div className="report-header">
                    <h2>{currentProject?.name || '项目'} - 质检报告</h2>
                    <p className="report-date">
                      生成时间：{new Date().toLocaleString('zh-CN')}
                    </p>
                  </div>

                  <div className="report-section">
                    <h3>📊 统计概览</h3>
                    <div className="report-stats">
                      <div className="report-stat">
                        <span className="stat-label">患者总数</span>
                        <span className="stat-value">{patients.length}</span>
                      </div>
                      <div className="report-stat">
                        <span className="stat-label">序列总数</span>
                        <span className="stat-value">{allSeries.length}</span>
                      </div>
                      <div className="report-stat">
                        <span className="stat-label">已入组</span>
                        <span className="stat-value success">
                          {stats.statusCount.included || 0}
                        </span>
                      </div>
                      <div className="report-stat">
                        <span className="stat-label">质检通过</span>
                        <span className="stat-value success">
                          {stats.qcCount.pass || 0}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="report-section">
                    <h3>📈 入组状态分布</h3>
                    <div className="distribution-bars">
                      {Object.entries(stats.statusCount).map(([status, count]) => (
                        <div key={status} className="dist-item">
                          <span className="dist-label">{getStatusText(status)}</span>
                          <div className="dist-bar">
                            <div
                              className="dist-fill"
                              style={{
                                width: `${allSeries.length > 0 ? (count / allSeries.length) * 100 : 0}%`,
                              }}
                            />
                          </div>
                          <span className="dist-count">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="report-section">
                    <h3>✅ 质检结果分布</h3>
                    <div className="distribution-bars">
                      {Object.entries(stats.qcCount).map(([result, count]) => (
                        <div key={result} className="dist-item">
                          <span className="dist-label">{getQCText(result)}</span>
                          <div className="dist-bar">
                            <div
                              className={`dist-fill qc-${result}`}
                              style={{
                                width: `${allSeries.length > 0 ? (count / allSeries.length) * 100 : 0}%`,
                              }}
                            />
                          </div>
                          <span className="dist-count">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="report-section">
                    <h3>🏷️ 病种分布</h3>
                    <div className="disease-tags">
                      {Object.entries(getDiseaseDistribution()).length > 0 ? (
                        Object.entries(getDiseaseDistribution()).map(([disease, count]) => (
                          <span key={disease} className="disease-tag-stat">
                            {disease} <strong>{count}</strong>
                          </span>
                        ))
                      ) : (
                        <p className="text-muted">暂无病种标签数据</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
