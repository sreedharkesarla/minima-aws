import axios from 'axios';
import { FileMetadata, ProcessingJob, AuditEvent } from '../types';

// Type assertion for Vite environment variables
const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const uploadFile = async (
  userId: string,
  file: File,
  metadata: {
    documentType: string;
    sensitivity: string;
    tags: string[];
  }
): Promise<FileMetadata> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('metadata', JSON.stringify(metadata));

  const response = await axios.post(`${API_BASE_URL}/upload/upload_file/${userId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return response.data;
};

export const getFiles = async (userId: string): Promise<FileMetadata[]> => {
  const response = await api.get(`/upload/get_files/${userId}`);
  return response.data;
};

export const deleteFile = async (userId: string, fileId: string): Promise<void> => {
  await api.delete(`/upload/delete_file/${userId}/${fileId}`);
};

export const getProcessingQueue = async (
  userId: string,
  _filter?: { status?: string; search?: string }
): Promise<ProcessingJob[]> => {
  // Mock data for now - replace with actual API call
  return [
    {
      jobId: '1',
      fileId: 'abc123',
      filename: 'contract_2024.pdf',
      status: 'running',
      progress: 45,
      owner: userId,
      startedAt: new Date(Date.now() - 120000).toISOString(),
      events: [],
    },
    {
      jobId: '2',
      fileId: 'def456',
      filename: 'invoice_march.pdf',
      status: 'succeeded',
      progress: 100,
      owner: userId,
      startedAt: new Date(Date.now() - 300000).toISOString(),
      completedAt: new Date(Date.now() - 60000).toISOString(),
      events: [],
    },
  ];
};

export const getAuditLogs = async (_filter?: {
  userId?: string;
  action?: string;
  from?: string;
  to?: string;
}): Promise<AuditEvent[]> => {
  // Mock data - replace with actual API call
  return [];
};

export default api;
