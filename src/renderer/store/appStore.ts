import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type {
  Project,
  Patient,
  Study,
  Series,
  EnrollmentStatus,
  QCConclusion,
  QCRule,
  QCCheckResult,
  QCReviewRecord,
  ImportProgress,
} from '../../shared/types';

interface AppState {
  currentProject: Project | null;
  projects: Project[];
  patients: Patient[];
  selectedPatientId: string | null;
  selectedStudyId: string | null;
  selectedSeriesIds: string[];
  importProgress: ImportProgress;
  qcRules: QCRule[];
  qcResults: QCCheckResult[];
  reviewRecords: QCReviewRecord[];
  currentView: string;
  searchQuery: string;
  filterStatus: EnrollmentStatus | 'all';
  sortBy: string;

  setCurrentView: (view: string) => void;
  createProject: (name: string, description?: string) => void;
  loadProject: (projectId: string) => void;
  setCurrentProject: (project: Project | null) => void;

  addPatients: (patients: Patient[]) => void;
  importAndGenerateData: (folderCount: number, startIndex?: number) => Patient[];
  updatePatient: (patientId: string, updates: Partial<Patient>) => void;
  setSelectedPatient: (patientId: string | null) => void;
  clearSelectedPatient: () => void;
  setSelectedStudy: (studyId: string | null) => void;
  toggleSelectSeries: (seriesId: string) => void;
  selectAllSeries: () => void;
  clearSelection: () => void;

  updateSeries: (seriesId: string, updates: Partial<Series>) => void;
  batchUpdateSeries: (seriesIds: string[], updates: Partial<Series>) => void;
  setEnrollmentStatus: (seriesId: string, status: EnrollmentStatus) => void;
  addDiseaseTag: (seriesId: string, tag: string) => void;
  removeDiseaseTag: (seriesId: string, tag: string) => void;
  setNotes: (seriesId: string, notes: string) => void;

  setImportProgress: (progress: Partial<ImportProgress>) => void;

  runQCCheck: () => void;
  toggleRule: (ruleId: string) => void;
  addRule: (rule: QCRule) => void;

  sampleForReview: (count: number) => string[];
  setQCConclusion: (seriesId: string, conclusion: QCConclusion, reviewer: string, comment?: string) => void;
  lockSeries: (seriesId: string) => void;
  unlockSeries: (seriesId: string) => void;

  setSearchQuery: (query: string) => void;
  setFilterStatus: (status: EnrollmentStatus | 'all') => void;
  setSortBy: (sortBy: string) => void;

  getFilteredSeries: () => Series[];
  getAllSeries: () => Series[];
}

const defaultQCRules: QCRule[] = [
  {
    id: 'rule-1',
    name: '患者信息脱敏检查',
    type: 'desensitization',
    description: '检查患者姓名、ID等敏感信息是否已脱敏',
    enabled: true,
  },
  {
    id: 'rule-2',
    name: '序列完整性检查',
    type: 'completeness',
    description: '检查必要序列是否齐全',
    enabled: true,
    config: { requiredModalities: ['CT', 'MRI'] },
  },
  {
    id: 'rule-3',
    name: '字段完整性检查',
    type: 'completeness',
    description: '检查必填字段是否已填写',
    enabled: true,
    config: { requiredFields: ['studyDescription', 'seriesDescription'] },
  },
  {
    id: 'rule-4',
    name: '入组标签一致性',
    type: 'consistency',
    description: '检查同一患者的入组状态是否一致',
    enabled: false,
  },
];

const mockProjects: Project[] = [
  {
    id: 'proj-1',
    name: '肺癌影像研究',
    description: '多中心肺癌CT影像数据入组质检项目',
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-03-20T14:45:00Z',
    diseaseTags: ['肺癌', '肺结节', '肺炎', '正常'],
    requiredModalities: ['CT'],
    requiredFields: ['studyDescription', 'seriesDescription', 'patientSex'],
  },
  {
    id: 'proj-2',
    name: '脑部MRI研究',
    description: '脑部磁共振影像数据整理项目',
    createdAt: '2024-02-10T08:00:00Z',
    updatedAt: '2024-03-18T11:20:00Z',
    diseaseTags: ['脑肿瘤', '脑卒中', '正常'],
    requiredModalities: ['MRI'],
    requiredFields: ['studyDescription', 'seriesDescription'],
  },
];

const generateMockData = (count: number = 12, startIndex: number = 1): Patient[] => {
  const patients: Patient[] = [];
  const diseases = ['肺癌', '肺结节', '肺炎', '正常'];
  const statuses: EnrollmentStatus[] = ['pending', 'included', 'excluded', 'review'];
  const qcResults: QCConclusion[] = ['pass', 'fail', 'pending', 'rework'];

  for (let i = startIndex; i < startIndex + count; i++) {
    const patientId = `PAT${String(i).padStart(4, '0')}`;
    const patient: Patient = {
      id: patientId,
      projectId: 'proj-1',
      patientId: patientId,
      patientName: `患者${i}`,
      patientSex: i % 2 === 0 ? 'M' : 'F',
      patientAge: `${30 + i * 4}Y`,
      patientBirthDate: `19${90 - i}-0${(i % 9) + 1}-${(i % 28) + 1}`,
      researchNumber: `RN-${String(i).padStart(3, '0')}`,
      studies: [],
    };

    for (let j = 1; j <= (i % 3) + 1; j++) {
      const studyId = `${patientId}-S${j}`;
      const study: Study = {
        id: studyId,
        patientId: patient.id,
        studyInstanceUid: `1.2.840.113619.2.${i}.${j}.${Date.now()}`,
        studyDate: `2024-0${j}-${(i % 28) + 1}`,
        studyTime: `1${j}:${(i * 5) % 60}:00`,
        studyDescription: j === 1 ? '胸部CT平扫' : '胸部增强CT',
        accessionNumber: `ACC${String(i * 10 + j).padStart(6, '0')}`,
        modalities: ['CT'],
        numSeries: 3,
        series: [],
      };

      const seriesDescriptions = [
        '肺窗薄层',
        '纵隔窗',
        '骨窗',
      ];

      for (let k = 1; k <= 3; k++) {
        const seriesId = `${studyId}-SER${k}`;
        const randomDisease = diseases[(i + k) % diseases.length];
        const series: Series = {
          id: seriesId,
          studyId: study.id,
          patientId: patient.id,
          seriesInstanceUid: `1.2.840.113619.2.${i}.${j}.${k}.${Date.now()}`,
          seriesNumber: k,
          seriesDescription: seriesDescriptions[k - 1],
          modality: 'CT',
          numInstances: 100 + k * 20 + i * 2,
          bodyPartExamined: 'Chest',
          sliceThickness: 1.25,
          rows: 512,
          cols: 512,
          enrollmentStatus: statuses[(i + k) % statuses.length],
          diseaseTags: k === 1 ? [randomDisease] : [],
          notes: '',
          isLocked: (i + k) % 5 === 0,
          qcResult: qcResults[(i + k) % qcResults.length],
          qcReviewer: (i + k) % 3 === 0 ? '张医生' : undefined,
          qcTime: (i + k) % 3 === 0 ? '2024-03-15T10:00:00Z' : undefined,
          desensitizationCheck: (i + k) % 4 !== 0,
          missingFields: (i + k) % 4 === 0 ? ['patientBirthDate'] : [],
        };
        study.series.push(series);
      }

      patient.studies.push(study);
    }

    patients.push(patient);
  }

  return patients;
};

export const useAppStore = create<AppState>((set, get) => ({
  currentProject: null,
  projects: mockProjects,
  patients: [],
  selectedPatientId: null,
  selectedStudyId: null,
  selectedSeriesIds: [],
  importProgress: {
    total: 0,
    current: 0,
    currentPath: '',
    status: 'idle',
    message: '',
  },
  qcRules: defaultQCRules,
  qcResults: [],
  reviewRecords: [],
  currentView: 'project',
  searchQuery: '',
  filterStatus: 'all',
  sortBy: 'patientId',

  setCurrentView: (view) => set({ currentView: view }),

  createProject: (name, description) => {
    const newProject: Project = {
      id: uuidv4(),
      name,
      description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      diseaseTags: [],
      requiredModalities: [],
      requiredFields: [],
    };
    set((state) => ({
      projects: [...state.projects, newProject],
      currentProject: newProject,
      patients: [],
    }));
  },

  loadProject: (projectId) => {
    const project = get().projects.find((p) => p.id === projectId);
    if (project) {
      const mockPatients = generateMockData();
      set({
        currentProject: project,
        patients: mockPatients,
        selectedPatientId: null,
        selectedStudyId: null,
        selectedSeriesIds: [],
        currentView: 'series',
      });
    }
  },

  setCurrentProject: (project) => set({ currentProject: project }),

  addPatients: (newPatients) => {
    set((state) => {
      const existingIds = new Set(state.patients.map((p) => p.id));
      const toAdd = newPatients.filter((p) => !existingIds.has(p.id));
      return { patients: [...state.patients, ...toAdd] };
    });
  },

  importAndGenerateData: (folderCount, startIndex = 1) => {
    const state = get();
    const patientCount = Math.min(folderCount * 2, 8);
    const newPatients = generateMockData(patientCount, startIndex);
    const existingIds = new Set(state.patients.map((p) => p.id));
    const toAdd = newPatients.filter((p) => !existingIds.has(p.id));
    set((state) => ({ patients: [...state.patients, ...toAdd] }));
    return toAdd;
  },

  updatePatient: (patientId, updates) => {
    set((state) => ({
      patients: state.patients.map((p) =>
        p.id === patientId ? { ...p, ...updates } : p
      ),
    }));
  },

  setSelectedPatient: (patientId) =>
    set({ selectedPatientId: patientId, selectedStudyId: null, selectedSeriesIds: [] }),

  clearSelectedPatient: () =>
    set({ selectedPatientId: null, selectedStudyId: null, selectedSeriesIds: [] }),

  setSelectedStudy: (studyId) =>
    set({ selectedStudyId: studyId, selectedSeriesIds: [] }),

  toggleSelectSeries: (seriesId) => {
    set((state) => ({
      selectedSeriesIds: state.selectedSeriesIds.includes(seriesId)
        ? state.selectedSeriesIds.filter((id) => id !== seriesId)
        : [...state.selectedSeriesIds, seriesId],
    }));
  },

  selectAllSeries: () => {
    const allSeries = get().getFilteredSeries();
    set({ selectedSeriesIds: allSeries.map((s) => s.id) });
  },

  clearSelection: () => set({ selectedSeriesIds: [] }),

  updateSeries: (seriesId, updates) => {
    set((state) => ({
      patients: state.patients.map((patient) => ({
        ...patient,
        studies: patient.studies.map((study) => ({
          ...study,
          series: study.series.map((series) =>
            series.id === seriesId ? { ...series, ...updates } : series
          ),
        })),
      })),
    }));
  },

  batchUpdateSeries: (seriesIds, updates) => {
    set((state) => ({
      patients: state.patients.map((patient) => ({
        ...patient,
        studies: patient.studies.map((study) => ({
          ...study,
          series: study.series.map((series) =>
            seriesIds.includes(series.id) ? { ...series, ...updates } : series
          ),
        })),
      })),
    }));
  },

  setEnrollmentStatus: (seriesId, status) => {
    get().updateSeries(seriesId, { enrollmentStatus: status });
  },

  addDiseaseTag: (seriesId, tag) => {
    const series = get()
      .getAllSeries()
      .find((s) => s.id === seriesId);
    if (series && !series.diseaseTags.includes(tag)) {
      get().updateSeries(seriesId, { diseaseTags: [...series.diseaseTags, tag] });
    }
  },

  removeDiseaseTag: (seriesId, tag) => {
    const series = get()
      .getAllSeries()
      .find((s) => s.id === seriesId);
    if (series) {
      get().updateSeries(seriesId, {
        diseaseTags: series.diseaseTags.filter((t) => t !== tag),
      });
    }
  },

  setNotes: (seriesId, notes) => {
    get().updateSeries(seriesId, { notes });
  },

  setImportProgress: (progress) => {
    set((state) => ({
      importProgress: { ...state.importProgress, ...progress },
    }));
  },

  runQCCheck: () => {
    const state = get();
    const allSeries = state.getAllSeries();
    const enabledRules = state.qcRules.filter((r) => r.enabled);
    const enabledRuleIds = new Set(enabledRules.map((r) => r.id));
    const results: QCCheckResult[] = [];

    if (enabledRuleIds.has('rule-1')) {
      const desensitizationFails = allSeries.filter((s) => !s.desensitizationCheck);
      const patientNames = desensitizationFails.map((s) => {
        const patient = state.patients.find((p) => p.id === s.patientId);
        return patient ? `${patient.patientName} (${s.patientId})` : s.patientId;
      });
      results.push({
        ruleId: 'rule-1',
        ruleName: '患者信息脱敏检查',
        passed: desensitizationFails.length === 0,
        message:
          desensitizationFails.length === 0
            ? '所有序列脱敏检查通过'
            : `发现 ${desensitizationFails.length} 个序列脱敏不完整：${patientNames.slice(0, 3).join('、')}${patientNames.length > 3 ? '...' : ''}`,
        affectedItems: desensitizationFails.map((s) => s.id),
      });
    }

    if (enabledRuleIds.has('rule-3')) {
      const completenessFails = allSeries.filter((s) => s.missingFields.length > 0);
      const details = completenessFails.map((s) => {
        const patient = state.patients.find((p) => p.id === s.patientId);
        const patientName = patient ? patient.patientName : s.patientId;
        return `${patientName} - ${s.seriesDescription} 缺少: ${s.missingFields.join('、')}`;
      });
      results.push({
        ruleId: 'rule-3',
        ruleName: '字段完整性检查',
        passed: completenessFails.length === 0,
        message:
          completenessFails.length === 0
            ? '所有字段填写完整'
            : `发现 ${completenessFails.length} 个序列存在缺失字段：${details.slice(0, 2).join('；')}${details.length > 2 ? '...' : ''}`,
        affectedItems: completenessFails.map((s) => s.id),
      });
    }

    if (enabledRuleIds.has('rule-2')) {
      const missingSeriesStudies: string[] = [];
      const affectedSeriesIds: string[] = [];
      state.patients.forEach((p) => {
        p.studies.forEach((study) => {
          if (study.series.length < 3) {
            missingSeriesStudies.push(`${p.patientName} - ${study.studyDescription} (仅${study.series.length}个序列)`);
            study.series.forEach((s) => affectedSeriesIds.push(s.id));
          }
        });
      });
      results.push({
        ruleId: 'rule-2',
        ruleName: '序列完整性检查',
        passed: missingSeriesStudies.length === 0,
        message:
          missingSeriesStudies.length === 0
            ? '所有检查序列齐全'
            : `发现 ${missingSeriesStudies.length} 个检查存在序列缺失：${missingSeriesStudies.slice(0, 2).join('；')}${missingSeriesStudies.length > 2 ? '...' : ''}`,
        affectedItems: affectedSeriesIds,
      });
    }

    if (enabledRuleIds.has('rule-4')) {
      const inconsistentPatients: string[] = [];
      const affectedSeriesIds: string[] = [];
      state.patients.forEach((patient) => {
        const patientSeries = allSeries.filter((s) => s.patientId === patient.id);
        if (patientSeries.length > 0) {
          const firstStatus = patientSeries[0].enrollmentStatus;
          const hasInconsistent = patientSeries.some((s) => s.enrollmentStatus !== firstStatus);
          if (hasInconsistent) {
            const statusMap = new Map<string, number>();
            patientSeries.forEach((s) => {
              statusMap.set(s.enrollmentStatus, (statusMap.get(s.enrollmentStatus) || 0) + 1);
            });
            const statusDetails = Array.from(statusMap.entries())
              .map(([status, count]) => {
                const statusText: Record<string, string> = {
                  pending: '待处理',
                  included: '已入组',
                  excluded: '已排除',
                  review: '待复核',
                };
                return `${statusText[status] || status}(${count}个)`;
              })
              .join('、');
            inconsistentPatients.push(`${patient.patientName} (${patient.patientId}): ${statusDetails}`);
            patientSeries.forEach((s) => affectedSeriesIds.push(s.id));
          }
        }
      });
      results.push({
        ruleId: 'rule-4',
        ruleName: '入组状态一致性',
        passed: inconsistentPatients.length === 0,
        message:
          inconsistentPatients.length === 0
            ? '所有患者入组状态一致'
            : `发现 ${inconsistentPatients.length} 位患者入组状态不一致：${inconsistentPatients.slice(0, 2).join('；')}${inconsistentPatients.length > 2 ? '...' : ''}`,
        affectedItems: affectedSeriesIds,
      });
    }

    set({ qcResults: results });
  },

  toggleRule: (ruleId) => {
    set((state) => ({
      qcRules: state.qcRules.map((rule) =>
        rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule
      ),
    }));
  },

  addRule: (rule) => {
    set((state) => ({ qcRules: [...state.qcRules, rule] }));
  },

  sampleForReview: (count) => {
    const allSeries = get()
      .getAllSeries()
      .filter((s) => !s.isLocked);
    const shuffled = [...allSeries].sort(() => Math.random() - 0.5);
    const sampled = shuffled.slice(0, Math.min(count, shuffled.length));
    return sampled.map((s) => s.id);
  },

  setQCConclusion: (seriesId, conclusion, reviewer, comment) => {
    const record: QCReviewRecord = {
      id: uuidv4(),
      seriesId,
      reviewer,
      conclusion,
      comment: comment || '',
      createdAt: new Date().toISOString(),
    };
    set((state) => ({
      reviewRecords: [...state.reviewRecords, record],
    }));
    get().updateSeries(seriesId, {
      qcResult: conclusion,
      qcReviewer: reviewer,
      qcTime: new Date().toISOString(),
    });
  },

  lockSeries: (seriesId) => {
    get().updateSeries(seriesId, { isLocked: true });
  },

  unlockSeries: (seriesId) => {
    get().updateSeries(seriesId, { isLocked: false });
  },

  setSearchQuery: (query) => set({ searchQuery: query }),
  setFilterStatus: (status) => set({ filterStatus: status }),
  setSortBy: (sortBy) => set({ sortBy }),

  getFilteredSeries: () => {
    const state = get();
    let series = state.getAllSeries();

    if (state.selectedPatientId) {
      series = series.filter((s) => s.patientId === state.selectedPatientId);
    }

    if (state.searchQuery) {
      const query = state.searchQuery.toLowerCase();
      series = series.filter(
        (s) =>
          s.seriesDescription?.toLowerCase().includes(query) ||
          s.patientId.toLowerCase().includes(query) ||
          s.diseaseTags.some((t) => t.toLowerCase().includes(query))
      );
    }

    if (state.filterStatus !== 'all') {
      series = series.filter((s) => s.enrollmentStatus === state.filterStatus);
    }

    return series;
  },

  getAllSeries: () => {
    const state = get();
    const allSeries: Series[] = [];
    state.patients.forEach((p) => {
      p.studies.forEach((study) => {
        study.series.forEach((series) => {
          allSeries.push(series);
        });
      });
    });
    return allSeries;
  },
}));
