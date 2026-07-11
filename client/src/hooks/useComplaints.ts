/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useCallback } from 'react';
import api from '@/lib/api';

export interface ComplaintUser {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  flat_no: string;
  role: string;
}

export interface StatusHistoryEntry {
  status: 'open' | 'in-progress' | 'resolved';
  actor: {
    _id: string;
    name: string;
    role: string;
  };
  note: string;
  timestamp: string;
}

export interface Complaint {
  _id: string;
  user_id: ComplaintUser;
  flat_no: string;
  category: string;
  description: string;
  image_url: string | null;
  status: 'open' | 'in-progress' | 'resolved';
  priority: 'low' | 'medium' | 'high';
  is_overdue?: boolean;
  admin_notes: string | null;
  resolved_by: ComplaintUser | null;
  status_history: StatusHistoryEntry[];
  created_at: string;
  updated_at: string;
}

export interface Notice {
  _id: string;
  title: string;
  content: string;
  is_important: boolean;
  created_by: {
    _id: string;
    name: string;
    role: string;
  };
  created_at: string;
  updated_at: string;
}

export interface SettingsData {
  overdue_threshold_days: number;
}

export interface ComplaintsResponse {
  success: boolean;
  data: Complaint[];
  pagination: {
    current: number;
    pages: number;
    total: number;
    limit: number;
  };
}

export interface AdminComplaintsResponse extends ComplaintsResponse {
  stats: {
    open: number;
    'in-progress': number;
    resolved: number;
    categories: Record<string, number>;
    overdue: number;
  };
}

export interface UploadUrlResponse {
  success: boolean;
  data: {
    token: string;
    expire: number;
    signature: string;
    publicKey: string;
    urlEndpoint: string;
  };
}

export function useComplaints() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get user's complaints
  const getMyComplaints = useCallback(async (
    page = 1,
    limit = 10,
    status?: string
  ): Promise<ComplaintsResponse> => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (status) params.append('status', status);
      
      const response = await api.get(`/complaints?${params}`);
      return response.data;
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to fetch complaints';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Get all complaints (admin only)
  const getAllComplaints = useCallback(async (
    page = 1,
    limit = 10,
    status?: string,
    category?: string,
    date?: string
  ): Promise<AdminComplaintsResponse> => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (status) params.append('status', status);
      if (category) params.append('category', category);
      if (date) params.append('date', date);
      
      const response = await api.get(`/complaints/all?${params}`);
      return response.data;
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to fetch complaints';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Get complaint by ID
  const getComplaintById = useCallback(async (id: string): Promise<{ success: boolean; data: Complaint }> => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/complaints/${id}`);
      return response.data;
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to fetch complaint';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Create a new complaint
  const createComplaint = useCallback(async (
    description: string,
    category: string,
    imageUrl?: string
  ): Promise<{ success: boolean; data: Complaint; message: string }> => {
    setLoading(true);
    setError(null);
    try {
      const payload: { description: string; category: string; image_url?: string } = {
        description,
        category,
      };
      if (imageUrl) payload.image_url = imageUrl;
      
      const response = await api.post('/complaints', payload);
      return response.data;
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to create complaint';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Update complaint status (admin only)
  const updateComplaintStatus = useCallback(async (
    id: string,
    status: 'open' | 'in-progress' | 'resolved',
    adminNotes?: string
  ): Promise<{ success: boolean; data: Complaint; message: string }> => {
    setLoading(true);
    setError(null);
    try {
      const payload: { status: string; admin_notes?: string } = { status };
      if (adminNotes) payload.admin_notes = adminNotes;
      
      const response = await api.put(`/complaints/${id}/status`, payload);
      return response.data;
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to update complaint status';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Update complaint priority (admin only)
  const updateComplaintPriority = useCallback(async (
    id: string,
    priority: 'low' | 'medium' | 'high'
  ): Promise<{ success: boolean; data: Complaint; message: string }> => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.put(`/complaints/${id}/priority`, { priority });
      return response.data;
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to update complaint priority';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Notice board functions
  const getNotices = useCallback(async (): Promise<{ success: boolean; data: Notice[] }> => {
    setLoading(true);
    try {
      const response = await api.get('/notices');
      return response.data;
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to fetch notices';
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const createNotice = useCallback(async (
    title: string,
    content: string,
    isImportant: boolean
  ): Promise<{ success: boolean; data: Notice; message: string }> => {
    setLoading(true);
    try {
      const response = await api.post('/notices', { title, content, is_important: isImportant });
      return response.data;
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to create notice';
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteNotice = useCallback(async (id: string): Promise<{ success: boolean; message: string }> => {
    setLoading(true);
    try {
      const response = await api.delete(`/notices/${id}`);
      return response.data;
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to delete notice';
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Settings functions
  const getSettings = useCallback(async (): Promise<{ success: boolean; data: SettingsData }> => {
    setLoading(true);
    try {
      const response = await api.get('/settings');
      return response.data;
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to fetch settings';
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSetting = useCallback(async (
    key: string,
    value: any
  ): Promise<{ success: boolean; message: string }> => {
    setLoading(true);
    try {
      const response = await api.put('/settings', { key, value });
      return response.data;
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to update setting';
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Get upload URL for ImageKit
  const getUploadUrl = useCallback(async (): Promise<UploadUrlResponse> => {
    setError(null);
    try {
      const response = await api.post('/complaints/upload-url');
      return response.data;
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to get upload URL';
      setError(message);
      throw new Error(message);
    }
  }, []);

  // Upload image to ImageKit
  const uploadImage = useCallback(async (file: File): Promise<string> => {
    try {
      const { data: authParams } = await getUploadUrl();
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('publicKey', authParams.publicKey);
      formData.append('signature', authParams.signature);
      formData.append('expire', String(authParams.expire));
      formData.append('token', authParams.token);
      formData.append('fileName', `complaint_${Date.now()}_${file.name}`);
      formData.append('folder', '/complaints');
      
      const response = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to upload image');
      }
      
      const data = await response.json();
      return data.url;
    } catch (err: any) {
      const message = err.message || 'Failed to upload image';
      setError(message);
      throw new Error(message);
    }
  }, [getUploadUrl]);

  return {
    loading,
    error,
    getMyComplaints,
    getAllComplaints,
    getComplaintById,
    createComplaint,
    updateComplaintStatus,
    updateComplaintPriority,
    getNotices,
    createNotice,
    deleteNotice,
    getSettings,
    updateSetting,
    getUploadUrl,
    uploadImage,
  };
}
