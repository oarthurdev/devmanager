import { createClient } from './supabase/client';
import React from 'react';
import {
    Clock,
    MessageSquare,
    FileText,
    CheckCircle2,
    Calendar,
    Settings,
    Upload,
    Download,
    FileX
  } from "lucide-react"
import { getAuthenticatedUser } from './auth_utils';

interface ActivityMetadata {
  [key: string]: any;
}

export const createActivity = async (
  type: string,
  description: string,
  projectId: string,
  metadata?: ActivityMetadata
) => {
  const supabase = createClient();

  const { user, error } = await getAuthenticatedUser();

  if (error || !user) {
      console.error('User not authenticated:', error);
      throw new Error('User not authenticated');
  }

  const userId = user.id;

  try {
    const { data, error } = await supabase
      .from('project_activities')
      .insert([
        {
          type,
          description,
          project_id: projectId,
          user_id: userId,
          metadata
        }
      ]);

    if (error) {
      throw new Error(error.message);
    }

    console.log('Activity created:', data);
    return data; // Retorna a atividade criada, caso precise
  } catch (error) {
    console.error('Error creating activity:', error);
    throw error; // Lança o erro para ser tratado em outro lugar
  }
};

export const getActivityIcon = (type: string) => {
    switch (type) {
      case "comment":
        return React.createElement(MessageSquare, { className: "w-5 h-5" });
      case "status_change":
        return React.createElement(Settings, { className: "w-5 h-5" });
      case "file_upload":
        return React.createElement(Upload, { className: "w-5 h-5" });
      case "file_download":
        return React.createElement(Download, { className: "w-5 h-5" });
      case "file_delete":
        return React.createElement(FileX, { className: "w-5 h-5" });
      case "task_complete":
        return React.createElement(CheckCircle2, { className: "w-5 h-5" });
      case "task_create":
        return React.createElement(FileText, { className: "w-5 h-5" });
      case "deadline_update":
        return React.createElement(Calendar, { className: "w-5 h-5" });
      default:
        return React.createElement(Clock, { className: "w-5 h-5" });
    }
}