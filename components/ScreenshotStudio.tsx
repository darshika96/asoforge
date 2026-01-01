import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AnalysisResult, GeneratedName, BrandIdentity, ScreenshotData, StoreGraphicsPreferences, ScreenshotTemplate, ImagePosition } from '../types';
import { analyzeScreenshot } from '../services/geminiService';
import { toJpeg } from 'html-to-image';

type GraphicType = 'SCREENSHOTS' | 'SMALL_TILE' | 'MARQUEE';

interface ScreenshotStudioProps {
  analysis: AnalysisResult;
  selectedName: GeneratedName;
  shortDescription: string;
  brandIdentity: BrandIdentity;
  logoUrl?: string;
  savedScreenshots?: ScreenshotData[];
  savedSmallTiles?: ScreenshotData[];
  savedMarquees?: ScreenshotData[];
  savedPreferences?: StoreGraphicsPreferences;
  onStatusChange?: (
    screenshots: ScreenshotData[], 
    smallTiles: ScreenshotData[], 
    marquees: ScreenshotData[], 
    preferences: StoreGraphicsPreferences
  ) => void;
  onComplete: () => void;
}

// Config for each type
const GRAPHIC_CONFIG = {
    SCREENSHOTS: { width: 1280, height: 800, label: 'Screenshots', aspect: '16:10' },
    SMALL_TILE: { width: 440, height: 280, label: 'Small Promo', aspect: '11:7' },
    MARQUEE: { width: 1400, height: 560, label: 'Marquee', aspect: '5:2' }
};

// Device Aspect Ratio
const DEVICE_ASPECT_RATIO = 16 / 10; 

// Simplified Hand-Drawn Brush Stroke
const BRUSH_STROKE_PATH = "M5,45 C50,25 250,20 345,40";

// Default Positions
const DEFAULT_POSITIONS: Record<ScreenshotTemplate, ImagePosition> = {
    DEVICE:   { scale: 1, x: 40, y: 0, rotate: 0, imgZoom: 1, imgX: 0, imgY: 0 },
    SPLIT:    { scale: 1, x: 0, y: 0, rotate: 0, imgZoom: 1, imgX: 0, imgY: 0 },
    CENTERED: { scale: 1, x: 0, y: 0, rotate: 0, imgZoom: 1, imgX: 0, imgY: 0 },
    OVERLAY:  { scale: 1, x: 0, y: 0, rotate: 0, imgZoom: 1, imgX: 0, imgY: 0 },
    MINIMAL:  { scale: 1, x: 0, y: 0, rotate: 0, imgZoom: 1, imgX: 0, imgY: 0 },
};

// Visible Placeholder Icon (SVG)
const PLACEHOLDER_ICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='none' stroke='%23555' stroke-width='2' stroke-dasharray='4'/%3E%3Cpath d='M30 50h40M50 30v40' stroke='%23555' stroke-width='2'/%3E%3C/svg%3E";

const getContrastColor = (hexColor: string) => {
    if (!hexColor || !/^#([A-Fa-f0-9]{3}){1,2}$/.test(hexColor)) return '#ffffff';
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.length === 3 ? hex.substring(0, 1).repeat(2) : hex.substring(0, 2), 16);
    const g = parseInt(hex.length === 3 ? hex.substring(1, 1).repeat(2) : hex.substring(2, 2), 16);
    const b = parseInt(hex.length === 3 ? hex.substring(2, 1).repeat(2) : hex.substring(4, 2), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? '#000000' : '#ffffff';
};

const ScreenshotStudio: React.FC<ScreenshotStudioProps> = ({ 
  analysis, 
  selectedName, 
  shortDescription,
  brandIdentity,
  logoUrl,
  savedScreenshots = [],
  savedSmallTiles = [],
  savedMarquees = [],
  savedPreferences,
  onStatusChange,
  onComplete 
}) => {
  const [activeTab, setActiveTab] = useState<GraphicType>('SCREENSHOTS');
  
  // --- Initialization Logic ---
  
  const createSmallTileDefaults = (): ScreenshotData[] => {
      const items: ScreenshotData[] = [];
      const timestamp = Date.now();
      const safeDesc = shortDescription || 'Boost your productivity with AI tools.';
      const descWords = safeDesc.split(' ');
      
      const part1 = descWords.slice(0, 5).join(' ');
      const part2 = descWords.length > 5 ? descWords.slice(5, 10).join(' ') : 'Install now for free.';

      // 1. Name + Logo
      items.push({
          id: `st_${timestamp}_1`,
          file: null,
          previewUrl: '', // Empty by default
          headline: selectedName?.name || 'App Name',
          subheadline: selectedName?.tagline || '',
          highlightText: '',
          isStylized: false,
          naturalWidth: 512,
          naturalHeight: 512,
          template: 'CENTERED',
          textAlign: 'center',
          contentMode: 'SCREENSHOT', 
          positions: JSON.parse(JSON.stringify(DEFAULT_POSITIONS))
      });

      // 2. Desc Part 1
      items.push({
          id: `st_${timestamp}_2`,
          file: null,
          previewUrl: '',
          headline: part1,
          subheadline: '',
          highlightText: '',
          isStylized: false,
          naturalWidth: 512,
          naturalHeight: 512,
          template: 'CENTERED',
          textAlign: 'center',
          contentMode: 'SCREENSHOT',
          positions: JSON.parse(JSON.stringify(DEFAULT_POSITIONS))
      });

      // 3. Desc Part 2
      items.push({
          id: `st_${timestamp}_3`,
          file: null,
          previewUrl: '',
          headline: part2,
          subheadline: '',
          highlightText: '',
          isStylized: false,
          naturalWidth: 512,
          naturalHeight: 512,
          template: 'CENTERED',
          textAlign: 'center',
          contentMode: 'SCREENSHOT',
          positions: JSON.parse(JSON.stringify(DEFAULT_POSITIONS))
      });

      return items;
  };

  const createOtherDefaults = (type: 'SCREENSHOTS' | 'MARQUEE', source?: ScreenshotData): ScreenshotData[] => {
      const items: ScreenshotData[] = [];
      const count = type === 'MARQUEE' ? 1 : 3;
      
      for (let i = 0; i < count; i++) {
        // Data Sharing Logic: If a source screenshot is provided, use its content for the first item
        const useSource = source && i === 0;

        items.push({
            id: `def_${type}_${Date.now()}_${i}`,
            file: useSource ? source.file : null,
            previewUrl: useSource ? source.previewUrl : (logoUrl || PLACEHOLDER_ICON),
            headline: useSource ? source.headline : (i === 0 ? (selectedName?.name || 'Headline') : i === 1 ? 'Powerful Features' : 'Install Now'),
            subheadline: useSource ? source.subheadline : (i === 0 ? (selectedName?.tagline || 'Tagline') : 'Boost your productivity today.'),
            highlightText: useSource ? source.highlightText : '',
            isStylized: false,
            naturalWidth: useSource ? source.naturalWidth : 512,
            naturalHeight: useSource ? source.naturalHeight : 512,
            template: type === 'MARQUEE' ? 'SPLIT' : 'DEVICE',
            textAlign: 'left',
            contentMode: useSource ? source.contentMode : 'ICON',
            positions: JSON.parse(JSON.stringify(DEFAULT_POSITIONS))
        });
      }
      return items;
  };

  // PRE-CALCULATE INITIAL STATE
  const initialScreenshots = useMemo(() => {
    if (savedScreenshots && savedScreenshots.length > 0) return savedScreenshots;
    return createOtherDefaults('SCREENSHOTS');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  const initialMarquees = useMemo(() => {
    if (savedMarquees && savedMarquees.length > 0) return savedMarquees;
    const sourceShot = initialScreenshots.length > 0 ? initialScreenshots[0] : undefined;
    return createOtherDefaults('MARQUEE', sourceShot);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialScreenshots]);

  const initialSmallTiles = useMemo(() => {
      if (savedSmallTiles && savedSmallTiles.length > 0) return savedSmallTiles;
      return createSmallTileDefaults();
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // STATE
  const [screenshots, setScreenshots] = useState<ScreenshotData[]>(initialScreenshots);
  const [smallTiles, setSmallTiles] = useState<ScreenshotData[]>(initialSmallTiles);
  const [marquees, setMarquees] = useState<ScreenshotData[]>(initialMarquees);

  // Computed Values
  const currentCollection = activeTab === 'SCREENSHOTS' ? screenshots : activeTab === 'SMALL_TILE' ? smallTiles : marquees;
  const activeConfig = GRAPHIC_CONFIG[activeTab];

  // Selected Screenshot ID
  const [activeScreenshotId, setActiveScreenshotId] = useState<string | null>(screenshots[0]?.id || null);
  
  // Safe Derived Active Screenshot
  const activeScreenshot = useMemo(() => {
    if (!currentCollection || currentCollection.length === 0) return null;
    const found = currentCollection.find(s => s.id === activeScreenshotId);
    return found || currentCollection[0];
  }, [currentCollection, activeScreenshotId]);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [controlTab, setControlTab] = useState<'FRAME' | 'IMAGE'>('FRAME');
  
  // Preferences
  const [bgStyle, setBgStyle] = useState<'solid' | 'gradient' | 'mesh'>(savedPreferences?.bgStyle || 'mesh');
  const [activeColor, setActiveColor] = useState(savedPreferences?.activeColor || brandIdentity.colors.accent);
  
  const [cornerRadius, setCornerRadius] = useState<number>(32);
  const [textColor, setTextColor] = useState<string>('#ffffff');
  const [highlightColor, setHighlightColor] = useState<string>(brandIdentity.colors.accent);
  const [isDownloading, setIsDownloading] = useState(false);
  const [scale, setScale] = useState(0.8);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const captureRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const smallTileInputRef = useRef<HTMLInputElement>(null);

  // Tab Switching Logic
  useEffect(() => {
     if (activeTab === 'SMALL_TILE') {
         if (smallTiles.length > 0) setActiveScreenshotId(smallTiles[0].id);
     } else if (activeTab === 'MARQUEE') {
         if (marquees.length > 0) setActiveScreenshotId(marquees[0].id);
     } else {
         if (screenshots.length > 0) setActiveScreenshotId(screenshots[0].id);
     }
  }, [activeTab]);

  // Sync back to App.tsx
  useEffect(() => {
    if (onStatusChange && !isBatchProcessing) {
        onStatusChange(screenshots, smallTiles, marquees, {
            bgStyle,
            activeColor
        });
    }
  }, [screenshots, smallTiles, marquees, bgStyle, activeColor, onStatusChange, isBatchProcessing]);

  // Auto Contrast - Only on mount or when active color changes SIGNIFICANTLY, but let user override
  // We'll simplify: Set initial contrast, but don't force it if user manually changed it.
  // Actually, for simplicity in this specific "Studio" context, auto-contrast is usually helpful, 
  // but we will let the manual picker override it.
  useEffect(() => {
     const contrast = getContrastColor(activeColor);
     // Only auto-set if we are using defaults? No, let's just default it and let user change.
     // To avoid locking the user out, we won't put this in a dependency array that fights the user.
     // For now, we'll leave the auto-contrast logic as an "initial" set or triggered by activeColor change.
     setTextColor(contrast);
  }, [activeColor]);

  // Responsive Scaling
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const parentWidth = containerRef.current.clientWidth;
        const parentHeight = containerRef.current.clientHeight;
        const padding = 48; 
        
        const scaleX = (parentWidth - padding) / activeConfig.width;
        const scaleY = (parentHeight - padding) / activeConfig.height;
        const newScale = Math.min(scaleX, scaleY); 
        setScale(newScale > 0.1 ? newScale : 0.1);
      }
    };

    window.addEventListener('resize', handleResize);
    const timer = setTimeout(handleResize, 100); 
    return () => {
        window.removeEventListener('resize', handleResize);
        clearTimeout(timer);
    };
  }, [activeConfig]);

  // Helper to update collection based on active tab
  const updateCollection = (updater: (prev: ScreenshotData[]) => ScreenshotData[]) => {
      if (activeTab === 'SCREENSHOTS') setScreenshots(updater);
      else if (activeTab === 'SMALL_TILE') setSmallTiles(updater);
      else setMarquees(updater);
  };

  const handleBatchRenderAndComplete = async () => {
    setIsBatchProcessing(true);
    
    // Store original state to restore if needed (though we likely want to stay where we ended)
    const initialTab = activeTab;

    const processList = async (list: ScreenshotData[], type: GraphicType) => {
        const results: ScreenshotData[] = [];
        setActiveTab(type);
        // Wait for tab switch render
        await new Promise(r => setTimeout(r, 100));

        for (const item of list) {
            setActiveScreenshotId(item.id);
            // Wait for item switch render
            await new Promise(r => setTimeout(r, 250)); 
            
            if (captureRef.current) {
                 try {
                     const dataUrl = await toJpeg(captureRef.current, { 
                        quality: 0.90,
                        width: GRAPHIC_CONFIG[type].width,
                        height: GRAPHIC_CONFIG[type].height,
                        style: {
                             transform: 'scale(1)', 
                             transformOrigin: 'top left',
                        }
                     });
                     results.push({ ...item, renderedUrl: dataUrl });
                 } catch (e) {
                     console.error("Failed to render", item.id);
                     results.push(item);
                 }
            } else {
                results.push(item);
            }
        }
        return results;
    };

    // Render sequence
    const newScreenshots = await processList(screenshots, 'SCREENSHOTS');
    const newSmallTiles = await processList(smallTiles, 'SMALL_TILE');
    const newMarquees = await processList(marquees, 'MARQUEE');

    // Update local state with rendered versions
    setScreenshots(newScreenshots);
    setSmallTiles(newSmallTiles);
    setMarquees(newMarquees);

    // Save final state to App
    if (onStatusChange) {
        onStatusChange(newScreenshots, newSmallTiles, newMarquees, { bgStyle, activeColor });
    }

    setIsBatchProcessing(false);
    onComplete();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files) as File[];
      
      files.forEach(file => {
          const reader = new FileReader();
          reader.onload = async (event) => {
            if (event.target?.result) {
              const url = event.target.result as string;
              const img = new Image();
              img.src = url;
              img.onload = () => {
                const newId = Date.now().toString() + Math.random().toString().slice(2, 5);
                const newScreenshot: ScreenshotData = {
                    id: newId,
                    file: file,
                    previewUrl: url,
                    headline: 'New Feature',
                    subheadline: 'Description',
                    highlightText: '',
                    isStylized: false,
                    naturalWidth: img.naturalWidth || 1000,
                    naturalHeight: img.naturalHeight || 1000,
                    template: activeTab === 'SMALL_TILE' ? 'CENTERED' : 'DEVICE',
                    textAlign: activeTab === 'SMALL_TILE' ? 'center' : 'left',
                    contentMode: 'SCREENSHOT',
                    positions: JSON.parse(JSON.stringify(DEFAULT_POSITIONS))
                };
    
                updateCollection(prev => [...prev, newScreenshot]);
                setActiveScreenshotId(newId);
              }
            }
          };
          reader.readAsDataURL(file);
      });
    }
  };

  const handleSmallTileImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          const file = e.target.files[0];
          const reader = new FileReader();
          reader.onload = (event) => {
              if (event.target?.result) {
                  const url = event.target.result as string;
                  const img = new Image();
                  img.src = url;
                  img.onload = () => {
                      updateActiveScreenshot({
                          file: file,
                          previewUrl: url,
                          naturalWidth: img.naturalWidth,
                          naturalHeight: img.naturalHeight,
                          contentMode: 'SCREENSHOT'
                      });
                  }
              }
          };
          reader.readAsDataURL(file);
      }
  };

  const handleDeleteScreenshot = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      const newCollection = currentCollection.filter(s => s.id !== id);
      updateCollection(() => newCollection);
      
      if (activeScreenshotId === id) {
          setActiveScreenshotId(newCollection[0]?.id || null);
      }
  };

  const handleDownload = async () => {
      if (!captureRef.current) return;
      setIsDownloading(true);
      try {
          const dataUrl = await toJpeg(captureRef.current, { 
              quality: 0.95,
              width: activeConfig.width,
              height: activeConfig.height,
              style: {
                  transform: 'scale(1)', 
                  transformOrigin: 'top left',
              }
          });
          
          const link = document.createElement('a');
          const typeLabel = activeTab === 'SMALL_TILE' ? 'small-promo' : activeTab === 'MARQUEE' ? 'marquee' : 'screenshot';
          link.download = `${selectedName.name.replace(/\s+/g, '-').toLowerCase()}-${typeLabel}-${Date.now()}.jpg`;
          link.href = dataUrl;
          link.click();
      } catch (err) {
          console.error('Failed to generate image', err);
          alert('Could not generate image. Please try again.');
      } finally {
          setIsDownloading(false);
      }
  };

  const runAnalysis = async (shot: ScreenshotData) => {
    setIsAnalyzing(true);
    const loadingState = { ...shot, headline: 'Analyzing...', subheadline: 'AI is reading screenshot...', highlightText: '' };
    updateCollection(prev => prev.map(s => s.id === shot.id ? loadingState : s));

    try {
      const imgToAnalyze = shot.contentMode === 'ICON' && logoUrl ? logoUrl : shot.previewUrl;
      const result = await analyzeScreenshot(imgToAnalyze || shot.previewUrl, selectedName.name, analysis.tone);
      
      let finalHeadline = result.headline;
      if (activeTab === 'SMALL_TILE') {
          finalHeadline = finalHeadline.split(' ').slice(0, 5).join(' '); // Limit to 5 words
      }

      const updatedShot = { 
          ...shot, 
          headline: finalHeadline, 
          subheadline: result.subheadline,
          highlightText: result.highlightText
      };
      updateCollection(prev => prev.map(s => s.id === shot.id ? updatedShot : s));
    } catch (e) {
      console.error("Analysis failed", e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getCurrentPosition = () => {
      if (!activeScreenshot) return DEFAULT_POSITIONS.DEVICE;
      const template = activeTab === 'SMALL_TILE' ? 'CENTERED' : activeScreenshot.template;
      const templatePositions = activeScreenshot.positions || DEFAULT_POSITIONS;
      return templatePositions[template] || DEFAULT_POSITIONS[template] || DEFAULT_POSITIONS.DEVICE;
  };

  const updateActiveScreenshot = (updates: Partial<ScreenshotData>) => {
      if (!activeScreenshot) return;
      const updated = { ...activeScreenshot, ...updates };
      updateCollection(prev => prev.map(s => s.id === updated.id ? updated : s));
  };

  const updateCurrentPosition = (posUpdates: Partial<ImagePosition>) => {
      if (!activeScreenshot) return;
      const currentTemp = activeTab === 'SMALL_TILE' ? 'CENTERED' : activeScreenshot.template;
      const currentPos = activeScreenshot.positions?.[currentTemp] || DEFAULT_POSITIONS[currentTemp];
      const newPositions = {
          ...activeScreenshot.positions,
          [currentTemp]: { ...currentPos, ...posUpdates }
      };
      updateActiveScreenshot({ positions: newPositions });
  };

  const renderTextContent = (forcedAlign?: 'left' | 'center' | 'right') => {
      if (!activeScreenshot) return null;
      const align = activeTab === 'SMALL_TILE' ? 'center' : (forcedAlign || activeScreenshot.textAlign || 'left');
      const fullText = activeScreenshot.headline || '';
      const highlight = activeScreenshot.highlightText?.trim();
      let headlineContent;

      if (highlight && fullText.toLowerCase().includes(highlight.toLowerCase()) && highlight.length > 0) {
          const parts = fullText.split(new RegExp(`(${highlight})`, 'gi'));
          headlineContent = (
              <>
                {parts.map((part, i) => (
                    part.toLowerCase() === highlight.toLowerCase() ? (
                        <span key={i} className="relative inline-block whitespace-nowrap z-10">
                            <span className="relative z-10">{part}</span>
                            <svg 
                                className="absolute w-[110%] h-[30px] bottom-[5px] -left-[5%] z-0 opacity-80"
                                viewBox="0 0 350 50"
                                preserveAspectRatio="none"
                                style={{ color: highlightColor }}
                            >
                                <path d={BRUSH_STROKE_PATH} stroke="currentColor" strokeWidth="20" fill="none" strokeLinecap="round" />
                            </svg>
                        </span>
                    ) : (
                        <span key={i}>{part}</span>
                    )
                ))}
              </>
          );
      } else {
          headlineContent = fullText;
      }

      const titleSize = activeTab === 'SMALL_TILE' ? 'text-5xl' : 'text-8xl';
      const subSize = activeTab === 'SMALL_TILE' ? 'text-xl' : 'text-4xl';

      return (
          <div className={`flex flex-col gap-6 z-20 relative w-full ${align === 'center' ? 'items-center text-center' : align === 'right' ? 'items-end text-right' : 'items-start text-left'}`}>
              <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/10 w-fit shadow-lg">
                  {logoUrl ? (
                      <img src={logoUrl} alt="Logo" className="size-12 rounded-lg shadow-sm bg-surface-dark object-cover" />
                  ) : (
                      <div className="size-12 bg-primary rounded-lg flex items-center justify-center font-bold text-black text-2xl">
                          {(selectedName?.name || 'A').charAt(0)}
                      </div>
                  )}
                  {activeTab !== 'SMALL_TILE' && (
                       <span style={{ color: textColor }} className="font-bold tracking-wide uppercase text-xl opacity-100 font-display transition-colors">{selectedName?.name || 'App Name'}</span>
                  )}
              </div>
              
              <h1 
                style={{ color: textColor }}
                className={`${titleSize} font-black leading-[0.9] drop-shadow-xl font-display tracking-tight max-w-4xl transition-colors`}
              >
                  {headlineContent}
              </h1>
              
              <p 
                style={{ color: textColor }}
                className={`${subSize} font-medium leading-normal font-body max-w-2xl opacity-90 transition-colors`}
              >
                  {activeScreenshot.subheadline}
              </p>
          </div>
      );
  };

  const renderBrowserToolbar = (radius: number) => (
     <div 
        className="h-14 bg-[#1a1a1a] border-b border-[#2a2a2a] flex items-center px-6 gap-3 shrink-0"
        style={{ borderTopLeftRadius: radius, borderTopRightRadius: radius }}
     >
        <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-[#FF5F57]"></div>
            <div className="w-3 h-3 rounded-full bg-[#FEBC2E]"></div>
            <div className="w-3 h-3 rounded-full bg-[#28C840]"></div>
        </div>
        <div className="ml-4 flex-1 h-9 bg-[#2b2b2b] rounded-lg border border-[#3a3a3a] flex items-center px-4 relative overflow-hidden group">
            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            <span className="material-symbols-outlined text-gray-500 text-sm">lock</span>
            <div className="ml-2 w-32 h-2 bg-gray-600/30 rounded-full"></div>
        </div>
    </div>
  );

  const renderScreenshotContainer = (mode: 'FIXED_HEIGHT' | 'FIXED_WIDTH' | 'CONTAIN', params: { widthPct?: number, heightPct?: number }, hasChrome: boolean, alignImage: 'top' | 'bottom' = 'top') => {
      if (!activeScreenshot) return null;
      const pos = getCurrentPosition();
      
      const isIconMode = activeScreenshot.contentMode === 'ICON';
      const imageSrc = isIconMode && logoUrl ? logoUrl : activeScreenshot.previewUrl;

      if (!imageSrc && activeTab === 'SMALL_TILE') return null;

      const effectiveSrc = imageSrc || PLACEHOLDER_ICON;
      const showChrome = hasChrome && !isIconMode;
      const activeRadius = cornerRadius;

      const imgRatio = isIconMode ? 1 : (activeScreenshot.naturalWidth / (activeScreenshot.naturalHeight || 1));
      const effectiveRatio = (!isIconMode && activeTab !== 'SMALL_TILE' && activeScreenshot.template === 'DEVICE') ? DEVICE_ASPECT_RATIO : imgRatio;

      let w = 0, h = 0;
      if (mode === 'FIXED_HEIGHT' && params.heightPct) {
          h = activeConfig.height * (params.heightPct / 100);
          w = h * effectiveRatio;
      } else if (mode === 'FIXED_WIDTH' && params.widthPct) {
          w = activeConfig.width * (params.widthPct / 100);
          h = w / effectiveRatio;
      }

      return (
         <div 
            className={`relative z-10 transition-transform duration-300`}
            style={{
                transform: `translate(${pos.x}px, ${pos.y}px) scale(${pos.scale}) rotate(${pos.rotate}deg)`,
                width: `${w}px`,
                height: `${h}px`
            }}
         >
            <div 
                className={`w-full h-full ${showChrome ? 'border-[6px] border-[#252525] ring-1 ring-white/10 bg-[#1e1e1e]' : 'bg-transparent'} ${isIconMode ? '' : 'shadow-2xl'} overflow-hidden flex flex-col relative`}
                style={{ borderRadius: `${activeRadius}px` }}
            >
                {showChrome && renderBrowserToolbar(activeRadius - 6 > 0 ? activeRadius - 6 : 0)}
                <div className={`relative flex-1 ${showChrome ? 'bg-gray-900' : 'bg-transparent'} overflow-hidden w-full h-full flex items-center justify-center`}>
                    <img 
                        src={effectiveSrc} 
                        className={`absolute max-w-none transition-transform ${isIconMode ? 'object-contain' : 'shadow-sm'}`}
                        style={{
                            left: isIconMode ? 'auto' : '0', 
                            width: isIconMode ? 'auto' : '100%',
                            height: isIconMode ? '80%' : 'auto',
                            top: alignImage === 'top' && !isIconMode ? '0' : 'auto',
                            bottom: alignImage === 'bottom' && !isIconMode ? '0' : 'auto',
                            transform: `translate(${pos.imgX}px, ${pos.imgY}px) scale(${pos.imgZoom})`,
                            transformOrigin: 'center',
                            borderRadius: isIconMode ? `${activeRadius}px` : '0',
                        }}
                        alt="Content"
                    />
                </div>
            </div>
         </div>
      );
  };

  const getBackgroundStyle = () => {
    if (bgStyle === 'solid') return { backgroundColor: activeColor };
    if (bgStyle === 'gradient') {
      return { 
        backgroundColor: activeColor,
        backgroundImage: `linear-gradient(135deg, ${brandIdentity.colors.background} 0%, ${activeColor} 100%)`,
      };
    }
    if (bgStyle === 'mesh') {
      return {
        backgroundColor: activeColor,
        backgroundImage: `
            radial-gradient(circle at 0% 0%, ${brandIdentity.colors.secondary}99 0%, transparent 40%),
            radial-gradient(circle at 100% 0%, ${brandIdentity.colors.accent}99 0%, transparent 40%),
            radial-gradient(circle at 100% 100%, ${brandIdentity.colors.primary}99 0%, transparent 40%),
            radial-gradient(circle at 0% 100%, rgba(255,255,255,0.2) 0%, transparent 40%)
        `,
      };
    }
    return { backgroundColor: '#000' };
  };

  const pos = getCurrentPosition();
  const renderControl = (label: string, value: number, field: keyof ImagePosition, min: number, max: number, step: number, unit: string = "") => (
    <div className="space-y-1">
        <div className="flex justify-between text-xs text-gray-400">
            <span>{label}</span>
            <div className="flex items-center gap-2">
                 <span>{unit === "%" ? Math.round(value * 100) : Math.round(value)}{unit}</span>
                 <button 
                    onClick={() => activeScreenshot && updateCurrentPosition({ [field]: DEFAULT_POSITIONS[activeScreenshot.template][field] })}
                    className="text-[10px] text-gray-600 hover:text-primary transition-colors p-1"
                    title="Reset"
                 >
                    <span className="material-symbols-outlined text-[14px]">replay</span>
                 </button>
            </div>
        </div>
        <input 
            type="range" min={min} max={max} step={step}
            value={value}
            onChange={(e) => updateCurrentPosition({ [field]: parseFloat(e.target.value) })}
            className="w-full accent-primary h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
        />
    </div>
  );

  return (
    <div className="flex flex-col relative min-h-[calc(100vh-100px)]">
      {/* Batch Processing Overlay */}
      {isBatchProcessing && (
         <div className="absolute inset-0 z-50 bg-background-dark/90 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
             <div className="size-16 rounded-full border-4 border-surface-darker border-t-primary animate-spin"></div>
             <h2 className="text-2xl font-bold text-white">Rendering Graphics...</h2>
             <p className="text-text-muted">Capturing high-res assets for export.</p>
         </div>
      )}

      <div className="flex flex-col md:flex-row h-[calc(100vh-180px)] overflow-hidden gap-6 relative">
        
        {/* Sidebar Controls */}
        <aside className="w-full md:w-80 lg:w-96 bg-surface-dark border border-border-dark rounded-2xl flex flex-col overflow-hidden shadow-lg shrink-0 z-10">
           {/* TABS */}
        <div className="flex border-b border-border-dark bg-surface-darker">
            {(['SCREENSHOTS', 'SMALL_TILE', 'MARQUEE'] as const).map((tab) => (
                <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider transition-colors ${activeTab === tab ? 'bg-surface-dark text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-white'}`}
                >
                    {GRAPHIC_CONFIG[tab].label}
                </button>
            ))}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
            
          {/* TEMPLATES (Restored Visual Grid) */}
          {activeTab !== 'SMALL_TILE' && (
              <div className="mb-2">
                  <div className="flex justify-between items-center mb-3">
                     <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">grid_view</span> Layout
                     </h3>
                     <span className="text-[10px] bg-surface-darker px-2 py-0.5 rounded text-gray-500 border border-border-dark">{activeScreenshot?.template}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                      {[
                          { id: 'DEVICE', label: 'Device Mockup', icon: 'phone_iphone' },
                          { id: 'SPLIT', label: 'Split View', icon: 'vertical_split' },
                          { id: 'CENTERED', label: 'Centered', icon: 'align_horizontal_center' },
                          { id: 'MINIMAL', label: 'Minimalist', icon: 'crop_original' },
                      ].map((t) => (
                          <button
                              key={t.id}
                              onClick={() => updateActiveScreenshot({ template: t.id as ScreenshotTemplate })}
                              className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border transition-all hover:bg-surface-darker ${activeScreenshot?.template === t.id ? 'bg-primary/10 border-primary text-primary' : 'bg-surface-dark border-border-dark text-gray-400 hover:border-gray-500'}`}
                          >
                              <span className="material-symbols-outlined text-xl">{t.icon}</span>
                              <span className="text-[10px] font-bold uppercase">{t.label}</span>
                          </button>
                      ))}
                  </div>
              </div>
          )}
          
          {/* Content Section */}
          <div>
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">edit_note</span> Content & Text
            </h3>
            <div className="space-y-4">
               {/* Analysis Button */}
               <button
                onClick={() => activeScreenshot && runAnalysis(activeScreenshot)}
                disabled={!activeScreenshot || isAnalyzing}
                className="w-full py-2 bg-surface-darker hover:bg-white hover:text-black border border-primary/30 hover:border-transparent text-primary text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 mb-2 disabled:opacity-50"
              >
                {isAnalyzing ? (
                    <>
                        <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                        Analyzing...
                    </>
                ) : (
                    <>
                        <span className="material-symbols-outlined text-sm">auto_awesome</span>
                        AI Text Gen
                    </>
                )}
              </button>

              <div className="space-y-3">
                <input 
                  className="block w-full rounded-xl border-border-dark bg-surface-darker shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-3 text-white placeholder-gray-600"
                  value={activeScreenshot?.headline || ''}
                  onChange={(e) => updateActiveScreenshot({ headline: e.target.value })}
                  placeholder="Headline"
                />
                <input 
                  className="block w-full rounded-xl border-border-dark bg-surface-darker shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-3 text-white placeholder-gray-600"
                  value={activeScreenshot?.highlightText || ''}
                  onChange={(e) => updateActiveScreenshot({ highlightText: e.target.value })}
                  placeholder="Highlight Text (Exact Match)"
                />
                <textarea 
                  className="block w-full rounded-xl border-border-dark bg-surface-darker shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-3 text-white placeholder-gray-600 resize-none"
                  rows={2}
                  value={activeScreenshot?.subheadline || ''}
                  onChange={(e) => updateActiveScreenshot({ subheadline: e.target.value })}
                  placeholder="Subheadline"
                />
                
                {/* Text Alignment & Typography Colors */}
                {activeTab !== 'SMALL_TILE' && (
                  <>
                      <div className="flex bg-surface-darker rounded-lg border border-border-dark p-1">
                          {['left', 'center', 'right'].map((align) => (
                              <button 
                                  key={align}
                                  onClick={() => updateActiveScreenshot({ textAlign: align as any })}
                                  className={`flex-1 py-1 rounded hover:bg-white/10 ${activeScreenshot?.textAlign === align ? 'bg-primary/20 text-primary' : 'text-gray-500'}`}
                              >
                                  <span className="material-symbols-outlined text-sm">format_align_{align}</span>
                              </button>
                          ))}
                      </div>

                      {/* Typography Colors */}
                      <div className="bg-surface-darker rounded-xl border border-border-dark p-3 flex justify-between items-center gap-2 mt-2">
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] text-gray-500 font-bold uppercase">Text Color</span>
                                <div className="flex items-center gap-2">
                                     <div className="relative size-8 rounded-full border border-white/10 overflow-hidden cursor-pointer">
                                        <input 
                                            type="color" 
                                            value={textColor} 
                                            onChange={(e) => setTextColor(e.target.value)}
                                            className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] cursor-pointer p-0 border-0"
                                        />
                                     </div>
                                     {/* Presets */}
                                     <div className="flex gap-1">
                                         <button onClick={() => setTextColor('#ffffff')} className="size-5 rounded-full bg-white border border-gray-600" title="White"></button>
                                         <button onClick={() => setTextColor('#000000')} className="size-5 rounded-full bg-black border border-gray-600" title="Black"></button>
                                     </div>
                                </div>
                            </div>
                            <div className="w-px h-8 bg-border-dark"></div>
                            <div className="flex flex-col gap-1 items-end">
                                <span className="text-[10px] text-gray-500 font-bold uppercase">Brush/Highlight</span>
                                <div className="flex items-center gap-2">
                                     {/* Presets from Brand Identity */}
                                     <div className="flex gap-1">
                                         <button onClick={() => setHighlightColor(brandIdentity.colors.accent)} className="size-5 rounded-full border border-gray-600" style={{ backgroundColor: brandIdentity.colors.accent }} title="Brand Accent"></button>
                                         <button onClick={() => setHighlightColor(brandIdentity.colors.primary)} className="size-5 rounded-full border border-gray-600" style={{ backgroundColor: brandIdentity.colors.primary }} title="Brand Primary"></button>
                                     </div>
                                     <div className="relative size-8 rounded-full border border-white/10 overflow-hidden cursor-pointer">
                                        <input 
                                            type="color" 
                                            value={highlightColor} 
                                            onChange={(e) => setHighlightColor(e.target.value)}
                                            className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] cursor-pointer p-0 border-0"
                                        />
                                     </div>
                                </div>
                            </div>
                      </div>
                  </>
                )}
              </div>
            </div>
          </div>
          
          {/* BACKGROUND SECTION (Restored Polished Version) */}
          <div className="mb-6 p-4 rounded-xl bg-surface-darker/50 border border-border-dark">
             <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">format_paint</span> Background
             </h3>
             
             {/* Style Tabs */}
             <div className="flex bg-surface-dark rounded-lg p-1 border border-border-dark mb-4">
                {['solid', 'gradient', 'mesh'].map((style) => (
                    <button
                        key={style}
                        onClick={() => setBgStyle(style as any)}
                        className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${bgStyle === style ? 'bg-primary text-black shadow-sm' : 'text-gray-500 hover:text-white'}`}
                    >
                        {style}
                    </button>
                ))}
             </div>

             {/* Color Controls */}
             <div className="flex items-center gap-3">
                 <div className="relative group">
                     <div 
                        className="size-10 rounded-full border-2 border-white/20 shadow-lg cursor-pointer hover:scale-105 transition-transform"
                        style={{ backgroundColor: activeColor }}
                     ></div>
                     <input 
                        type="color" 
                        value={activeColor}
                        onChange={(e) => setActiveColor(e.target.value)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                     />
                     <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] bg-black text-white px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-20">
                        Custom
                     </span>
                 </div>
                 
                 <div className="h-8 w-px bg-border-dark mx-1"></div>

                 {/* Brand Presets */}
                 <div className="flex gap-2">
                     {[
                         brandIdentity.colors.primary,
                         brandIdentity.colors.secondary,
                         brandIdentity.colors.accent,
                         brandIdentity.colors.background,
                         '#000000',
                         '#FFFFFF'
                     ].map((c, i) => (
                         <button
                            key={i}
                            onClick={() => setActiveColor(c)}
                            className="size-8 rounded-full border border-white/10 hover:border-white/50 transition-all relative group"
                            style={{ backgroundColor: c }}
                            title={c}
                         >
                            {activeColor.toLowerCase() === c.toLowerCase() && (
                                <span className="material-symbols-outlined text-[10px] text-white mix-blend-difference absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">check</span>
                            )}
                         </button>
                     ))}
                 </div>
             </div>
          </div>

          {/* Visual Assets Section */}
          <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">image</span> Visuals
                </h3>
                {/* Import hidden for Small Tile */}
                {(activeTab !== 'SMALL_TILE' && activeTab !== 'SCREENSHOTS' && screenshots.length > 0) && (
                     <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="text-[10px] text-primary hover:underline"
                    >
                        + Import Screenshots
                    </button>
                )}
            </div>
            
            <div className="space-y-4">
              <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                 {/* Upload Button */}
                 {activeTab !== 'SMALL_TILE' && (
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="shrink-0 size-16 rounded-lg border border-dashed border-gray-500 hover:border-primary hover:bg-primary/10 flex items-center justify-center cursor-pointer transition-colors"
                        title="Upload"
                    >
                        <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileUpload} />
                        <span className="material-symbols-outlined text-gray-400">add</span>
                    </div>
                 )}
                 {/* Thumbnails */}
                 {currentCollection.map((s) => (
                    <div 
                        key={s.id}
                        onClick={() => setActiveScreenshotId(s.id)}
                        className={`shrink-0 size-16 relative rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${activeScreenshot?.id === s.id ? 'border-primary' : 'border-transparent opacity-60 hover:opacity-100'}`}
                    >
                        {s.previewUrl ? (
                             <img src={s.contentMode === 'ICON' && logoUrl ? logoUrl : s.previewUrl} alt="Thumb" className="object-cover w-full h-full" />
                        ) : (
                             <div className="w-full h-full flex items-center justify-center bg-surface-darker text-text-muted">
                                 <span className="material-symbols-outlined text-xl">text_fields</span>
                             </div>
                        )}
                        <button 
                            onClick={(e) => handleDeleteScreenshot(e, s.id)}
                            className="absolute top-0 right-0 bg-black/50 text-white p-0.5 opacity-0 hover:opacity-100 hover:bg-red-500"
                        >
                            <span className="material-symbols-outlined text-[10px] block">close</span>
                        </button>
                    </div>
                ))}
              </div>

              {activeScreenshot && (
                  <div className="bg-surface-darker p-4 rounded-xl border border-border-dark">
                      
                      {/* Small Promo Specific Controls for Adding/Removing Image */}
                      {activeTab === 'SMALL_TILE' ? (
                          <div className="flex flex-col gap-3 mb-4">
                              <input ref={smallTileInputRef} type="file" accept="image/*" className="hidden" onChange={handleSmallTileImageUpload} />
                              {(activeScreenshot.previewUrl || (activeScreenshot.contentMode === 'ICON' && logoUrl)) ? (
                                   <div className="flex gap-2">
                                       <button 
                                          onClick={() => updateActiveScreenshot({ previewUrl: '', contentMode: 'SCREENSHOT' })}
                                          className="flex-1 py-2 bg-red-900/20 text-red-400 border border-red-900/30 rounded-lg text-xs font-bold hover:bg-red-900/40 transition-colors flex items-center justify-center gap-2"
                                       >
                                           <span className="material-symbols-outlined text-sm">block</span>
                                           Remove Image
                                       </button>
                                   </div>
                              ) : (
                                   <div className="flex gap-2">
                                        <button 
                                            onClick={() => smallTileInputRef.current?.click()}
                                            className="flex-1 py-2 bg-surface-dark border border-border-dark hover:border-gray-500 rounded-lg text-xs font-bold text-gray-300 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <span className="material-symbols-outlined text-sm">upload</span>
                                            Add Image
                                        </button>
                                        {logoUrl && (
                                            <button 
                                                onClick={() => updateActiveScreenshot({ contentMode: 'ICON' })}
                                                className="flex-1 py-2 bg-surface-dark border border-border-dark hover:border-primary/50 rounded-lg text-xs font-bold text-primary transition-colors flex items-center justify-center gap-2"
                                            >
                                                <span className="material-symbols-outlined text-sm">token</span>
                                                Use Logo
                                            </button>
                                        )}
                                   </div>
                              )}
                          </div>
                      ) : (
                         <div className="flex gap-2 mb-4">
                              <button 
                                  onClick={() => updateActiveScreenshot({ contentMode: 'SCREENSHOT' })}
                                  className={`flex-1 py-1.5 text-xs font-bold rounded border ${activeScreenshot.contentMode === 'SCREENSHOT' ? 'bg-primary border-primary text-black' : 'border-border-dark text-gray-500'}`}
                               >
                                  Screenshot
                               </button>
                               <button 
                                  onClick={() => updateActiveScreenshot({ contentMode: 'ICON' })}
                                  className={`flex-1 py-1.5 text-xs font-bold rounded border ${activeScreenshot.contentMode === 'ICON' ? 'bg-primary border-primary text-black' : 'border-border-dark text-gray-500'}`}
                               >
                                  Logo/Icon
                               </button>
                          </div>
                      )}

                      <div className="flex items-center justify-between mb-4 border-t border-border-dark pt-4">
                          <div className="flex rounded-lg bg-surface-dark p-1 border border-border-dark flex-1 mr-2">
                            <button 
                                onClick={() => setControlTab('FRAME')}
                                className={`flex-1 py-1.5 text-xs font-bold rounded transition-colors ${controlTab === 'FRAME' ? 'bg-primary text-black' : 'text-gray-400 hover:text-white'}`}
                            >
                                Frame
                            </button>
                            <button 
                                onClick={() => setControlTab('IMAGE')}
                                className={`flex-1 py-1.5 text-xs font-bold rounded transition-colors ${controlTab === 'IMAGE' ? 'bg-primary text-black' : 'text-gray-400 hover:text-white'}`}
                            >
                                Image
                            </button>
                          </div>
                          {/* Reset Button */}
                          <button 
                            onClick={() => {
                                if (activeScreenshot) {
                                     // Hard reset for current active mode
                                     const template = activeTab === 'SMALL_TILE' ? 'CENTERED' : activeScreenshot.template;
                                     const defaultPos = DEFAULT_POSITIONS[template];
                                     const newPositions = {
                                         ...activeScreenshot.positions,
                                         [template]: { ...defaultPos }
                                     };
                                     updateActiveScreenshot({ positions: newPositions });
                                }
                            }}
                            className="bg-surface-dark border border-border-dark rounded-lg p-1.5 text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-colors"
                            title="Reset All for Template"
                          >
                             <span className="material-symbols-outlined text-lg">restart_alt</span>
                          </button>
                      </div>

                      {controlTab === 'FRAME' && (
                          <div className="space-y-4 animate-in fade-in slide-in-from-left-2 duration-300">
                             {renderControl('Size', pos.scale, 'scale', 0.1, 10.0, 0.05, '%')}
                             {renderControl('Position X', pos.x, 'x', -2000, 2000, 10, 'px')}
                             {renderControl('Position Y', pos.y, 'y', -2000, 2000, 10, 'px')}
                             {renderControl('Rotation', pos.rotate, 'rotate', -360, 360, 1, '°')}
                          </div>
                      )}

                      {controlTab === 'IMAGE' && (
                          <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
                             {renderControl('Zoom Content', pos.imgZoom, 'imgZoom', 0.1, 10.0, 0.05, '%')}
                             {renderControl('Pan Content X', pos.imgX, 'imgX', -2000, 2000, 10, 'px')}
                             {renderControl('Pan Content Y', pos.imgY, 'imgY', -2000, 2000, 10, 'px')}
                          </div>
                      )}

                      {/* Always Show Corner Roundness Control at the bottom */}
                      <div className="space-y-1 border-t border-border-dark pt-3 mt-3">
                            <div className="flex justify-between text-xs text-gray-400">
                                <span>Corner Roundness</span>
                                <span>{cornerRadius}px</span>
                            </div>
                            <input 
                                type="range" min="0" max="100" step="1"
                                value={cornerRadius}
                                onChange={(e) => setCornerRadius(parseInt(e.target.value))}
                                className="w-full accent-primary h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                            />
                      </div>
                  </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="p-4 border-t border-border-dark bg-surface-darker">
             <button 
                onClick={handleDownload}
                disabled={isDownloading}
                className="w-full py-3 bg-primary text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-white transition-colors shadow-lg disabled:opacity-50"
             >
                {isDownloading ? (
                    <>
                       <span className="material-symbols-outlined animate-spin">sync</span>
                       Exporting JPG...
                    </>
                ) : (
                    <>
                       <span className="material-symbols-outlined">download</span>
                       Download {activeConfig.width}x{activeConfig.height} JPG
                    </>
                )}
             </button>
        </div>
        </aside>

        {/* Main Preview Area */}
        <section className="flex-1 bg-surface-darker border border-border-dark rounded-2xl relative overflow-hidden flex flex-col shadow-2xl items-center justify-center">
          {/* Canvas Info Toolbar */}
          <div className="absolute top-4 bg-surface-dark rounded-full shadow-lg border border-border-dark px-4 py-2 flex items-center gap-4 z-20 pointer-events-none">
              <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                  {activeConfig.width}x{activeConfig.height} ({activeConfig.aspect})
              </span>
              <div className="h-3 w-px bg-border-dark"></div>
              <span className="text-[10px] text-gray-500">
                  Scale: {Math.round(scale * 100)}%
              </span>
          </div>

          {/* The Scalable Container */}
          <div 
              ref={containerRef}
              className="relative flex items-center justify-center overflow-hidden"
              style={{ width: '100%', height: '100%' }}
          >
              {/* THE MAIN CANVAS */}
              <div 
                  ref={captureRef}
                  className="relative shadow-2xl overflow-hidden shrink-0 transition-colors duration-500"
                  style={{
                      width: `${activeConfig.width}px`,
                      height: `${activeConfig.height}px`,
                      transform: `scale(${scale})`,
                      ...getBackgroundStyle()
                  }}
              >
                  {activeScreenshot ? (
                      <>
                          {/* 1. DEVICE TEMPLATE */}
                          {activeScreenshot.template === 'DEVICE' && activeTab !== 'SMALL_TILE' && (
                              <>
                                  <div className="absolute top-0 bottom-0 left-0 w-[50%] p-20 flex flex-col justify-center z-20">
                                      {renderTextContent()}
                                  </div>
                                  <div className="absolute top-1/2 -translate-y-1/2 left-[55%] z-10 origin-center">
                                       {renderScreenshotContainer('FIXED_HEIGHT', { heightPct: 70 }, true, 'top')}
                                  </div>
                                  <div className="absolute top-0 right-0 w-[55%] h-full bg-white/5 skew-x-12 transform translate-x-48 pointer-events-none border-l border-white/5"></div>
                              </>
                          )}

                          {/* 2. SPLIT TEMPLATE */}
                          {activeScreenshot.template === 'SPLIT' && activeTab !== 'SMALL_TILE' && (
                              <>
                                  <div className="absolute top-0 bottom-0 left-0 w-[45%] p-16 flex flex-col justify-center z-20">
                                       {renderTextContent()}
                                  </div>
                                  <div className="absolute top-[15%] right-[5%] z-10 origin-top-right">
                                       {renderScreenshotContainer('FIXED_WIDTH', { widthPct: 45 }, false, 'top')}
                                  </div>
                              </>
                          )}

                          {/* 3. CENTERED TEMPLATE - ENFORCED FOR SMALL TILE */}
                          {(activeScreenshot.template === 'CENTERED' || activeTab === 'SMALL_TILE') && (
                               <div className="absolute inset-0 flex flex-col items-center justify-between z-20 pt-12 pb-12">
                                   <div className="w-full text-center px-12">
                                       {renderTextContent('center')}
                                   </div>
                                   <div className="absolute top-[60%] left-1/2 -translate-x-1/2 z-10 origin-top">
                                       {renderScreenshotContainer('FIXED_WIDTH', { widthPct: 80 }, false, 'top')}
                                   </div>
                               </div>
                          )}

                          {/* 4. MINIMAL TEMPLATE */}
                          {activeScreenshot.template === 'MINIMAL' && activeTab !== 'SMALL_TILE' && (
                              <>
                                  <div className="absolute top-0 bottom-0 right-0 w-[50%] p-16 flex flex-col justify-center z-20">
                                      {renderTextContent('right')}
                                  </div>
                                  <div className="absolute top-[15%] left-[5%] z-10 origin-top-left">
                                      {renderScreenshotContainer('FIXED_WIDTH', { widthPct: 45 }, false, 'top')}
                                  </div>
                              </>
                          )}
                      </>
                  ) : (
                       <div className="absolute inset-0 flex flex-col items-center justify-center text-white/20">
                          <span className="material-symbols-outlined text-9xl mb-4">image</span>
                          <p className="text-2xl font-bold uppercase tracking-widest">No Content</p>
                      </div>
                  )}
              </div>
          </div>
        </section>
      </div>

       {/* Footer Action */}
       <div className="absolute bottom-0 left-0 right-0 bg-background-dark/95 backdrop-blur border-t border-border-dark p-6 px-10 flex justify-between items-center z-30">
         <span className="text-xs text-text-muted italic">
            Next: Generate Privacy Policy
         </span>
         <button 
           onClick={handleBatchRenderAndComplete}
           disabled={isBatchProcessing}
           className="h-12 px-8 rounded-full bg-primary text-background-dark font-bold text-base hover:bg-white hover:shadow-[0_0_20px_rgba(242,242,13,0.4)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
         >
           Save & Continue
           <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
         </button>
      </div>
    </div>
  );
};

export default ScreenshotStudio;