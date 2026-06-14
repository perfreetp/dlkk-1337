export type EnrollmentStatus = 'pending' | 'included' | 'excluded' | 'review';

export type QCConclusion = 'pass' | 'fail' | 'pending' | 'rework';

export type CollaborationStatus = 'unassigned' | 'in_progress' | 'needs_review' | 'done';

export interface SeriesCollaboration {
  assignee?: string;
  status: CollaborationStatus;
  lastUpdatedAt?: string;
  lastUpdatedBy?: string;
}

export interface PatientInfo {
  patientId: string;
  patientName: string;
  patientSex?: string;
  patientAge?: string;
  patientBirthDate?: string;
}

export interface StudyInfo {
  studyInstanceUid: string;
  studyDate?: string;
  studyTime?: string;
  studyDescription?: string;
  accessionNumber?: string;
  modalities?: string[];
  numSeries?: number;
}

export interface SeriesInfo {
  seriesInstanceUid: string;
  seriesNumber?: number;
  seriesDescription?: string;
  modality?: string;
  numInstances?: number;
  bodyPartExamined?: string;
  sliceThickness?: number;
  rows?: number;
  cols?: number;
  firstInstancePath?: string;
  thumbnailData?: string;
}

export interface Series extends SeriesInfo {
  id: string;
  studyId: string;
  patientId: string;
  enrollmentStatus: EnrollmentStatus;
  diseaseTags: string[];
  notes: string;
  isLocked: boolean;
  qcResult: QCConclusion;
  qcReviewer?: string;
  qcTime?: string;
  desensitizationCheck: boolean;
  missingFields: string[];
  collaboration: SeriesCollaboration;
}

export interface Study extends StudyInfo {
  id: string;
  patientId: string;
  series: Series[];
}

export interface Patient extends PatientInfo {
  id: string;
  projectId: string;
  studies: Study[];
  researchNumber?: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  rootPath?: string;
  diseaseTags: string[];
  requiredModalities: string[];
  requiredFields: string[];
}

export interface QCRule {
  id: string;
  name: string;
  type: 'desensitization' | 'completeness' | 'consistency' | 'custom';
  description: string;
  enabled: boolean;
  config?: Record<string, any>;
}

export interface QCCheckResult {
  ruleId: string;
  ruleName: string;
  passed: boolean;
  message: string;
  affectedItems?: string[];
}

export interface QCReviewRecord {
  id: string;
  seriesId: string;
  reviewer: string;
  conclusion: QCConclusion;
  comment: string;
  createdAt: string;
}

export interface ImportProgress {
  total: number;
  current: number;
  currentPath: string;
  status: 'idle' | 'scanning' | 'parsing' | 'grouping' | 'done' | 'error';
  message: string;
}

export interface ExportOptions {
  format: 'csv' | 'json' | 'excel';
  includeThumbnails: boolean;
  includeQCResults: boolean;
  filters?: {
    status?: EnrollmentStatus;
    qcResult?: QCConclusion;
  };
}
