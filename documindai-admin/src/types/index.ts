export interface User {
  userId: string;
  username: string;
  email?: string;
  roles: string[];
  isActive: boolean;
  createdAt: string;
}

export interface Role {
  id: number;
  roleName: string;
  description: string;
  permissions: string[];
}

export interface FileMetadata {
  fileId: string;
  filename: string;
  status: 'uploaded' | 'validating' | 'queued' | 'processing' | 'indexed' | 'failed';
  userId: string;
  documentType?: string;
  sensitivity?: 'public' | 'internal' | 'confidential';
  tags?: string[];
  fileSize?: number;
  s3Path?: string;
  createdAt: string;
  updatedAt?: string;
  validatedAt?: string;
  validationErrors?: Array<{ field: string; message: string }>;
  retryCount?: number;
  lastRetryAt?: string;
}

export interface ProcessingJob {
  jobId: string;
  fileId: string;
  filename: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'retry';
  progress: number;
  owner: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  events: JobEvent[];
}

export interface JobEvent {
  id: string;
  timestamp: string;
  type: 'started' | 'progress' | 'completed' | 'failed' | 'retry';
  message: string;
  details?: unknown;
}

export interface UploadProgress {
  fileId: string;
  filename: string;
  progress: number;
  status: 'pending' | 'uploading' | 'processing' | 'complete' | 'error';
  error?: string;
}

export interface Notification {
  id: string;
  message: string;
  severity: 'success' | 'error' | 'warning' | 'info';
  timestamp: string;
}
