import React from 'react';
import { AppStep } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  currentStep: AppStep;
  credits: number;
  projectName?: string;
  isSaving?: boolean;
  onNavigate: (step: AppStep) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, currentStep, credits, projectName, isSaving, onNavigate }) => {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background-dark text-white font-display">
      {/* Sidebar omitted for brevity in replace_file_content target ... */}
      <aside className="w-72 hidden md:flex flex-col border-r border-border-dark bg-[#161811] h-full shrink-0">
        <div className="p-6 pb-8">
          <div className="flex flex-col gap-1">
            <h1 className="text-white text-2xl font-bold tracking-tight flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-3xl">token</span>
              Asoforge
            </h1>
            <p className="text-text-muted text-xs font-medium uppercase tracking-wider pl-10">Studio</p>
          </div>
        </div>

        <nav className="flex-1 px-4 flex flex-col gap-2 overflow-y-auto custom-scrollbar">
          <NavItem
            icon="dashboard"
            label="Dashboard"
            active={currentStep === AppStep.DASHBOARD}
            onClick={() => onNavigate(AppStep.DASHBOARD)}
          />
          <NavItem
            icon="psychology"
            label="Input & Analysis"
            active={currentStep === AppStep.INPUT_ANALYSIS || currentStep === AppStep.ANALYSIS_REVIEW}
            onClick={() => onNavigate(AppStep.INPUT_ANALYSIS)}
          />
          <NavItem
            icon="badge"
            label="Naming"
            active={currentStep === AppStep.NAMING}
            onClick={() => onNavigate(AppStep.NAMING)}
          />
          <NavItem
            icon="short_text"
            label="Short Description"
            active={currentStep === AppStep.SHORT_DESCRIPTION}
            onClick={() => onNavigate(AppStep.SHORT_DESCRIPTION)}
          />
          <NavItem
            icon="palette"
            label="Brand Assets"
            active={currentStep === AppStep.BRAND_ASSETS}
            onClick={() => onNavigate(AppStep.BRAND_ASSETS)}
          />
          <NavItem
            icon="description"
            label="Full Description"
            active={currentStep === AppStep.DESCRIPTION}
            onClick={() => onNavigate(AppStep.DESCRIPTION)}
          />
          <NavItem
            icon="screenshot_monitor"
            label="Store Graphics"
            active={currentStep === AppStep.STORE_GRAPHICS}
            onClick={() => onNavigate(AppStep.STORE_GRAPHICS)}
          />
          <NavItem
            icon="policy"
            label="Privacy Policy"
            active={currentStep === AppStep.PRIVACY}
            onClick={() => onNavigate(AppStep.PRIVACY)}
          />
          <NavItem
            icon="inventory_2"
            label="Finalize / Export"
            active={currentStep === AppStep.FINALIZE}
            onClick={() => onNavigate(AppStep.FINALIZE)}
          />
        </nav>

        <div className="p-4 mt-auto border-t border-border-dark">
          <div className="flex items-center gap-3 px-4 py-2 bg-surface-dark rounded-xl border border-border-dark">
            <span className="material-symbols-outlined text-primary text-sm">bolt</span>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-gray-300">{credits.toLocaleString()} Credits</span>
              <span className="text-[10px] text-text-muted">Pro Plan Active</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 border-b border-border-dark bg-background-dark">
          <span className="text-white font-bold text-lg flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">token</span> Asoforge
          </span>
          <span className="material-symbols-outlined text-white">menu</span>
        </header>

        {/* Desktop Header */}
        <header className="hidden md:flex items-center justify-between px-8 py-4 border-b border-border-dark bg-background-dark/95 backdrop-blur-sm">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-sm text-text-muted">
              <span className="font-bold text-white">{projectName || 'Project Alpha'}</span>
              <span className="material-symbols-outlined text-xs">chevron_right</span>
              <span className="text-gray-400">{currentStep.replace(/_/g, ' ')}</span>
            </div>

            {/* Saving Indicator */}
            {projectName && (
              <div className={`flex items-center gap-2 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all duration-500 ${isSaving ? 'bg-primary/10 text-primary animate-pulse' : 'text-gray-600'}`}>
                <span className={`material-symbols-outlined text-[14px] ${isSaving ? 'animate-spin' : ''}`}>
                  {isSaving ? 'sync' : 'cloud_done'}
                </span>
                {isSaving ? 'Saving...' : 'Synced'}
              </div>
            )}
          </div>
          <div className="flex items-center gap-6">
            <button className="flex items-center gap-2 cursor-pointer overflow-hidden rounded-xl h-9 px-4 bg-primary hover:bg-primary-dark text-background-dark text-sm font-bold transition-all shadow-[0_0_10px_rgba(192,244,37,0.4)]">
              <span className="material-symbols-outlined text-[18px]">diamond</span>
              <span>Pro Mode</span>
            </button>
            <div className="bg-center bg-no-repeat bg-cover rounded-full size-10 border border-border-dark cursor-pointer bg-surface-dark">
              <span className="flex items-center justify-center w-full h-full text-xs font-bold">JD</span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 lg:p-10 relative">
          <div className="max-w-7xl mx-auto h-full flex flex-col">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

const NavItem: React.FC<{ icon: string; label: string; active?: boolean; onClick: () => void }> = ({ icon, label, active, onClick }) => (
  <div
    onClick={onClick}
    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all group cursor-pointer ${active
        ? 'bg-surface-dark text-white shadow-lg border border-border-dark'
        : 'text-text-muted hover:bg-surface-dark hover:text-white'
      }`}
  >
    <span className={`material-symbols-outlined ${active ? 'text-primary' : 'group-hover:text-primary transition-colors'}`}>
      {icon}
    </span>
    <span className="font-medium text-sm">{label}</span>
  </div>
);

export default Layout;