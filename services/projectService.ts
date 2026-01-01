import { supabase } from '../lib/supabaseClient';
import { ProjectState } from '../types';

const LOCAL_STORAGE_KEY = 'asoforge_projects_backup';

export const projectService = {
  // Fetch all projects
  async getAllProjects(): Promise<ProjectState[]> {
    if (!supabase) {
      // Fallback: Read from localStorage
      try {
        const local = localStorage.getItem(LOCAL_STORAGE_KEY);
        return local ? JSON.parse(local) : [];
      } catch (e) {
        console.error("Failed to load from local storage", e);
        return [];
      }
    }

    const { data, error } = await supabase
      .from('projects')
      .select('state')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching projects:', error);
      return [];
    }

    // Unwrap the 'state' column back into ProjectState objects
    return data.map((row: any) => row.state as ProjectState);
  },

  // Save (Create or Update) a project
  async saveProject(project: ProjectState): Promise<void> {
    if (!supabase) {
      // Fallback: Save to localStorage
      try {
        const currentLocal = localStorage.getItem(LOCAL_STORAGE_KEY);
        let projects: ProjectState[] = currentLocal ? JSON.parse(currentLocal) : [];
        
        const index = projects.findIndex(p => p.id === project.id);
        if (index >= 0) {
          projects[index] = project;
        } else {
          projects = [project, ...projects];
        }
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(projects));
      } catch (e) {
        console.error("Failed to save to local storage", e);
      }
      return;
    }

    const { error } = await supabase
      .from('projects')
      .upsert(
        { 
          id: project.id, 
          state: project,
          updated_at: new Date().toISOString()
        }, 
        { onConflict: 'id' }
      );

    if (error) {
      console.error('Error saving project:', error);
    }
  },

  // Delete a project
  async deleteProject(projectId: string): Promise<void> {
    if (!supabase) {
      // Fallback: Delete from localStorage
      try {
        const currentLocal = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (currentLocal) {
          const projects: ProjectState[] = JSON.parse(currentLocal);
          const updated = projects.filter(p => p.id !== projectId);
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
        }
      } catch (e) {
        console.error("Failed to delete from local storage", e);
      }
      return;
    }

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);

    if (error) {
      console.error('Error deleting project:', error);
    }
  }
};