import axios from 'axios';
import { FileMetadata, ProcessingJob } from '../types';

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
  metadata?: {
    documentType: string;
    sensitivity: string;
    tags: string[];
  }
): Promise<FileMetadata> => {
  const formData = new FormData();
  formData.append('files', file);

  // Build URL with query parameters
  let url = `${API_BASE_URL}/upload/upload_files/?user_id=${userId}`;
  if (metadata?.documentType) {
    url += `&document_type=${encodeURIComponent(metadata.documentType)}`;
  }

  const response = await axios.post(url, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return response.data.files[0];
};

export const getDocumentTypes = async (): Promise<string[]> => {
  const response = await api.get('/upload/document_types');
  return response.data.document_types;
};

export const getFiles = async (userId: string): Promise<FileMetadata[]> => {
  const response = await api.get(`/upload/get_files/${userId}`);
  // Transform backend snake_case to frontend camelCase
  return response.data.map((file: any) => ({
    fileId: file.file_id,
    filename: file.file_name,
    status: file.status,
    userId: file.user_id,
    createdAt: file.created_at || new Date().toISOString(),
    s3Path: file.file_name,
  }));
};

export const deleteFile = async (userId: string, fileId: string): Promise<void> => {
  await api.post(`/upload/remove_file/`, {
    file_ids: [fileId],
    user_id: userId,
  });
};

export const getProcessingQueue = async (
  userId: string,
  _filter?: { status?: string; search?: string }
): Promise<ProcessingJob[]> => {
  // Get actual files from the backend
  const files = await getFiles(userId);
  
  // Transform to ProcessingJob format
  return files.map((file) => ({
    jobId: file.fileId,
    fileId: file.fileId,
    filename: file.filename,
    status: file.status === 'indexed' ? 'succeeded' : 
            file.status === 'uploaded' ? 'queued' : 
            file.status === 'failed' ? 'failed' : 'running',
    progress: file.status === 'indexed' ? 100 : 
              file.status === 'uploaded' ? 0 : 50,
    owner: userId,
    startedAt: file.createdAt,
    completedAt: file.status === 'indexed' ? file.updatedAt || file.createdAt : undefined,
    events: [],
  }));
};

export const getQdrantCollections = async (): Promise<any> => {
  try {
    const response = await axios.get('http://localhost:6333/collections');
    const collections = response.data.result?.collections || [];
    
    // Fetch detailed info for each collection to get points_count
    const detailedCollections = await Promise.all(
      collections.map(async (collection: any) => {
        try {
          const detailResponse = await axios.get(`http://localhost:6333/collections/${collection.name}`);
          return {
            name: collection.name,
            points_count: detailResponse.data.result?.points_count || 0,
            status: detailResponse.data.result?.status || 'unknown',
          };
        } catch (error) {
          console.error(`Failed to fetch details for collection ${collection.name}:`, error);
          return {
            name: collection.name,
            points_count: 0,
            status: 'error',
          };
        }
      })
    );
    
    return detailedCollections;
  } catch (error) {
    console.error('Failed to fetch Qdrant collections:', error);
    return [];
  }
};

export const getUsers = async (): Promise<any[]> => {
  try {
    const response = await api.get('/upload/users');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch users:', error);
    return [];
  }
};

export const getRoles = async (): Promise<any[]> => {
  try {
    const response = await api.get('/upload/roles');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch roles:', error);
    return [];
  }
};

export const getSystemHealth = async (): Promise<any> => {
  try {
    const response = await api.get('/upload/health/system');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch system health:', error);
    throw error;
  }
};

export const getSystemSettings = async (): Promise<any> => {
  try {
    const response = await api.get('/upload/settings/system');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch system settings:', error);
    throw error;
  }
};

export const getUsageStats = async (userId: string, days: number = 30): Promise<any> => {
  try {
    const response = await api.get(`/upload/usage/${userId}?days=${days}`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch usage stats:', error);
    throw error;
  }
};

export const getDailyUsage = async (userId: string, days: number = 30): Promise<any> => {
  try {
    const response = await api.get(`/upload/usage/${userId}/daily?days=${days}`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch daily usage:', error);
    throw error;
  }
};

// ==================== USER MANAGEMENT ====================

export const createUser = async (userData: {
  username: string;
  password: string;
  email: string;
  full_name: string;
  is_active?: boolean;
  is_superuser?: boolean;
  role_ids?: number[];
}): Promise<any> => {
  try {
    const response = await api.post('/upload/users/create', userData);
    return response.data;
  } catch (error) {
    console.error('Failed to create user:', error);
    throw error;
  }
};

// ==================== LOGGING ====================

export const getApiRequestLogs = async (limit: number = 100, service?: string): Promise<any[]> => {
  try {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    if (service) params.append('service', service);
    
    const response = await api.get(`/upload/logs/api-requests?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch API request logs:', error);
    return [];
  }
};

export const getApplicationLogs = async (limit: number = 100, service?: string): Promise<any[]> => {
  try {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    if (service) params.append('service', service);
    
    const response = await api.get(`/upload/logs/application?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch application logs:', error);
    return [];
  }
};

export const getAuditLogs = async (limit: number = 100): Promise<any[]> => {
  try {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    
    const response = await api.get(`/upload/logs/audit?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch audit logs:', error);
    return [];
  }
};

export const updateUser = async (userId: string, userData: {
  email?: string;
  full_name?: string;
  is_active?: boolean;
  is_superuser?: boolean;
  role_ids?: number[];
}): Promise<any> => {
  try {
    const response = await api.put(`/upload/users/${userId}`, userData);
    return response.data;
  } catch (error) {
    console.error('Failed to update user:', error);
    throw error;
  }
};

export const deleteUser = async (userId: string, permanent: boolean = false): Promise<any> => {
  try {
    const response = await api.delete(`/upload/users/${userId}?permanent=${permanent}`);
    return response.data;
  } catch (error) {
    console.error('Failed to delete user:', error);
    throw error;
  }
};

export const resetPassword = async (userId: string, newPassword: string): Promise<any> => {
  try {
    const response = await api.post(`/upload/users/${userId}/reset-password`, {
      new_password: newPassword
    });
    return response.data;
  } catch (error) {
    console.error('Failed to reset password:', error);
    throw error;
  }
};

// ==================== ROLE MANAGEMENT ====================

export const createRole = async (roleData: {
  role_name: string;
  description: string;
  permissions?: string[];
}): Promise<any> => {
  try {
    const response = await api.post('/upload/roles/create', roleData);
    return response.data;
  } catch (error) {
    console.error('Failed to create role:', error);
    throw error;
  }
};

export const updateRole = async (roleId: number, roleData: {
  role_name?: string;
  description?: string;
  is_active?: boolean;
  permissions?: string[];
}): Promise<any> => {
  try {
    const response = await api.put(`/upload/roles/${roleId}`, roleData);
    return response.data;
  } catch (error) {
    console.error('Failed to update role:', error);
    throw error;
  }
};

export const deleteRole = async (roleId: number, permanent: boolean = false): Promise<any> => {
  try {
    const response = await api.delete(`/upload/roles/${roleId}?permanent=${permanent}`);
    return response.data;
  } catch (error) {
    console.error('Failed to delete role:', error);
    throw error;
  }
};

export const getPermissions = async (): Promise<any> => {
  try {
    const response = await api.get('/upload/permissions');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch permissions:', error);
    throw error;
  }
};

export default api;
