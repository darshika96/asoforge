import React, { useState, useEffect } from 'react';
import { AnalysisResult, GeneratedName, GeneratedAsset, BrandIdentity } from '../types';
import { generateImagePrompt, generateImageFromPrompt, generateBrandIdentity, analyzeStyleReference } from '../services/geminiService';

interface BrandViewProps {
    analysis: AnalysisResult;
    selectedName: GeneratedName;
    savedIdentity: BrandIdentity | null;
    savedAssets: GeneratedAsset[];
    onComplete: (assets: GeneratedAsset[], identity: BrandIdentity | null) => void;
}

const styles = [
    { id: 'Modern Mascot', icon: 'mood', label: 'Modern Mascot', desc: 'Soft 3D mascot, friendly face' },
    { id: '3D Shapes', icon: 'view_in_ar', label: '3D Shapes', desc: 'Premium 3D objects & symbols' },
    { id: '3D Letter', icon: 'abc', label: '3D Letter', desc: 'Bold typography, rendered, premium' },
    { id: 'Modern Minimalist', icon: 'crop_square', label: 'Minimalist', desc: 'Flat vector, negative space, clean' },
    { id: 'Abstract', icon: 'blur_on', label: 'Abstract Concept', desc: 'Nodes, neon, futuristic flow' },
];

const BrandView: React.FC<BrandViewProps> = ({ analysis, selectedName, savedIdentity, savedAssets, onComplete }) => {
    // Core State
    const [selectedStyle, setSelectedStyle] = useState(styles[0].id);
    const [identity, setIdentity] = useState<BrandIdentity | null>(savedIdentity);
    const [unifiedPrompt, setUnifiedPrompt] = useState<string>('');
    const [styleRefBase64, setStyleRefBase64] = useState<string | null>(null);
    const [styleRefDescription, setStyleRefDescription] = useState<string>('');
    const [isAnalyzingStyle, setIsAnalyzingStyle] = useState(false);

    // New Control State
    const [brandGuidance, setBrandGuidance] = useState('');
    const [isEditingColors, setIsEditingColors] = useState(false);
    const [iconSubject, setIconSubject] = useState('');
    const [bgColorOverride, setBgColorOverride] = useState('');
    const [subjectColorOverride, setSubjectColorOverride] = useState('');

    // Asset State
    const [iconVariants, setIconVariants] = useState<string[]>([]);
    const [selectedIconIndex, setSelectedIconIndex] = useState<number | null>(null);
    const [resizedIcons, setResizedIcons] = useState<GeneratedAsset[]>([]);

    // Processing Flags
    const [isGeneratingIdentity, setIsGeneratingIdentity] = useState(false);
    const [isOptimizingPrompt, setIsOptimizingPrompt] = useState(false);
    const [isGeneratingAssets, setIsGeneratingAssets] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Initialize from saved state
    useEffect(() => {
        if (savedAssets.length > 0) {
            const icon = savedAssets.find(a => a.usage === 'ICON_MAIN');
            const resized = savedAssets.filter(a => a.usage === 'ICON_RESIZED');

            if (icon) {
                setIconVariants([icon.url]);
                setSelectedIconIndex(0);
                setUnifiedPrompt(icon.promptUsed);
            }
            if (resized.length > 0) setResizedIcons(resized);
        }
    }, [savedAssets]);

    // Initialize color overrides when identity changes
    useEffect(() => {
        if (identity) {
            // Smart Defaults: Primary 1 for BG, Accent 1 for Subject
            if (!bgColorOverride) setBgColorOverride(identity.colors.primary1 || '#000000');
            if (!subjectColorOverride) setSubjectColorOverride(identity.colors.accent1 || '#ffffff');
        }
    }, [identity]);

    // --- Logic: Identity Generation ---
    const handleGenerateIdentity = async () => {
        setIsGeneratingIdentity(true);
        setError(null);
        try {
            const result = await generateBrandIdentity(analysis, selectedName.name, brandGuidance);
            setIdentity(result);
            // Reset overrides to new defaults
            setBgColorOverride(result.colors.primary1 || '#000000');
            setSubjectColorOverride(result.colors.accent1 || '#ffffff');
        } catch (e: any) {
            setError(e.message || "Failed to generate identity");
        } finally {
            setIsGeneratingIdentity(false);
        }
    };

    const handleColorChange = (key: string, value: string) => {
        if (!identity) return;
        setIdentity({
            ...identity,
            colors: {
                ...identity.colors,
                [key]: value
            }
        });
    };

    // Helper to get all brand colors as flat array for quick-picker
    const getBrandColors = () => {
        if (!identity) return [];
        return [
            identity.colors.primary1,
            identity.colors.primary2,
            identity.colors.accent1,
            identity.colors.accent2,
            identity.colors.neutral_white,
            identity.colors.neutral_black,
            identity.colors.highlight_neon
        ].filter(Boolean) as string[];
    };

    // --- Logic: Prompt Optimization ---
    const handleOptimizePrompt = async () => {
        setIsOptimizingPrompt(true);
        setError(null);
        try {
            // We pass the analyzed style description if it exists
            const prompt = await generateImagePrompt(
                selectedStyle,
                analysis,
                selectedName.name,
                'ICON',
                identity,
                styleRefDescription,
                iconSubject,
                bgColorOverride,
                subjectColorOverride
            );
            setUnifiedPrompt(prompt);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsOptimizingPrompt(false);
        }
    };

    const handleStyleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const base64 = event.target?.result as string;
            setStyleRefBase64(base64);

            // Auto-analyze style
            setIsAnalyzingStyle(true);
            try {
                const description = await analyzeStyleReference(base64);
                setStyleRefDescription(description);
            } catch (err) {
                console.error("Style analysis failed", err);
            } finally {
                setIsAnalyzingStyle(false);
            }
        };
        reader.readAsDataURL(file);
    };

    // --- Logic: Unified Asset Generation ---
    const handleUnifiedGeneration = async () => {
        if (!unifiedPrompt) {
            setError("Please draft a prompt first using the 'Draft Prompt' button.");
            return;
        }
        setIsGeneratingAssets(true);
        setError(null);
        setIconVariants([]);
        setSelectedIconIndex(null);
        setResizedIcons([]);

        try {
            // Generate 4 variants in parallel, passing the style reference image if it exists
            const results = await Promise.all([
                generateImageFromPrompt(unifiedPrompt, '1:1', styleRefBase64),
                generateImageFromPrompt(unifiedPrompt, '1:1', styleRefBase64),
                generateImageFromPrompt(unifiedPrompt, '1:1', styleRefBase64),
                generateImageFromPrompt(unifiedPrompt, '1:1', styleRefBase64)
            ]);

            setIconVariants(results);
            // Default select the first one
            setSelectedIconIndex(0);
            await generateIconSizes(results[0]);

        } catch (e: any) {
            setError(e.message || "Failed to generate assets");
        } finally {
            setIsGeneratingAssets(false);
        }
    };

    const handleSelectVariant = async (index: number) => {
        setSelectedIconIndex(index);
        await generateIconSizes(iconVariants[index]);
    };

    const generateIconSizes = async (originalUrl: string) => {
        const sizes = [128, 48, 32, 16];
        const newAssets: GeneratedAsset[] = [];

        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = originalUrl;

        await new Promise((resolve) => {
            img.onload = () => {
                sizes.forEach(size => {
                    const canvas = document.createElement('canvas');
                    canvas.width = size;
                    canvas.height = size;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.imageSmoothingEnabled = true;
                        ctx.imageSmoothingQuality = 'high';

                        // Apply rounded corners (Squircle-like)
                        const radius = size * 0.22; // Professional rounding radius
                        ctx.beginPath();
                        ctx.moveTo(radius, 0);
                        ctx.lineTo(size - radius, 0);
                        ctx.quadraticCurveTo(size, 0, size, radius);
                        ctx.lineTo(size, size - radius);
                        ctx.quadraticCurveTo(size, size, size - radius, size);
                        ctx.lineTo(radius, size);
                        ctx.quadraticCurveTo(0, size, 0, size - radius);
                        ctx.lineTo(0, radius);
                        ctx.quadraticCurveTo(0, 0, radius, 0);
                        ctx.closePath();
                        ctx.clip();

                        ctx.drawImage(img, 0, 0, size, size);

                        newAssets.push({
                            id: `icon-${size}`,
                            usage: 'ICON_RESIZED',
                            url: canvas.toDataURL('image/png'),
                            promptUsed: unifiedPrompt,
                            dimensions: `${size}x${size}`
                        });
                    }
                });
                resolve(true);
            };
            img.onerror = () => resolve(false);
        });
        setResizedIcons(newAssets);
    };

    const handleComplete = async () => {
        if (selectedIconIndex === null) return;

        setIsGeneratingAssets(true);
        try {
            // Process the main icon (1024x1024) with rounded corners
            const mainImg = new Image();
            mainImg.crossOrigin = "anonymous";
            mainImg.src = iconVariants[selectedIconIndex];

            const mainRoundedUrl = await new Promise<string>((resolve) => {
                mainImg.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = 1024;
                    canvas.height = 1024;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        const size = 1024;
                        const radius = size * 0.22;
                        ctx.beginPath();
                        ctx.moveTo(radius, 0);
                        ctx.lineTo(size - radius, 0);
                        ctx.quadraticCurveTo(size, 0, size, radius);
                        ctx.lineTo(size, size - radius);
                        ctx.quadraticCurveTo(size, size, size - radius, size);
                        ctx.lineTo(radius, size);
                        ctx.quadraticCurveTo(0, size, 0, size - radius);
                        ctx.lineTo(0, radius);
                        ctx.quadraticCurveTo(0, 0, radius, 0);
                        ctx.closePath();
                        ctx.clip();
                        ctx.drawImage(mainImg, 0, 0, size, size);
                        resolve(canvas.toDataURL('image/png'));
                    } else {
                        resolve(iconVariants[selectedIconIndex]);
                    }
                };
                mainImg.onerror = () => resolve(iconVariants[selectedIconIndex]);
            });

            const assets: GeneratedAsset[] = [];
            assets.push({
                id: 'icon-main',
                usage: 'ICON_MAIN',
                url: mainRoundedUrl,
                promptUsed: unifiedPrompt,
                dimensions: '1024x1024'
            });

            onComplete([...assets, ...resizedIcons], identity);
        } finally {
            setIsGeneratingAssets(false);
        }
    };

    return (
        <div className="flex flex-col lg:flex-row gap-8 pb-10">
            {/* LEFT COLUMN: Main Forge */}
            <div className="flex-1 flex flex-col gap-8 min-w-0">

                {/* Header Section */}
                <div className="flex flex-col gap-2">
                    <h1 className="text-4xl md:text-5xl font-black leading-tight tracking-tight text-white">
                        Unified Asset <span className="text-primary">Forge</span>
                    </h1>
                    <p className="text-text-muted text-lg max-w-2xl">
                        Create a cohesive brand identity. Icons use **Accent colors** for the subject and **Primary colors** for the background.
                    </p>
                </div>

                {/* Step 1: Brand Identity Core */}
                <div className="relative group rounded-2xl border border-border-dark bg-surface-dark overflow-hidden">
                    <div className="absolute inset-0 bg-glow-radial opacity-10 group-hover:opacity-30 transition-opacity duration-500 pointer-events-none"></div>
                    <div className="relative p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="size-10 rounded-lg bg-surface-darker border border-border-dark flex items-center justify-center text-primary">
                                    <span className="material-symbols-outlined">palette</span>
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white">Step 1: Brand Identity Core</h3>
                                    <p className="text-xs text-gray-500">Global colors & typography</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                {identity && (
                                    <>
                                        <button
                                            onClick={() => setIsEditingColors(!isEditingColors)}
                                            className={`h-8 px-3 rounded-lg border border-border-dark hover:bg-surface-light text-xs font-bold transition-all flex items-center gap-2 ${isEditingColors ? 'bg-primary text-black border-primary' : 'bg-surface-darker text-white'}`}
                                        >
                                            <span className="material-symbols-outlined text-[16px]">edit</span>
                                            {isEditingColors ? 'Done Editing' : 'Edit Colors'}
                                        </button>
                                        <button
                                            onClick={handleGenerateIdentity}
                                            disabled={isGeneratingIdentity}
                                            className="h-8 px-3 rounded-lg border border-border-dark bg-surface-darker hover:bg-surface-light text-white text-xs font-bold transition-all flex items-center gap-2 group/regen"
                                        >
                                            <span className={`material-symbols-outlined text-[16px] group-hover/regen:rotate-180 transition-transform duration-500 ${isGeneratingIdentity ? 'animate-spin' : ''}`}>refresh</span>
                                            Regenerate
                                        </button>
                                    </>
                                )}
                                {!identity && (
                                    <button
                                        onClick={handleGenerateIdentity}
                                        disabled={isGeneratingIdentity}
                                        className="h-8 px-3 rounded-lg bg-primary hover:bg-primary-light text-black text-xs font-bold transition-all flex items-center gap-2 disabled:opacity-50"
                                    >
                                        {isGeneratingIdentity ? (
                                            <>
                                                <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                                                Generating...
                                            </>
                                        ) : (
                                            <>
                                                <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                                                Generate
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Brand Guidance Input */}
                        {!identity && (
                            <div className="mb-6">
                                <label className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2 block">Brand Guidance (Optional)</label>
                                <div className="relative">
                                    <textarea
                                        value={brandGuidance}
                                        onChange={(e) => setBrandGuidance(e.target.value)}
                                        placeholder="e.g. 'I need a cybernetic green theme' or 'Warm pastels like a bakery'"
                                        className="w-full bg-surface-darker border border-border-dark rounded-xl p-3 text-sm text-gray-300 focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none h-20"
                                    />
                                    <div className="absolute bottom-2 right-2 text-[10px] text-gray-500">
                                        Describe your colors/vibe
                                    </div>
                                </div>
                            </div>
                        )}

                        {identity ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-surface-darker/50 rounded-xl p-4 border border-border-dark col-span-1 md:col-span-2 relative overflow-hidden">
                                    <label className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-3 block">Strategy Color System</label>
                                    <div className="flex flex-wrap gap-4">
                                        {/* Primaries */}
                                        <div className="flex items-center gap-2">
                                            {[
                                                { id: 'primary1', label: 'Primary 1', color: identity.colors?.primary1 || identity.colors?.primary },
                                                { id: 'primary2', label: 'Primary 2', color: identity.colors?.primary2 || identity.colors?.secondary }
                                            ].map((c, idx) => c.color ? (
                                                <div key={`p-${idx}`} className="relative group/color">
                                                    {isEditingColors ? (
                                                        <div className="flex flex-col gap-1 items-center">
                                                            <div className="size-10 rounded-full border-2 border-white/10 shadow-lg relative overflow-hidden">
                                                                <input type="color" className="absolute -inset-1 w-[150%] h-[150%] cursor-pointer p-0 border-0" value={c.color} onChange={(e) => handleColorChange(c.id, e.target.value)} />
                                                            </div>
                                                            <input
                                                                type="text"
                                                                value={c.color}
                                                                onChange={(e) => handleColorChange(c.id, e.target.value)}
                                                                className="text-[10px] w-14 bg-black/50 border border-white/20 rounded text-center text-white"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className="relative group/color cursor-pointer" title={`Click to copy ${c.label}`} onClick={() => navigator.clipboard.writeText(c.color || '')}>
                                                            <div className="size-10 rounded-full border-2 border-white/10 shadow-lg group-hover/color:scale-110 transition-transform" style={{ backgroundColor: c.color || '#000' }}></div>
                                                            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-black/90 text-[10px] text-white px-2 py-1 rounded opacity-0 group-hover/color:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none flex flex-col items-center">
                                                                <span className="font-bold">{c.label}</span>
                                                                <span className="opacity-70 font-mono">{c.color}</span>
                                                                <span className="text-[9px] text-primary mt-0.5">(Click to Copy)</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : null)}
                                        </div>
                                        <div className="w-px h-8 bg-white/10 self-center mx-1"></div>
                                        {/* Accents */}
                                        <div className="flex items-center gap-2">
                                            {[
                                                { id: 'accent1', label: 'Accent 1', color: identity.colors?.accent1 || identity.colors?.accent },
                                                { id: 'accent2', label: 'Accent 2', color: identity.colors?.accent2 }
                                            ].map((c, idx) => c.color ? (
                                                <div key={`a-${idx}`} className="relative group/color">
                                                    {isEditingColors ? (
                                                        <div className="flex flex-col gap-1 items-center">
                                                            <div className="size-8 rounded-lg border border-white/10 shadow-lg relative overflow-hidden rotate-45 mb-2 mt-1">
                                                                <input type="color" className="absolute -inset-2 w-[200%] h-[200%] cursor-pointer p-0 border-0 -rotate-45" value={c.color} onChange={(e) => handleColorChange(c.id, e.target.value)} />
                                                            </div>
                                                            <input
                                                                type="text"
                                                                value={c.color}
                                                                onChange={(e) => handleColorChange(c.id, e.target.value)}
                                                                className="text-[10px] w-14 bg-black/50 border border-white/20 rounded text-center text-white"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className="relative group/color cursor-pointer" title={`Click to copy ${c.label}`} onClick={() => navigator.clipboard.writeText(c.color || '')}>
                                                            <div className="size-8 rounded-lg border border-white/10 shadow-lg group-hover/color:scale-110 transition-transform rotate-45" style={{ backgroundColor: c.color || '#000' }}></div>
                                                            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-black/90 text-[10px] text-white px-2 py-1 rounded opacity-0 group-hover/color:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none flex flex-col items-center">
                                                                <span className="font-bold">{c.label}</span>
                                                                <span className="opacity-70 font-mono">{c.color}</span>
                                                                <span className="text-[9px] text-primary mt-0.5">(Click to Copy)</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : null)}
                                        </div>
                                        {/* Neutrals */}
                                        {(identity.colors?.neutral_white || identity.colors?.neutral_black) && (
                                            <>
                                                <div className="w-px h-8 bg-white/10 self-center mx-1"></div>
                                                <div className="flex items-center gap-2">
                                                    {[
                                                        { id: 'neutral_white', label: 'White', color: identity.colors?.neutral_white },
                                                        { id: 'neutral_gray', label: 'Gray', color: identity.colors?.neutral_gray },
                                                        { id: 'neutral_black', label: 'Black', color: identity.colors?.neutral_black }
                                                    ].map((c, idx) => c.color ? (
                                                        <div key={`n-${idx}`} className="relative group/color">
                                                            {isEditingColors ? (
                                                                <div className="flex flex-col gap-1 items-center">
                                                                    <div className="size-6 rounded border border-white/20 shadow-sm relative overflow-hidden">
                                                                        <input type="color" className="absolute -inset-1 w-[150%] h-[150%] cursor-pointer p-0 border-0" value={c.color} onChange={(e) => handleColorChange(c.id, e.target.value)} />
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="relative group/color cursor-pointer" title={`Click to copy ${c.label}`} onClick={() => navigator.clipboard.writeText(c.color || '')}>
                                                                    <div className="size-6 rounded border border-white/20 shadow-sm group-hover/color:scale-110 transition-transform" style={{ backgroundColor: c.color || '#000' }}></div>
                                                                    <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-black/90 text-[10px] text-white px-2 py-1 rounded opacity-0 group-hover/color:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none flex flex-col items-center">
                                                                        <span className="font-bold">{c.label}</span>
                                                                        <span className="text-[9px] text-primary">(Copy)</span>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : null)}
                                                </div>
                                            </>
                                        )}
                                        {/* Neon */}
                                        {identity.colors?.highlight_neon && (
                                            <>
                                                <div className="w-px h-8 bg-white/10 self-center mx-1"></div>
                                                <div className="flex items-center gap-2">
                                                    <div className="relative group/color">
                                                        {isEditingColors ? (
                                                            <div className="flex flex-col gap-1 items-center">
                                                                <div className="size-8 rounded-full border-2 border-primary/50 shadow-lg flex items-center justify-center relative overflow-hidden">
                                                                    <span className="material-symbols-outlined text-[10px] text-black absolute z-10 pointer-events-none">bolt</span>
                                                                    <input type="color" className="absolute -inset-1 w-[150%] h-[150%] cursor-pointer p-0 border-0" value={identity.colors.highlight_neon} onChange={(e) => handleColorChange('highlight_neon', e.target.value)} />
                                                                </div>
                                                                <input
                                                                    type="text"
                                                                    value={identity.colors.highlight_neon}
                                                                    onChange={(e) => handleColorChange('highlight_neon', e.target.value)}
                                                                    className="text-[10px] w-14 bg-black/50 border border-white/20 rounded text-center text-white"
                                                                />
                                                            </div>
                                                        ) : (
                                                            <div className="relative group/color cursor-pointer" onClick={() => navigator.clipboard.writeText(identity.colors.highlight_neon || '')}>
                                                                <div className="size-8 rounded-full border-2 border-primary/50 shadow-lg group-hover/color:scale-110 transition-transform flex items-center justify-center animate-pulse" style={{ backgroundColor: identity.colors.highlight_neon || '#000' }}>
                                                                    <span className="material-symbols-outlined text-[10px] text-black">bolt</span>
                                                                </div>
                                                                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-black/90 text-[10px] text-white px-2 py-1 rounded opacity-0 group-hover/color:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none flex flex-col items-center">
                                                                    <span className="font-bold">Neon</span>
                                                                    <span className="text-[9px] text-primary">(Copy)</span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="bg-surface-darker/50 rounded-xl p-4 border border-border-dark">
                                    <label className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-3 block">Typography</label>
                                    <div className="flex flex-col gap-4">
                                        {/* Primary Font */}
                                        <div className="flex items-center gap-3">
                                            <span className="text-3xl font-display font-bold text-white">Aa</span>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-white truncate max-w-[150px]">{identity.typography?.headingFont || 'Sans'}</span>
                                                <span className="text-[10px] text-gray-500">Primary / Display</span>
                                            </div>
                                        </div>
                                        {/* Secondary Font */}
                                        <div className="flex items-center gap-3">
                                            <span className="text-3xl font-sans font-normal text-white">Aa</span>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-white truncate max-w-[150px]">{identity.typography?.bodyFont || 'Sans'}</span>
                                                <span className="text-[10px] text-gray-500">Secondary / Text</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-24 flex items-center justify-center border border-dashed border-border-dark rounded-xl bg-surface-darker/30">
                                <p className="text-sm text-text-muted">Identity not yet generated. Click button above.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Step 2: Style Selector */}
                <div className="bg-surface-dark rounded-2xl border border-border-dark p-6 relative overflow-hidden shadow-lg">
                    <div className="absolute inset-0 bg-glow-radial opacity-5 pointer-events-none"></div>
                    <div className="flex items-center justify-between mb-4 relative z-10">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">style</span>
                            Step 2: Select Visual Direction
                        </h3>
                        <span className="text-xs text-text-muted bg-surface-darker px-2 py-1 rounded-full border border-border-dark">Changes Prompt Structure</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 relative z-10">
                        {styles.map((style) => (
                            <label key={style.id} className="cursor-pointer group relative">
                                <input
                                    type="radio"
                                    name="asset_style"
                                    className="peer sr-only"
                                    checked={selectedStyle === style.id}
                                    onChange={() => setSelectedStyle(style.id)}
                                />
                                <div className="h-full p-3 rounded-xl bg-surface-darker border border-border-dark hover:border-gray-500 transition-all flex flex-col items-center gap-2 text-center group-hover:bg-surface-darker/80 peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:shadow-[0_0_15px_rgba(192,244,37,0.15)]">
                                    <div className="size-10 rounded-lg bg-black/40 flex items-center justify-center mb-1">
                                        <span className={`material-symbols-outlined text-2xl transition-colors ${selectedStyle === style.id ? 'text-primary' : 'text-gray-400'}`}>
                                            {style.icon}
                                        </span>
                                    </div>
                                    <span className={`text-xs font-bold group-hover:text-white ${selectedStyle === style.id ? 'text-white' : 'text-gray-300'}`}>
                                        {style.label}
                                    </span>
                                    <span className="text-[9px] text-gray-600 leading-tight hidden md:block">
                                        {style.desc}
                                    </span>
                                    <div className={`absolute top-2 right-2 transition-all transform ${selectedStyle === style.id ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
                                        <span className="material-symbols-outlined text-primary text-sm font-bold">check_circle</span>
                                    </div>
                                </div>
                            </label>
                        ))}
                    </div>

                    {/* Style Reference Upload */}
                    <div className="mt-6 pt-6 border-t border-border-dark flex flex-col md:flex-row gap-6 relative z-10">
                        <div className="flex-1">
                            <h4 className="text-sm font-bold text-white flex items-center gap-2 mb-2">
                                <span className="material-symbols-outlined text-primary text-sm">linked_camera</span>
                                Visual Style Reference (Optional)
                            </h4>
                            <p className="text-[10px] text-gray-500 mb-4">
                                Upload an image to "borrow" its artistic style (lighting, techinque, vibe).
                                <span className="text-primary/70"> We will keep your brand colors.</span>
                            </p>

                            <div className="flex gap-4">
                                <label className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-border-dark rounded-xl bg-surface-darker hover:border-primary/50 transition-colors cursor-pointer p-4 group">
                                    <input type="file" accept="image/*" className="hidden" onChange={handleStyleUpload} />
                                    <span className="material-symbols-outlined text-gray-500 group-hover:text-primary mb-1">upload_file</span>
                                    <span className="text-[10px] text-gray-400">Click to Upload</span>
                                </label>

                                {styleRefBase64 && (
                                    <div className="relative size-24 rounded-lg overflow-hidden border border-border-dark group/preview">
                                        <img src={styleRefBase64} alt="Reference" className="w-full h-full object-cover" />
                                        <button
                                            onClick={() => { setStyleRefBase64(null); setStyleRefDescription(''); }}
                                            className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover/preview:opacity-100 transition-opacity"
                                        >
                                            <span className="material-symbols-outlined text-red-400">delete</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                </div>

                {/* Step 3: Prompt Forge & Generation */}
                <section className="flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">hub</span>
                            Step 3: Asset Prompt Forge
                        </h3>
                    </div>

                    <div className="bg-surface-dark rounded-2xl border border-border-dark overflow-hidden flex flex-col xl:flex-row shadow-2xl">
                        {/* Prompt & Controls */}
                        <div className="w-full xl:w-1/3 p-6 border-b xl:border-b-0 xl:border-r border-border-dark flex flex-col gap-4 relative">

                            {/* Advanced Controls */}
                            <div className="flex flex-col gap-3 relative z-10 mb-2">
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs text-gray-400 font-bold uppercase">Main Subject (Optional)</label>
                                    <input
                                        type="text"
                                        value={iconSubject}
                                        onChange={(e) => setIconSubject(e.target.value)}
                                        placeholder="e.g. 'Rocket', 'Bunny'"
                                        className="w-full bg-surface-darker border border-border-dark rounded-lg px-3 py-2 text-sm text-gray-300 focus:border-primary outline-none"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] text-gray-500 font-bold uppercase">Background</label>
                                        <div className="flex items-center gap-2">
                                            <div className="size-8 rounded-full border border-border-dark overflow-hidden relative">
                                                <input type="color" className="absolute -inset-1 w-[200%] h-[200%] cursor-pointer" value={bgColorOverride} onChange={(e) => setBgColorOverride(e.target.value)} />
                                            </div>
                                            <span className="text-[10px] text-gray-400 font-mono">{bgColorOverride || 'Auto'}</span>
                                        </div>
                                        {/* Smart Palette Picker */}
                                        {identity && (
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {getBrandColors().map((color, i) => (
                                                    <div
                                                        key={`bg-${i}`}
                                                        onClick={() => setBgColorOverride(color)}
                                                        className="size-4 rounded-full border border-white/20 cursor-pointer hover:scale-125 transition-transform"
                                                        style={{ backgroundColor: color }}
                                                        title="Use this brand color"
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] text-gray-500 font-bold uppercase">Subject/Icon</label>
                                        <div className="flex items-center gap-2">
                                            <div className="size-8 rounded-full border border-border-dark overflow-hidden relative">
                                                <input type="color" className="absolute -inset-1 w-[200%] h-[200%] cursor-pointer" value={subjectColorOverride} onChange={(e) => setSubjectColorOverride(e.target.value)} />
                                            </div>
                                            <span className="text-[10px] text-gray-400 font-mono">{subjectColorOverride || 'Auto'}</span>
                                        </div>
                                        {/* Smart Palette Picker */}
                                        {identity && (
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {getBrandColors().map((color, i) => (
                                                    <div
                                                        key={`subj-${i}`}
                                                        onClick={() => setSubjectColorOverride(color)}
                                                        className="size-4 rounded-full border border-white/20 cursor-pointer hover:scale-125 transition-transform"
                                                        style={{ backgroundColor: color }}
                                                        title="Use this brand color"
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="h-px bg-border-dark w-full my-1"></div>

                            <div className="flex justify-between items-center relative z-10">
                                <label className="text-sm font-bold text-gray-300">Prompt Editor</label>
                                <button
                                    onClick={handleOptimizePrompt}
                                    disabled={isOptimizingPrompt || !identity}
                                    className="text-xs bg-surface-darker hover:bg-white hover:text-black text-primary border border-primary/30 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all group disabled:opacity-50"
                                >
                                    <span className={`material-symbols-outlined text-sm ${isOptimizingPrompt ? 'animate-spin' : ''}`}>autorenew</span>
                                    {isOptimizingPrompt ? 'Drafting...' : 'Draft Prompt'}
                                </button>
                            </div>

                            <p className="text-[10px] text-gray-500">
                                Hit "Draft Prompt" to let AI write a prompt based on your selected style. Edit the text below to refine, then hit Generate.
                            </p>

                            <div className="relative flex-1 z-10 min-h-[160px]">
                                <textarea
                                    value={unifiedPrompt}
                                    onChange={(e) => setUnifiedPrompt(e.target.value)}
                                    className="w-full h-full bg-surface-darker border border-border-dark rounded-xl p-4 text-xs md:text-sm text-gray-300 font-mono focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none custom-scrollbar shadow-inner leading-relaxed"
                                    placeholder={identity ? "1. Select Style above\n2. Click 'Draft Prompt'\n3. Edit result here..." : "Generate Identity (Step 1) first..."}
                                />
                            </div>

                            {error && <p className="text-xs text-red-400 bg-red-900/20 p-2 rounded border border-red-500/30">{error}</p>}

                            <button
                                onClick={handleUnifiedGeneration}
                                disabled={isGeneratingAssets || !unifiedPrompt}
                                className="w-full py-4 bg-primary hover:bg-primary-dark text-surface-darker font-bold rounded-xl flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(192,244,37,0.3)] hover:shadow-[0_0_20px_rgba(192,244,37,0.5)] transition-all group z-10 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isGeneratingAssets ? (
                                    <>
                                        <span className="material-symbols-outlined animate-spin">sync</span>
                                        Forging Assets...
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined group-hover:rotate-180 transition-transform">auto_awesome</span>
                                        Generate Assets
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Multi-Variant Icon Selection */}
                        <div className="flex-1 p-6 flex flex-col gap-6 bg-surface-darker/30">
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                        <span className="material-symbols-outlined text-primary">collections</span>
                                        Logo Variants
                                    </h4>
                                    {iconVariants.length > 0 && (
                                        <span className="text-[10px] text-gray-500 italic">Select your favorite version to continue</span>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    {iconVariants.length > 0 ? (
                                        iconVariants.map((url, idx) => (
                                            <div
                                                key={idx}
                                                onClick={() => handleSelectVariant(idx)}
                                                className={`relative aspect-square rounded-2xl border-2 transition-all cursor-pointer group overflow-hidden ${selectedIconIndex === idx
                                                    ? 'border-primary shadow-[0_0_20px_rgba(192,244,37,0.2)]'
                                                    : 'border-border-dark hover:border-gray-500'
                                                    }`}
                                            >
                                                <img src={url} alt={`Variant ${idx + 1}`} className="w-full h-full object-cover" />

                                                {/* Selection Badge */}
                                                <div className={`absolute top-2 right-2 size-6 rounded-full flex items-center justify-center transition-all ${selectedIconIndex === idx
                                                    ? 'bg-primary text-black'
                                                    : 'bg-black/60 text-white opacity-0 group-hover:opacity-100'
                                                    }`}>
                                                    <span className="material-symbols-outlined text-[16px] font-bold">
                                                        {selectedIconIndex === idx ? 'check' : 'touch_app'}
                                                    </span>
                                                </div>

                                                {selectedIconIndex === idx && (
                                                    <div className="absolute inset-0 border-4 border-primary/20 pointer-events-none rounded-2xl animate-pulse"></div>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        [1, 2, 3, 4].map((i) => (
                                            <div key={i} className="aspect-square rounded-2xl border-2 border-dashed border-border-dark bg-surface-darker/50 flex flex-col items-center justify-center opacity-20">
                                                <span className="material-symbols-outlined text-4xl mb-1">image</span>
                                                <span className="text-[10px] uppercase font-bold tracking-widest">v{i}</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Resized Assets Row - appears only after generation */}
                            {resizedIcons.length > 0 && (
                                <div className="border-t border-border-dark pt-6 mt-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-gray-400">photo_size_select_large</span>
                                            <h4 className="text-sm font-bold text-white">Generated Icon Sizes</h4>
                                            <span className="text-[10px] text-gray-500 hidden sm:inline-block">- Auto-resized from Main Icon</span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-4 gap-4 p-5 bg-surface-darker rounded-xl border border-dashed border-border-dark hover:border-primary/30 transition-colors">
                                        {resizedIcons.map((asset) => (
                                            <div key={asset.id} className="flex flex-col items-center gap-3">
                                                <div className={`rounded-xl bg-surface-dark border border-border-dark flex items-center justify-center shadow-lg relative group cursor-pointer overflow-hidden`}
                                                    style={{ width: parseInt(asset.dimensions!) > 64 ? 64 : parseInt(asset.dimensions!), height: parseInt(asset.dimensions!) > 64 ? 64 : parseInt(asset.dimensions!) }}
                                                >
                                                    <img src={asset.url} alt={asset.dimensions} className="w-full h-full object-contain" />
                                                </div>
                                                <span className="text-[10px] text-gray-500 font-mono">{asset.dimensions}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </section>

            </div>

            {/* RIGHT COLUMN: Sidebar */}
            <div className="w-full lg:w-[320px] xl:w-[380px] flex flex-col gap-6 sticky top-0 self-start h-auto lg:h-[calc(100vh-100px)] overflow-y-auto custom-scrollbar pr-2">

                {/* Export Queue */}
                <div className="flex flex-col gap-4 mt-6">
                    <h3 className="text-white text-base font-bold px-2">Asset Checklist</h3>
                    <div className="flex flex-col gap-3">
                        <label className="group relative flex items-start gap-3 p-3 rounded-xl bg-surface-dark border border-border-dark hover:border-primary/50 transition-all cursor-pointer">
                            <div className="flex items-center h-5">
                                <input checked={selectedIconIndex !== null} readOnly className="w-5 h-5 bg-surface-darker border-border-dark rounded text-primary focus:ring-primary focus:ring-offset-background-dark cursor-pointer" type="checkbox" />
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-sm font-bold text-white group-hover:text-primary transition-colors">Main App Icon</span>
                                    {selectedIconIndex !== null ? (
                                        <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded border border-primary/20">Selected</span>
                                    ) : (
                                        <span className="text-[10px] bg-surface-darker px-1.5 py-0.5 rounded text-gray-400">Required</span>
                                    )}
                                </div>
                                <p className="text-xs text-gray-500">1024px Full-Res Render</p>
                            </div>
                        </label>
                        <label className="group relative flex items-start gap-3 p-3 rounded-xl bg-surface-dark border border-border-dark hover:border-primary/50 transition-all cursor-pointer">
                            <div className="flex items-center h-5">
                                <input checked={resizedIcons.length > 0} readOnly className="w-5 h-5 bg-surface-darker border-border-dark rounded text-primary focus:ring-primary focus:ring-offset-background-dark cursor-pointer" type="checkbox" />
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-sm font-bold text-white group-hover:text-primary transition-colors">Auto-Sized Assets</span>
                                    {resizedIcons.length > 0 ? (
                                        <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded border border-primary/20">Ready</span>
                                    ) : (
                                        <span className="text-[10px] bg-surface-darker px-1.5 py-0.5 rounded text-gray-400">Pending</span>
                                    )}
                                </div>
                                <p className="text-xs text-gray-500">128px, 48px, 32px, 16px PNGs</p>
                            </div>
                        </label>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="mt-auto pt-4 flex flex-col gap-3 pb-8">
                    <button
                        onClick={handleComplete}
                        disabled={selectedIconIndex === null}
                        className="w-full group relative overflow-hidden rounded-xl bg-primary py-4 px-6 text-background-dark font-bold text-lg shadow-[0_0_20px_rgba(192,244,37,0.3)] hover:shadow-[0_0_30px_rgba(192,244,37,0.5)] transition-all transform hover:-translate-y-1 disabled:opacity-50 disabled:transform-none disabled:shadow-none"
                    >
                        <span className="relative z-10 flex items-center justify-center gap-2">
                            <span className="material-symbols-outlined">rocket_launch</span>
                            Export All Assets
                        </span>
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                    </button>
                    <p className="text-center text-xs text-gray-500 mt-1">
                        Assets are saved to Project: "{selectedName.name}"
                    </p>
                </div>
            </div>
        </div>
    );
};

export default BrandView;