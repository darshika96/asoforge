import React, { useState, useEffect, useCallback, useRef } from 'react';
import Layout from './components/Layout';
import DashboardView from './components/DashboardView';
import AnalysisView from './components/AnalysisView';
import AnalysisReviewView from './components/AnalysisReviewView';
import NamingView from './components/NamingView';
import ShortDescriptionView from './components/ShortDescriptionView';
import BrandView from './components/BrandView';
import DescriptionView from './components/DescriptionView';
import ScreenshotStudio from './components/ScreenshotStudio';
import PrivacyView from './components/PrivacyView';
import FinalizeView from './components/FinalizeView';
import { AppStep, ProjectState, AnalysisResult, GeneratedName, GeneratedAsset, BrandIdentity, ScreenshotData, StoreGraphicsPreferences, ScoredDescription } from './types';
import { projectService } from './services/projectService';

const App: React.FC = () => {
  const [projects, setProjects] = useState<ProjectState[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<AppStep>(AppStep.DASHBOARD);
  const [isLoading, setIsLoading] = useState(true);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Migration helper: Convert old color structure to new 8-color structure
  const migrateBrandIdentity = (project: ProjectState): ProjectState => {
    if (!project.brandIdentity) return project;

    const colors = project.brandIdentity.colors as any;

    // Check if already migrated (has primary1)
    if (colors.primary1) return project;

    // Migrate old structure to new
    return {
      ...project,
      brandIdentity: {
        ...project.brandIdentity,
        colors: {
          primary1: colors.primary || '#c0f425',
          primary2: colors.secondary || '#a3d615',
          accent1: colors.accent || '#ffffff',
          accent2: colors.accent || '#f0f0f0', // Duplicate accent as accent2
          neutral_white: '#ffffff',
          neutral_black: colors.background || '#161811',
          neutral_gray: '#888888',
          highlight_neon: colors.accent || '#00ffcc'
        },
        typography: {
          headingFont: project.brandIdentity.typography?.headingFont || 'Inter',
          bodyFont: project.brandIdentity.typography?.bodyFont || project.brandIdentity.typography?.headingFont || 'Inter',
          reasoning: project.brandIdentity.typography?.reasoning || ''
        }
      }
    };
  };

  // Load projects from Supabase on mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const data = await projectService.getAllProjects();
      // Migrate old projects to new color structure
      const migratedData = data.map(migrateBrandIdentity);
      setProjects(migratedData);
      setIsLoading(false);
    };
    loadData();
  }, []);

  // Helper to get active project safely
  const activeProject = projects.find(p => p.id === currentProjectId);

  // Helper to update the active project state AND save to DB
  const updateActiveProject = useCallback(async (updates: Partial<ProjectState>) => {
    if (!currentProjectId) return;

    // 1. Optimistic UI Update
    setProjects(prev => {
      const newProjects = prev.map(p => {
        if (p.id === currentProjectId) {
          return { ...p, ...updates };
        }
        return p;
      });
      return newProjects;
    });
  }, [currentProjectId]);

  // 3. Debounced Save Effect
  useEffect(() => {
    if (activeProject) {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

      saveTimeoutRef.current = setTimeout(async () => {
        setIsSaving(true);
        try {
          await projectService.saveProject(activeProject);
        } finally {
          setIsSaving(false);
        }
      }, 1000); // 1.0s debounce
    }

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [activeProject]);

  // --- Actions ---

  const handleCreateProject = async () => {
    const newProject: ProjectState = {
      id: `proj_${Date.now()}`,
      name: 'Untitled Project',
      descriptionInput: '',
      analysis: null,
      generatedNames: [],
      selectedName: null,
      generatedShortDescriptions: [],
      selectedShortDescription: null,
      visualStyle: 'Modern Mascot',
      generatedAssets: [],
      fullDescription: null,
      brandIdentity: null,
      screenshots: [],
      smallTiles: [],
      marquees: [],
      storeGraphicsPreferences: undefined,
      privacyPolicy: null
    };

    // Update Local State
    setProjects(prev => [newProject, ...prev]);
    setCurrentProjectId(newProject.id);
    setCurrentStep(AppStep.INPUT_ANALYSIS);

    // Save to DB
    await projectService.saveProject(newProject);
  };

  const handleOpenProject = (id: string) => {
    setCurrentProjectId(id);
    // Determine the furthest step based on data existence to resume context
    const proj = projects.find(p => p.id === id);
    if (!proj) return;

    // Prioritize Finalize if essentially done (has policy), otherwise flow backwards
    if (proj.privacyPolicy) setCurrentStep(AppStep.FINALIZE);
    else if (proj.generatedAssets.length > 0) setCurrentStep(AppStep.STORE_GRAPHICS);
    else if (proj.selectedShortDescription) setCurrentStep(AppStep.BRAND_ASSETS);
    else if (proj.selectedName) setCurrentStep(AppStep.SHORT_DESCRIPTION);
    else if (proj.analysis) setCurrentStep(AppStep.NAMING);
    else setCurrentStep(AppStep.INPUT_ANALYSIS);
  };

  const handleDeleteProject = async (id: string) => {
    // Update Local State
    setProjects(prev => prev.filter(p => p.id !== id));
    if (currentProjectId === id) {
      setCurrentProjectId(null);
      setCurrentStep(AppStep.DASHBOARD);
    }
    // Delete from DB
    await projectService.deleteProject(id);
  };

  // --- Step Handlers ---

  const handleAnalysisComplete = useCallback((analysis: AnalysisResult, desc: string) => {
    updateActiveProject({ analysis, descriptionInput: desc });
    setCurrentStep(AppStep.ANALYSIS_REVIEW);
  }, [updateActiveProject]);

  const handleAnalysisReviewConfirm = useCallback((updatedAnalysis: AnalysisResult) => {
    updateActiveProject({ analysis: updatedAnalysis });
    setCurrentStep(AppStep.NAMING);
  }, [updateActiveProject]);

  // Handler for when NamingView generates a list (so we save it before selection)
  const handleNamesGenerated = useCallback((names: GeneratedName[]) => {
    updateActiveProject({ generatedNames: names });
  }, [updateActiveProject]);

  const handleNameSelected = useCallback((name: GeneratedName) => {
    updateActiveProject({ selectedName: name });
    setCurrentStep(AppStep.SHORT_DESCRIPTION);
  }, [updateActiveProject]);

  const handleShortDescriptionsGenerated = useCallback((descs: ScoredDescription[]) => {
    updateActiveProject({ generatedShortDescriptions: descs });
  }, [updateActiveProject]);

  const handleShortDescriptionSelected = useCallback((desc: ScoredDescription) => {
    updateActiveProject({ selectedShortDescription: desc });
    setCurrentStep(AppStep.BRAND_ASSETS);
  }, [updateActiveProject]);

  const handleAssetsComplete = useCallback((assets: GeneratedAsset[], identity: BrandIdentity | null) => {
    updateActiveProject({
      generatedAssets: assets,
      brandIdentity: identity
    });
    setCurrentStep(AppStep.DESCRIPTION);
  }, [updateActiveProject]);

  const handleDescriptionComplete = useCallback((fullDescription: string) => {
    updateActiveProject({ fullDescription });
    setCurrentStep(AppStep.STORE_GRAPHICS);
  }, [updateActiveProject]);

  // Updated Handler: Save all graphic types and preferences
  const handleScreenshotsStatusChange = useCallback((
    screenshots: ScreenshotData[],
    smallTiles: ScreenshotData[],
    marquees: ScreenshotData[],
    preferences: StoreGraphicsPreferences
  ) => {
    updateActiveProject({
      screenshots,
      smallTiles,
      marquees,
      storeGraphicsPreferences: preferences
    });
  }, [updateActiveProject]);

  const handleScreenshotsComplete = () => {
    // Logic for final export or moving to next step could go here
    setCurrentStep(AppStep.PRIVACY);
  };

  const handlePrivacyComplete = useCallback((policy: string) => {
    updateActiveProject({ privacyPolicy: policy });
    setCurrentStep(AppStep.FINALIZE);
  }, [updateActiveProject]);

  // Navigation Handler from Sidebar
  const handleNavigate = (step: AppStep) => {
    if (step === AppStep.DASHBOARD) {
      setCurrentProjectId(null); // Deselect project
      setCurrentStep(AppStep.DASHBOARD);
    } else {
      // Only allow navigation if a project is active
      if (activeProject) {
        setCurrentStep(step);
      }
    }
  };

  const renderStep = () => {
    if (isLoading) {
      return (
        <div className="flex h-full items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="size-12 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
            <span className="text-text-muted text-sm font-bold uppercase tracking-widest">Loading Projects...</span>
          </div>
        </div>
      );
    }

    if (currentStep === AppStep.DASHBOARD) {
      return (
        <DashboardView
          projects={projects}
          onCreateNew={handleCreateProject}
          onOpen={handleOpenProject}
          onDelete={handleDeleteProject}
        />
      );
    }

    if (!activeProject) return <div>No active project loaded.</div>;

    switch (currentStep) {
      case AppStep.INPUT_ANALYSIS:
        return (
          <AnalysisView
            onAnalysisComplete={handleAnalysisComplete}
            savedDescription={activeProject.descriptionInput}
          />
        );
      case AppStep.ANALYSIS_REVIEW:
        if (!activeProject.analysis) return <div>Error: Missing analysis data</div>;
        return (
          <AnalysisReviewView
            analysis={activeProject.analysis}
            onConfirm={handleAnalysisReviewConfirm}
            onBack={() => setCurrentStep(AppStep.INPUT_ANALYSIS)}
          />
        );
      case AppStep.NAMING:
        if (!activeProject.analysis) return <div>Error: Missing analysis data</div>;
        return (
          <NamingView
            analysis={activeProject.analysis}
            savedNames={activeProject.generatedNames}
            savedSelection={activeProject.selectedName}
            onNamesGenerated={handleNamesGenerated}
            onNameSelected={handleNameSelected}
          />
        );
      case AppStep.SHORT_DESCRIPTION:
        if (!activeProject.analysis || !activeProject.selectedName) return <div>Error: Missing project data</div>;
        return (
          <ShortDescriptionView
            analysis={activeProject.analysis}
            selectedName={activeProject.selectedName}
            savedDescriptions={activeProject.generatedShortDescriptions}
            savedSelection={activeProject.selectedShortDescription}
            onDescriptionsGenerated={handleShortDescriptionsGenerated}
            onDescriptionSelected={handleShortDescriptionSelected}
          />
        );
      case AppStep.BRAND_ASSETS:
        if (!activeProject.analysis || !activeProject.selectedName) return <div>Error: Missing project data</div>;
        return (
          <BrandView
            analysis={activeProject.analysis}
            selectedName={activeProject.selectedName}
            savedIdentity={activeProject.brandIdentity}
            savedAssets={activeProject.generatedAssets}
            onComplete={handleAssetsComplete}
          />
        );
      case AppStep.DESCRIPTION:
        if (!activeProject.analysis || !activeProject.selectedName || !activeProject.selectedShortDescription)
          return <div>Error: Missing project data for description</div>;
        return (
          <DescriptionView
            analysis={activeProject.analysis}
            selectedName={activeProject.selectedName}
            shortDescription={activeProject.selectedShortDescription.text}
            savedDescription={activeProject.fullDescription}
            onComplete={handleDescriptionComplete}
          />
        );
      case AppStep.STORE_GRAPHICS:
        if (!activeProject.analysis || !activeProject.selectedName) return <div>Error: Missing project data</div>;

        const mainIcon = activeProject.generatedAssets.find(a => a.usage === 'ICON_MAIN')?.url;

        return (
          <ScreenshotStudio
            analysis={activeProject.analysis}
            selectedName={activeProject.selectedName}
            shortDescription={activeProject.selectedShortDescription?.text || ''}
            logoUrl={mainIcon}
            savedScreenshots={activeProject.screenshots}
            savedSmallTiles={activeProject.smallTiles}
            savedMarquees={activeProject.marquees}
            savedPreferences={activeProject.storeGraphicsPreferences}
            brandIdentity={activeProject.brandIdentity || {
              colors: { primary: '#c0f425', secondary: '#ffffff', background: '#161811', accent: '#a3d615' },
              typography: { headingFont: 'Space Grotesk', bodyFont: 'Noto Sans', reasoning: '' },
              visualStyleDescription: 'Default'
            }}
            onStatusChange={handleScreenshotsStatusChange}
            onComplete={handleScreenshotsComplete}
          />
        );
      case AppStep.PRIVACY:
        if (!activeProject.analysis || !activeProject.selectedName) return <div>Error: Missing project data</div>;
        return (
          <PrivacyView
            analysis={activeProject.analysis}
            selectedName={activeProject.selectedName}
            savedPolicy={activeProject.privacyPolicy}
            onComplete={handlePrivacyComplete}
          />
        );
      case AppStep.FINALIZE:
        return (
          <FinalizeView project={activeProject} />
        );
      default:
        return <div>Unknown Step</div>;
    }
  };

  return (
    <Layout
      currentStep={currentStep}
      credits={2450}
      onNavigate={handleNavigate}
      projectName={activeProject?.selectedName?.name || activeProject?.name}
      isSaving={isSaving}
    >
      {renderStep()}
    </Layout>
  );
};

export default App;