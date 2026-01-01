import React, { useState } from 'react';
import { ProjectState } from '../types';

interface DashboardViewProps {
  projects: ProjectState[];
  onCreateNew: () => void;
  onOpen: (projectId: string) => void;
  onDelete: (projectId: string) => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({ projects, onCreateNew, onOpen, onDelete }) => {
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);

  const confirmDelete = () => {
    if (projectToDelete) {
      onDelete(projectToDelete);
      setProjectToDelete(null);
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-20 max-w-6xl mx-auto">
      <header className="flex flex-col gap-4">
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
          Project Dashboard
        </h1>
        <p className="text-text-muted text-lg max-w-2xl">
          Manage your ASO campaigns. Resume existing projects or forge a new identity.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Create New Card */}
        <div
          onClick={onCreateNew}
          className="group min-h-[250px] rounded-2xl border-2 border-dashed border-border-dark bg-surface-dark/30 hover:bg-surface-dark hover:border-primary transition-all cursor-pointer flex flex-col items-center justify-center gap-4 p-6"
        >
          <div className="size-16 rounded-full bg-surface-darker border border-border-dark group-hover:border-primary group-hover:bg-primary group-hover:text-black flex items-center justify-center transition-all shadow-lg">
            <span className="material-symbols-outlined text-3xl">add</span>
          </div>
          <h3 className="text-xl font-bold text-white group-hover:text-primary transition-colors">Create New Project</h3>
        </div>

        {/* Project Cards */}
        {projects.map((project) => (
          <div
            key={project.id}
            className="relative group rounded-2xl border border-border-dark bg-surface-dark overflow-hidden hover:border-primary/50 transition-all shadow-lg flex flex-col"
          >
            {/* Visual Header */}
            <div className="h-32 bg-surface-darker relative overflow-hidden border-b border-border-dark">
              <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:10px_10px]"></div>
              {project.generatedAssets.find(a => a.usage === 'MARQUEE') ? (
                <img src={project.generatedAssets.find(a => a.usage === 'MARQUEE')?.url} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" alt="Cover" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center opacity-20">
                  <span className="material-symbols-outlined text-6xl">token</span>
                </div>
              )}

              <div className="absolute top-3 right-3 flex gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); setProjectToDelete(project.id); }}
                  className="size-8 rounded-lg bg-black/50 hover:bg-red-500/90 hover:text-white flex items-center justify-center backdrop-blur-sm transition-colors border border-white/10"
                  title="Delete Project"
                >
                  <span className="material-symbols-outlined text-sm">delete</span>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 flex-1 flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                <span className={`size-2 rounded-full ${project.analysis ? 'bg-primary' : 'bg-gray-600'}`}></span>
                <span className="text-[10px] uppercase font-bold tracking-wider text-text-muted">
                  {project.selectedName ? 'Naming Complete' : project.analysis ? 'Analysis Done' : 'Draft'}
                </span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2 truncate" title={project.name}>
                {project.selectedName ? project.selectedName.name : project.name}
              </h3>
              <p className="text-sm text-gray-500 line-clamp-2 mb-6 flex-1">
                {project.fullDescription ? 'Full description generated.' : project.descriptionInput || 'No description yet.'}
              </p>

              <button
                onClick={() => onOpen(project.id)}
                className="w-full py-3 rounded-xl bg-surface-darker border border-border-dark hover:bg-primary hover:text-black hover:border-primary font-bold text-sm transition-all flex items-center justify-center gap-2"
              >
                Open Studio
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Custom Delete Confirmation Modal */}
      {projectToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-surface-dark border border-border-dark rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="size-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-2">
                <span className="material-symbols-outlined text-4xl">warning</span>
              </div>
              <h2 className="text-2xl font-black text-white">Delete Project?</h2>
              <p className="text-text-muted">
                This action is permanent and will remove all generated assets, descriptions, and analysis data for this project.
              </p>

              <div className="flex flex-col w-full gap-3 mt-4">
                <button
                  onClick={confirmDelete}
                  className="w-full py-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all shadow-[0_4px_15px_rgba(239,68,68,0.2)]"
                >
                  Yes, Delete Project
                </button>
                <button
                  onClick={() => setProjectToDelete(null)}
                  className="w-full py-4 bg-surface-darker hover:bg-white/5 text-gray-400 font-bold rounded-xl border border-border-dark transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardView;