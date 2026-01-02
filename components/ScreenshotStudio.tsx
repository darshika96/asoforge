import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AnalysisResult, GeneratedName, BrandIdentity, ScreenshotData, StoreGraphicsPreferences, ScreenshotTemplate, ImagePosition } from '../types';
import { analyzeScreenshot, generateSmallTileCopy } from '../services/geminiService';
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
    savedMarquees?: ScreenshotData[]; // Kept for prop compatibility, but now shares screenshots state
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
    DEVICE: { scale: 1, x: 40, y: 0, rotate: 0, imgZoom: 1, imgX: 0, imgY: 0, textX: 0, textY: 0, headlineSize: 100, subheadlineSize: 100, logoSize: 100, showLogo: true, showName: true },
    SPLIT: { scale: 1, x: 0, y: 0, rotate: 0, imgZoom: 1, imgX: 0, imgY: 0, textX: 0, textY: 0, headlineSize: 100, subheadlineSize: 100, logoSize: 100, showLogo: true, showName: true },
    CENTERED: { scale: 1, x: 0, y: 0, rotate: 0, imgZoom: 1, imgX: 0, imgY: 0, textX: 0, textY: 0, headlineSize: 100, subheadlineSize: 100, logoSize: 100, showLogo: true, showName: true },
    OVERLAY: { scale: 1, x: 0, y: 0, rotate: 0, imgZoom: 1, imgX: 0, imgY: 0, textX: 0, textY: 0, headlineSize: 100, subheadlineSize: 100, logoSize: 100, showLogo: true, showName: true },
    MINIMAL: { scale: 1, x: 0, y: 0, rotate: 0, imgZoom: 1, imgX: 0, imgY: 0, textX: 0, textY: 0, headlineSize: 100, subheadlineSize: 100, logoSize: 100, showLogo: true, showName: true },
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

// HSL Utilities
const hexToHSL = (hex: string): { h: number; s: number; l: number } => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return { h: 0, s: 0, l: 0 };

    let r = parseInt(result[1], 16) / 255;
    let g = parseInt(result[2], 16) / 255;
    let b = parseInt(result[3], 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }

    return { h: h * 360, s: s * 100, l: l * 100 };
};

const hslToHex = (h: number, s: number, l: number): string => {
    s /= 100;
    l /= 100;
    const k = (n: number) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
    return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
};

// Generate 4 professional gradients from brand colors
const generateBrandGradients = (colors: BrandIdentity['colors']): string[] => {
    const gradients: string[] = [];

    // 1. Primary → Primary (lightness shift)
    const p1HSL = hexToHSL(colors.primary1);
    const lighterPrimary = hslToHex(
        p1HSL.h,
        Math.max(p1HSL.s - 8, p1HSL.s), // Keep saturation stable (max 12% drift)
        Math.min(p1HSL.l + 25, 75) // Increase lightness by 25% (within 18-30% range)
    );
    gradients.push(`linear-gradient(135deg, ${colors.primary1} 0%, ${lighterPrimary} 100%)`);

    // 2. Primary → Accent (complementary contrast)
    gradients.push(`linear-gradient(135deg, ${colors.primary1} 0%, ${colors.accent1} 100%)`);

    // 3. Accent → Accent (high-energy CTA)
    const a1HSL = hexToHSL(colors.accent1);
    const vibrantAccent = hslToHex(
        a1HSL.h,
        Math.min(a1HSL.s + 10, 90), // Slight saturation boost (within 12%)
        Math.max(a1HSL.l - 20, 40) // Darken for depth
    );
    gradients.push(`linear-gradient(135deg, ${vibrantAccent} 0%, ${colors.accent1} 100%)`);

    // 4. Subtle neutral-tinted (for large surfaces)
    const neutralTint = hslToHex(
        p1HSL.h, // Use primary hue for brand consistency
        15, // Very low saturation
        25  // Dark for contrast with white text
    );
    const lighterNeutral = hslToHex(
        p1HSL.h,
        12,
        45 // Lightness difference of 20%
    );
    gradients.push(`linear-gradient(135deg, ${neutralTint} 0%, ${lighterNeutral} 100%)`);

    return gradients;
};

// Island Component for sections
const Island: React.FC<{
    title: string;
    icon: string;
    children: React.ReactNode;
    defaultExpanded?: boolean;
    onToggle?: () => void;
}> = ({ title, icon, children, defaultExpanded = true }) => {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    return (
        <div className="bg-surface-darker/40 border border-border-dark rounded-2xl overflow-hidden mb-4 transition-all duration-300 shadow-sm hover:shadow-md hover:bg-surface-darker/60">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors hover:bg-white/5"
            >
                <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-xl text-primary/80">{icon}</span>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">{title}</h3>
                </div>
                <span className={`material-symbols-outlined transition-transform duration-300 text-gray-500 ${isExpanded ? 'rotate-180' : ''}`}>
                    keyboard_arrow_down
                </span>
            </button>
            <div className={`transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
                <div className="p-5 pt-0">
                    {children}
                </div>
            </div>
        </div>
    );
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

    // --- Font Loading Logic ---
    useEffect(() => {
        if (brandIdentity?.typography) {
            const { headingFont, bodyFont } = brandIdentity.typography;
            const fontsToLoad = [headingFont];
            if (bodyFont && bodyFont !== headingFont) fontsToLoad.push(bodyFont);

            if (fontsToLoad.length > 0) {
                const linkId = 'brand-fonts-stylesheet';
                if (!document.getElementById(linkId)) {
                    const link = document.createElement('link');
                    link.id = linkId;
                    link.rel = 'stylesheet';
                    link.href = `https://fonts.googleapis.com/css2?family=${fontsToLoad.map(f => f.replace(/\s+/g, '+')).join('&family=')}&display=swap`;
                    document.head.appendChild(link);
                }
            }
        }
    }, [brandIdentity]);

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
    }, [savedScreenshots]);

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
    const brandGradients = useMemo(() => generateBrandGradients(brandIdentity.colors), [brandIdentity.colors]);
    const [bgStyle, setBgStyle] = useState<'solid' | 'gradient' | 'mesh'>(savedPreferences?.bgStyle || 'mesh');
    const [selectedGradientIndex, setSelectedGradientIndex] = useState<number>(0);
    const [activeColor, setActiveColor] = useState(savedPreferences?.activeColor || brandIdentity.colors.accent1);

    const [cornerRadius, setCornerRadius] = useState<number>(32);
    const [headlineColor, setHeadlineColor] = useState<string>('#ffffff');
    const [subheadlineColor, setSubheadlineColor] = useState<string>('#ffffff');
    const [brandNameColor, setBrandNameColor] = useState<string>('#ffffff');
    const [highlightColor, setHighlightColor] = useState<string>(brandIdentity.colors.highlight_neon || brandIdentity.colors.accent1);
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
            // Try to find corresponding marquee for currently active screenshot
            const correspondingMarqueeId = activeScreenshotId ? (activeScreenshotId.startsWith('mq_') ? activeScreenshotId : 'mq_' + activeScreenshotId) : null;
            if (correspondingMarqueeId && marquees.find(m => m.id === correspondingMarqueeId)) {
                setActiveScreenshotId(correspondingMarqueeId);
            } else if (marquees.length > 0) {
                setActiveScreenshotId(marquees[0].id);
            }
        } else if (activeTab === 'SCREENSHOTS') {
            // Try to find corresponding screenshot for currently active marquee
            const correspondingScreenshotId = activeScreenshotId ? (activeScreenshotId.startsWith('mq_') ? activeScreenshotId.substring(3) : activeScreenshotId) : null;
            if (correspondingScreenshotId && screenshots.find(s => s.id === correspondingScreenshotId)) {
                setActiveScreenshotId(correspondingScreenshotId);
            } else if (screenshots.length > 0) {
                setActiveScreenshotId(screenshots[0].id);
            }
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
        setHeadlineColor(contrast);
        setSubheadlineColor(contrast);
        setBrandNameColor(contrast);
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

                            // Update the collections
                            if (activeTab === 'SMALL_TILE') {
                                setSmallTiles(prev => [...prev, newScreenshot]);
                            } else if (activeTab === 'SCREENSHOTS') {
                                // Screenshots tab: Seed both
                                setScreenshots(prev => [...prev, newScreenshot]);

                                const newMarquee: ScreenshotData = {
                                    ...newScreenshot,
                                    id: 'mq_' + newId,
                                    template: 'SPLIT',
                                    positions: JSON.parse(JSON.stringify(DEFAULT_POSITIONS))
                                };
                                setMarquees(prev => [...prev, newMarquee]);
                            } else if (activeTab === 'MARQUEE') {
                                // Marquee tab: Independent upload
                                setMarquees(prev => [...prev, { ...newScreenshot, id: 'mq_' + newId, template: 'SPLIT' }]);
                            }

                            setActiveScreenshotId(activeTab === 'MARQUEE' ? 'mq_' + newId : newId);
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

        // Remove from current collection ONLY (Independent deletion)
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

    const handleAddSmallTile = () => {
        const timestamp = Date.now();
        const newId = `st_${timestamp}_${smallTiles.length + 1}`;
        const newSmallTile: ScreenshotData = {
            id: newId,
            file: null,
            previewUrl: '',
            headline: 'New Promo',
            subheadline: '',
            highlightText: '',
            isStylized: false,
            naturalWidth: 512,
            naturalHeight: 512,
            template: 'CENTERED',
            textAlign: 'center',
            contentMode: 'SCREENSHOT',
            positions: JSON.parse(JSON.stringify(DEFAULT_POSITIONS))
        };
        setSmallTiles(prev => [...prev, newSmallTile]);
        setActiveScreenshotId(newId);
    };

    const runAnalysis = async (shot: ScreenshotData) => {
        setIsAnalyzing(true);
        const loadingState = { ...shot, headline: 'Analyzing...', subheadline: 'AI is reading screenshot...', highlightText: '' };
        updateCollection(prev => prev.map(s => s.id === shot.id ? loadingState : s));

        try {
            let result;
            if (activeTab === 'SMALL_TILE') {
                result = await generateSmallTileCopy(analysis, selectedName.name, shortDescription);
            } else {
                const imgToAnalyze = shot.contentMode === 'ICON' && logoUrl ? logoUrl : shot.previewUrl;
                result = await analyzeScreenshot(imgToAnalyze || shot.previewUrl, selectedName.name, analysis.tone);
            }

            const updatedShot = {
                ...shot,
                headline: result.headline,
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
        const pos = getCurrentPosition();
        const align = activeTab === 'SMALL_TILE' ? 'center' : (forcedAlign || activeScreenshot.textAlign || 'left');
        const fullText = activeScreenshot.headline || '';
        const highlight = activeScreenshot.highlightText?.trim();
        const isSmallTile = activeTab === 'SMALL_TILE';
        const isMarquee = activeTab === 'MARQUEE';

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
                                    className={`absolute w-[110%] ${isSmallTile ? 'h-[16px] bottom-[-2px]' : 'h-[30px] bottom-[-5px]'} -left-[5%] z-0 opacity-80`}
                                    viewBox="0 0 350 50"
                                    preserveAspectRatio="none"
                                    style={{ color: highlightColor }}
                                >
                                    <path d={BRUSH_STROKE_PATH} stroke="currentColor" strokeWidth={isSmallTile ? "12" : "20"} fill="none" strokeLinecap="round" />
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

        const titleSize = isSmallTile ? 'text-4xl' : (isMarquee ? 'text-6xl' : 'text-8xl');
        const subSize = isSmallTile ? 'text-lg' : (isMarquee ? 'text-2xl' : 'text-4xl');

        // Apply scale modifiers
        const headlineStyle = {
            color: headlineColor,
            fontSize: `calc(${isSmallTile ? '2rem' : (isMarquee ? '5rem' : '6rem')} * ${pos.headlineSize / 100})`,
            fontFamily: brandIdentity?.typography?.headingFont || 'Inter'
        };
        const subheadlineStyle = {
            color: subheadlineColor,
            fontSize: `calc(${isSmallTile ? '0.85rem' : (isMarquee ? '1.5rem' : '2.25rem')} * ${pos.subheadlineSize / 100})`,
            fontFamily: brandIdentity?.typography?.bodyFont || brandIdentity?.typography?.headingFont || 'Inter'
        };

        return (
            <div
                className={`flex flex-col ${isSmallTile ? 'gap-2 py-6 px-10' : (isMarquee ? 'gap-4 py-8 px-6' : 'gap-6')} z-30 relative w-full ${align === 'center' ? 'items-center text-center' : align === 'right' ? 'items-end text-right' : 'items-start text-left'}`}
                style={{
                    transform: `translate(${pos.textX}px, ${pos.textY}px)`
                }}
            >
                {(pos.showLogo || pos.showName) && (
                    <div className={`flex items-center ${isSmallTile ? 'gap-2 p-2' : (isMarquee ? 'gap-3 px-6 py-3' : 'gap-4 px-4 py-3')} bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 w-max shadow-lg`}
                        style={{ transform: `scale(${(isSmallTile ? 1.1 : (isMarquee ? 0.8 : 1)) * pos.logoSize / 100})`, transformOrigin: align === 'center' ? 'center' : align === 'right' ? 'right' : 'left' }}>
                        {pos.showLogo && (
                            logoUrl ? (
                                <img src={logoUrl} alt="Logo" className="size-12 rounded-lg shadow-sm bg-surface-dark object-cover" />
                            ) : (
                                <div className="size-12 bg-primary rounded-lg flex items-center justify-center font-bold text-black text-2xl">
                                    {(selectedName?.name || 'A').charAt(0)}
                                </div>
                            )
                        )}
                        {pos.showName && activeTab !== 'SMALL_TILE' && (
                            <span style={{ color: brandNameColor, fontFamily: brandIdentity?.typography?.headingFont || 'Inter' }} className="font-bold tracking-wide uppercase text-xl opacity-100 font-display transition-colors whitespace-nowrap">{selectedName?.name || 'App Name'}</span>
                        )}
                    </div>
                )}

                <h1
                    style={headlineStyle}
                    className={`font-black leading-[0.9] drop-shadow-xl font-display tracking-tight transition-all ${isMarquee ? 'max-w-6xl' : 'max-w-4xl'}`}
                >
                    {headlineContent}
                </h1>

                <p
                    style={subheadlineStyle}
                    className="font-medium leading-normal font-body max-w-2xl opacity-90 transition-all"
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
            // Blend the selected gradient with activeColor for user control
            return {
                backgroundColor: activeColor,
                backgroundImage: brandGradients[selectedGradientIndex] || brandGradients[0],
                backgroundBlendMode: 'overlay' as const
            };
        }
        if (bgStyle === 'mesh') {
            return {
                backgroundColor: activeColor,
                backgroundImage: `
                    radial-gradient(circle at 0% 0%, ${brandIdentity.colors.primary2}99 0%, transparent 40%),
                    radial-gradient(circle at 100% 0%, ${brandIdentity.colors.accent1}99 0%, transparent 40%),
                    radial-gradient(circle at 100% 100%, ${brandIdentity.colors.primary1}99 0%, transparent 40%),
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

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                        {/* 1. CREATE BANNERS SECTION */}
                        <Island title="Create Banners" icon="add_box">
                            <div className="space-y-4">
                                <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                                    {/* Create Button */}
                                    <div
                                        onClick={() => {
                                            if (activeTab === 'SMALL_TILE') handleAddSmallTile();
                                            else fileInputRef.current?.click();
                                        }}
                                        className="shrink-0 size-16 rounded-lg border border-dashed border-primary/50 bg-primary/5 hover:border-primary hover:bg-primary/10 flex items-center justify-center cursor-pointer transition-colors group"
                                        title={activeTab === 'SMALL_TILE' ? "Add New Banner" : "Upload Screenshot"}
                                    >
                                        <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileUpload} />
                                        <span className="material-symbols-outlined text-primary/60 group-hover:text-primary transition-colors">
                                            {activeTab === 'SMALL_TILE' ? 'add_box' : 'add_photo_alternate'}
                                        </span>
                                    </div>
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
                                    <div className="bg-surface-dark/40 p-4 rounded-xl border border-border-dark">
                                        {/* Mode Selector */}
                                        {activeTab === 'SMALL_TILE' ? (
                                            <div className="flex flex-col gap-3 mb-4">
                                                <input ref={smallTileInputRef} type="file" accept="image/*" className="hidden" onChange={handleSmallTileImageUpload} />
                                                {(activeScreenshot.previewUrl || (activeScreenshot.contentMode === 'ICON' && logoUrl)) ? (
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => updateActiveScreenshot({ previewUrl: '', contentMode: 'SCREENSHOT' })}
                                                            className="flex-1 py-1.5 bg-red-900/10 text-red-400 border border-red-900/20 rounded-lg text-[10px] font-bold hover:bg-red-900/20 transition-colors flex items-center justify-center gap-2"
                                                        >
                                                            Remove Image
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => smallTileInputRef.current?.click()}
                                                            className="flex-1 py-1.5 bg-surface-dark border border-border-dark hover:border-gray-500 rounded-lg text-[10px] font-bold text-gray-300 transition-colors flex items-center justify-center gap-1"
                                                        >
                                                            <span className="material-symbols-outlined text-xs">upload</span>
                                                            Internal Upload
                                                        </button>
                                                        {logoUrl && (
                                                            <button
                                                                onClick={() => updateActiveScreenshot({ contentMode: 'ICON' })}
                                                                className="flex-1 py-1.5 bg-surface-dark border border-border-dark hover:border-primary/50 rounded-lg text-[10px] font-bold text-primary transition-colors flex items-center justify-center gap-1"
                                                            >
                                                                <span className="material-symbols-outlined text-xs">token</span>
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
                                                    className={`flex-1 py-1.5 text-[10px] font-bold rounded border ${activeScreenshot.contentMode === 'SCREENSHOT' ? 'bg-primary border-primary text-black' : 'border-border-dark text-gray-500'}`}
                                                >
                                                    Screenshot
                                                </button>
                                                <button
                                                    onClick={() => updateActiveScreenshot({ contentMode: 'ICON' })}
                                                    className={`flex-1 py-1.5 text-[10px] font-bold rounded border ${activeScreenshot.contentMode === 'ICON' ? 'bg-primary border-primary text-black' : 'border-border-dark text-gray-500'}`}
                                                >
                                                    Logo/Icon
                                                </button>
                                            </div>
                                        )}

                                        {/* Existing Transformation Controls (The Tabbed View) */}
                                        {/* ... This part is already in Sidebar controls below ... */}
                                    </div>
                                )}
                            </div>
                        </Island>

                        {/* 2. CONTENT & TEXT SECTION */}
                        <Island title="Content & Text" icon="title">
                            <div className="space-y-4">
                                <button
                                    onClick={() => activeScreenshot && runAnalysis(activeScreenshot)}
                                    disabled={!activeScreenshot || isAnalyzing}
                                    className="w-full py-2 bg-surface-darker hover:bg-white hover:text-black border border-primary/30 hover:border-transparent text-primary text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-2 mb-2 disabled:opacity-50"
                                >
                                    {isAnalyzing ? "Analyzing..." : (activeTab === 'SMALL_TILE' ? "Generate Short Copy" : "AI Text Generation")}
                                </button>

                                <div className="space-y-3">
                                    <input
                                        className="block w-full rounded-xl border-border-dark bg-surface-darker shadow-sm focus:border-primary focus:ring-primary text-xs p-3 text-white placeholder-gray-600"
                                        value={activeScreenshot?.headline || ''}
                                        onChange={(e) => updateActiveScreenshot({ headline: e.target.value })}
                                        placeholder="Headline"
                                    />
                                    <input
                                        className="block w-full rounded-xl border-border-dark bg-surface-darker shadow-sm focus:border-primary focus:ring-primary text-xs p-3 text-white placeholder-gray-600"
                                        value={activeScreenshot?.highlightText || ''}
                                        onChange={(e) => updateActiveScreenshot({ highlightText: e.target.value })}
                                        placeholder="Highlight Text (Exact Match)"
                                    />
                                    <textarea
                                        className="block w-full rounded-xl border-border-dark bg-surface-darker shadow-sm focus:border-primary focus:ring-primary text-xs p-3 text-white placeholder-gray-600 resize-none"
                                        rows={2}
                                        value={activeScreenshot?.subheadline || ''}
                                        onChange={(e) => updateActiveScreenshot({ subheadline: e.target.value })}
                                        placeholder="Subheadline"
                                    />

                                    {activeTab !== 'SMALL_TILE' && (
                                        <div className="flex bg-surface-dark/50 rounded-lg border border-border-dark p-1">
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
                                    )}

                                    {/* Text Transformation & Offsets */}
                                    <div className="pt-4 border-t border-border-dark space-y-4">
                                        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Text Adjustments</h4>
                                        {renderControl('Text X Offset', pos.textX, 'textX', -1000, 1000, 5, 'px')}
                                        {renderControl('Text Y Offset', pos.textY, 'textY', -1000, 1000, 5, 'px')}
                                        <div className="grid grid-cols-2 gap-4">
                                            {renderControl('Headline Size', pos.headlineSize, 'headlineSize', 10, 300, 1, '%')}
                                            {renderControl('Subheadline Size', pos.subheadlineSize, 'subheadlineSize', 10, 300, 1, '%')}
                                        </div>
                                    </div>

                                    {/* Logo & Header */}
                                    <div className="pt-4 border-t border-border-dark space-y-3">
                                        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Logo & Header</h4>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                onClick={() => updateCurrentPosition({ showLogo: !pos.showLogo })}
                                                className={`py-2 px-3 rounded-lg border text-[10px] font-bold transition-all ${pos.showLogo ? 'bg-primary/20 border-primary text-primary' : 'bg-surface-dark border-border-dark text-gray-500'}`}
                                            >
                                                Logo: {pos.showLogo ? 'ON' : 'OFF'}
                                            </button>
                                            <button
                                                onClick={() => updateCurrentPosition({ showName: !pos.showName })}
                                                className={`py-2 px-3 rounded-lg border text-[10px] font-bold transition-all ${pos.showName ? 'bg-primary/20 border-primary text-primary' : 'bg-surface-dark border-border-dark text-gray-500'}`}
                                            >
                                                Name: {pos.showName ? 'ON' : 'OFF'}
                                            </button>
                                        </div>
                                        {renderControl('Header Scale', pos.logoSize, 'logoSize', 50, 200, 1, '%')}
                                    </div>
                                </div>
                            </div>
                        </Island>

                        {/* 3. COLOR & STYLE SECTION */}
                        <Island title="Color & Style" icon="palette">
                            <div className="space-y-6">
                                {/* Background Styling */}
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Background Style</h4>
                                    <div className="flex bg-surface-dark rounded-lg p-1 border border-border-dark">
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

                                    {bgStyle === 'gradient' && (
                                        <div className="grid grid-cols-2 gap-1.5">
                                            {[
                                                { label: 'Primary Shift', idx: 0 },
                                                { label: 'Primary→Accent', idx: 1 },
                                                { label: 'Accent Energy', idx: 2 },
                                                { label: 'Neutral Tint', idx: 3 }
                                            ].map((grad) => (
                                                <button
                                                    key={grad.idx}
                                                    onClick={() => setSelectedGradientIndex(grad.idx)}
                                                    className={`relative p-2 rounded-lg border text-left transition-all overflow-hidden ${selectedGradientIndex === grad.idx ? 'border-primary' : 'border-border-dark'}`}
                                                >
                                                    <div className="absolute inset-0 opacity-20" style={{ backgroundImage: brandGradients[grad.idx] }} />
                                                    <span className="relative z-10 text-[10px] font-bold">{grad.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    <div className="flex flex-wrap items-center justify-center gap-2">
                                        {[
                                            brandIdentity.colors.primary1,
                                            brandIdentity.colors.primary2,
                                            brandIdentity.colors.accent1,
                                            brandIdentity.colors.accent2,
                                            brandIdentity.colors.neutral_black,
                                            brandIdentity.colors.neutral_white,
                                            brandIdentity.colors.neutral_gray,
                                            '#000000'
                                        ].map((c) => (
                                            <button
                                                key={c}
                                                onClick={() => setActiveColor(c)}
                                                className={`size-6 rounded-full border border-white/10 ${activeColor === c ? 'ring-2 ring-primary ring-offset-2 ring-offset-surface-dark' : ''}`}
                                                style={{ backgroundColor: c }}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Text & Element Colors */}
                                <div className="pt-6 border-t border-border-dark space-y-4">
                                    <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Text & Element Colors</h4>

                                    {[
                                        { label: 'Headline', color: headlineColor, setter: setHeadlineColor },
                                        { label: 'Subheadline', color: subheadlineColor, setter: setSubheadlineColor },
                                        { label: 'Brand Name', color: brandNameColor, setter: setBrandNameColor },
                                        { label: 'Highlight/Brush', color: highlightColor, setter: setHighlightColor }
                                    ].map((item) => (
                                        <div key={item.label} className="flex justify-between items-center">
                                            <span className="text-[10px] text-gray-400 font-bold uppercase">{item.label}</span>
                                            <div className="flex flex-wrap gap-1 justify-end max-w-[150px]">
                                                {[
                                                    brandIdentity.colors.neutral_white,
                                                    brandIdentity.colors.neutral_black,
                                                    brandIdentity.colors.primary1,
                                                    brandIdentity.colors.primary2,
                                                    brandIdentity.colors.accent1,
                                                    brandIdentity.colors.highlight_neon
                                                ].map(c => (
                                                    <button
                                                        key={c}
                                                        onClick={() => item.setter(c)}
                                                        className={`size-4 rounded-full border border-white/20 ${item.color === c ? 'ring-1 ring-primary ring-offset-1 ring-offset-surface-dark' : ''}`}
                                                        style={{ backgroundColor: c }}
                                                    />
                                                ))}
                                                <div className="relative size-4">
                                                    <input type="color" value={item.color} onChange={(e) => item.setter(e.target.value)} className="size-4 opacity-0 absolute inset-0 cursor-pointer z-10" />
                                                    <span className="material-symbols-outlined text-xs text-gray-500 absolute inset-0 flex items-center justify-center">palette</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </Island>

                        {/* 4. IMAGE & POSITION SECTION */}
                        <Island title="Image & Position" icon="tune" defaultExpanded={false}>
                            <div className="space-y-4">
                                <div className="flex items-center mb-4 bg-surface-darker/50 p-1 rounded-lg border border-white/5">
                                    <div className="flex rounded-lg bg-surface-dark p-1 border border-border-dark flex-1">
                                        {(['FRAME', 'IMAGE'] as const).map((t) => (
                                            <button
                                                key={t}
                                                onClick={() => setControlTab(t as any)}
                                                className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded transition-colors ${controlTab === t ? 'bg-primary text-black' : 'text-gray-400 hover:text-white'}`}
                                            >
                                                {t}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {controlTab === 'FRAME' && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-left-2 duration-300">
                                        {renderControl('Size', pos.scale, 'scale', 0.1, 10.0, 0.05, '%')}
                                        {renderControl('Position X', pos.x, 'x', -2000, 2000, 10, 'px')}
                                        {renderControl('Position Y', pos.y, 'y', -2000, 2000, 10, 'px')}
                                        {renderControl('Rotation', pos.rotate, 'rotate', -360, 360, 1, '°')}
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

                                {controlTab === 'IMAGE' && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
                                        {renderControl('Zoom Content', pos.imgZoom, 'imgZoom', 0.1, 10.0, 0.05, '%')}
                                        {renderControl('Pan Content X', pos.imgX, 'imgX', -2000, 2000, 10, 'px')}
                                        {renderControl('Pan Content Y', pos.imgY, 'imgY', -2000, 2000, 10, 'px')}
                                    </div>
                                )}
                            </div>
                        </Island>

                        {/* 5. COMPOSITION SECTION (Renamed from Layout) */}
                        {activeTab !== 'SMALL_TILE' && (
                            <Island title="Composition" icon="dashboard_customize">
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { id: 'DEVICE', label: 'Device Mockup', sub: 'Vertical Screen', icon: 'phone_iphone' },
                                        { id: 'SPLIT', label: 'Left Text', sub: 'Vertical Screen', icon: 'format_align_left' },
                                        { id: 'CENTERED', label: 'Centered', sub: 'Vertical Screen', icon: 'align_horizontal_center' },
                                        { id: 'MINIMAL', label: 'Right Text', sub: 'Vertical Screen', icon: 'format_align_right' },
                                    ].map((t) => (
                                        <button
                                            key={t.id}
                                            onClick={() => updateActiveScreenshot({ template: t.id as ScreenshotTemplate })}
                                            className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border transition-all ${activeScreenshot?.template === t.id ? 'bg-primary/10 border-primary text-primary' : 'bg-surface-dark border-border-dark text-gray-400 hover:border-gray-500'}`}
                                        >
                                            <span className="material-symbols-outlined text-xl">{t.icon}</span>
                                            <span className="text-[10px] font-bold uppercase text-center">{t.label}</span>
                                            <span className="text-[8px] opacity-60 text-center leading-tight">{t.sub}</span>
                                        </button>
                                    ))}
                                </div>
                            </Island>
                        )}
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
                                            <div className={`absolute top-0 bottom-0 left-0 ${activeTab === 'MARQUEE' ? 'w-[45%] p-24' : 'w-[50%] p-20'} flex flex-col justify-center z-20`}>
                                                {renderTextContent()}
                                            </div>
                                            <div className={`absolute top-1/2 -translate-y-1/2 ${activeTab === 'MARQUEE' ? 'left-[50%]' : 'left-[55%]'} z-10 origin-center`}>
                                                {renderScreenshotContainer('FIXED_HEIGHT', { heightPct: activeTab === 'MARQUEE' ? 85 : 70 }, true, 'top')}
                                            </div>
                                            <div className="absolute top-0 right-0 w-[55%] h-full bg-white/5 skew-x-12 transform translate-x-48 pointer-events-none border-l border-white/5"></div>
                                        </>
                                    )}

                                    {/* 2. SPLIT TEMPLATE */}
                                    {activeScreenshot.template === 'SPLIT' && activeTab !== 'SMALL_TILE' && (
                                        <>
                                            <div className={`absolute top-0 bottom-0 left-0 ${activeTab === 'MARQUEE' ? 'w-[40%] p-24' : 'w-[45%] p-16'} flex flex-col justify-center z-20`}>
                                                {renderTextContent()}
                                            </div>
                                            <div className={`absolute top-[15%] ${activeTab === 'MARQUEE' ? 'right-[10%]' : 'right-[5%]'} z-10 origin-top-right`}>
                                                {renderScreenshotContainer('FIXED_WIDTH', { widthPct: activeTab === 'MARQUEE' ? 35 : 45 }, false, 'top')}
                                            </div>
                                        </>
                                    )}

                                    {/* 3. CENTERED TEMPLATE - ENFORCED FOR SMALL TILE */}
                                    {(activeScreenshot.template === 'CENTERED' || activeTab === 'SMALL_TILE') && (
                                        <div className={`absolute inset-0 flex flex-col items-center ${activeTab === 'SMALL_TILE' ? 'justify-center px-8' : 'justify-between pt-12 pb-12'} z-20`}>
                                            <div className={`w-full text-center ${activeTab === 'MARQUEE' ? 'px-32' : 'px-4'}`}>
                                                {renderTextContent('center')}
                                            </div>
                                            {activeTab !== 'SMALL_TILE' && (
                                                <div className="absolute top-[60%] left-1/2 -translate-x-1/2 z-10 origin-top">
                                                    {renderScreenshotContainer('FIXED_WIDTH', { widthPct: activeTab === 'MARQUEE' ? 60 : 80 }, false, 'top')}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* 4. MINIMAL TEMPLATE */}
                                    {activeScreenshot.template === 'MINIMAL' && activeTab !== 'SMALL_TILE' && (
                                        <>
                                            <div className={`absolute top-0 bottom-0 right-0 ${activeTab === 'MARQUEE' ? 'w-[45%] p-24' : 'w-[50%] p-16'} flex flex-col justify-center z-20`}>
                                                {renderTextContent('right')}
                                            </div>
                                            <div className={`absolute top-[15%] ${activeTab === 'MARQUEE' ? 'left-[10%]' : 'left-[5%]'} z-10 origin-top-left`}>
                                                {renderScreenshotContainer('FIXED_WIDTH', { widthPct: activeTab === 'MARQUEE' ? 35 : 45 }, false, 'top')}
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