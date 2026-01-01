

export enum AppStep {
  INPUT_ANALYSIS = 'INPUT_ANALYSIS',
  ANALYSIS_REVIEW = 'ANALYSIS_REVIEW',
  NAMING = 'NAMING',
  SHORT_DESCRIPTION = 'SHORT_DESCRIPTION',
  BRAND_ASSETS = 'BRAND_ASSETS',
  DESCRIPTION = 'DESCRIPTION',
  STORE_GRAPHICS = 'STORE_GRAPHICS',
  PRIVACY = 'PRIVACY',
  FINALIZE = 'FINALIZE', // New Step
  DASHBOARD = 'DASHBOARD'
}

export interface AnalysisResult {
  category: string;
  targetAudience: string;
  coreFeatures: string[];
  primaryKeywords: string[];
  tone: string;
  // New Enhanced Fields
  seoStrategy?: string;
  marketAnalysis?: string;
  customerPsychology?: string;
  isJunk?: boolean; // To detect invalid project descriptions
}

export interface GeneratedName {
  name: string;
  tagline: string;
  type: 'SEO' | 'CREATIVE';
  reasoning: string;
  score: number; // 0-100
  strategy?: string; // e.g. "Word Fusion", "Letter Swap", etc.
}

export interface ScoredDescription {
  text: string;
  score: number;
  reasoning: string;
  keywordsUsed: string[];
}

export interface GeneratedAsset {
  id: string;
  usage: 'ICON_MAIN' | 'ICON_RESIZED' | 'MARQUEE' | 'SMALL_TILE' | 'SCREENSHOT';
  url: string; // Data URL
  promptUsed: string;
  dimensions?: string;
}

export interface BrandIdentity {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    accent: string;
  };
  typography: {
    headingFont: string;
    bodyFont: string;
    reasoning: string;
  };
  visualStyleDescription: string;
}

export type ScreenshotTemplate = 'SPLIT' | 'CENTERED' | 'OVERLAY' | 'MINIMAL' | 'DEVICE';

export interface ImagePosition {
  // Container (Frame) Transforms
  scale: number;
  x: number;
  y: number;
  rotate: number;

  // Content (Inside Image) Transforms
  imgZoom: number;
  imgX: number;
  imgY: number;
}

export interface ScreenshotData {
  id: string;
  file: File | null;
  previewUrl: string; // Source image (Raw upload or Logo)
  renderedUrl?: string; // Final composited image (Frame + Text + Background)
  headline: string;
  subheadline: string;
  highlightText: string; // The specific word(s) to underline
  isStylized: boolean; // Nano Banana mode
  naturalWidth: number;
  naturalHeight: number;

  // Layout Options
  template: ScreenshotTemplate;
  textAlign?: 'left' | 'center' | 'right';
  contentMode?: 'SCREENSHOT' | 'ICON'; // Default to SCREENSHOT

  // Positioning data stored PER template
  positions: Record<ScreenshotTemplate, ImagePosition>;
}

export interface StoreGraphicsPreferences {
  // Global defaults if needed, though now overridden by ScreenshotData
  bgStyle: 'solid' | 'gradient' | 'mesh';
  activeColor: string;
}

export interface ProjectState {
  id: string;
  name: string;
  descriptionInput: string;
  analysis: AnalysisResult | null;
  generatedNames: GeneratedName[];
  selectedName: GeneratedName | null;
  generatedShortDescriptions: ScoredDescription[];
  selectedShortDescription: ScoredDescription | null;
  visualStyle: 'Cute Character' | '3D Geometric' | 'Abstract' | '3D Letter' | 'Modern Minimalist';
  generatedAssets: GeneratedAsset[];
  fullDescription: string | null;
  brandIdentity: BrandIdentity | null;

  // Graphics Categories
  screenshots: ScreenshotData[];
  smallTiles: ScreenshotData[];
  marquees: ScreenshotData[];

  storeGraphicsPreferences?: StoreGraphicsPreferences;

  // Privacy
  privacyPolicy: string | null;
}