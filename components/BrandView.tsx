import React, { useState, useEffect } from 'react';
import { AnalysisResult, GeneratedName, GeneratedAsset, BrandIdentity } from '../types';
import { generateImagePrompt, generateImageFromPrompt, generateBrandIdentity } from '../services/geminiService';

interface BrandViewProps {
  analysis: AnalysisResult;
  selectedName: GeneratedName;
  savedIdentity: BrandIdentity | null;
  savedAssets: GeneratedAsset[];
  onComplete: (assets: GeneratedAsset[], identity: BrandIdentity | null) => void;
}

const styles = [
  { id: 'Cute Character', icon: 'pets', label: 'Cute Character', desc: 'Mascot headshot, kawaii, friendly' },
  { id: '3D Geometric', icon: 'view_in_ar', label: '3D Geometric', desc: 'Abstract shapes, isometric, tech' },
  { id: '3D Letter', icon: 'abc', label: '3D Letter', desc: 'Bold typography, rendered, premium' },
  { id: 'Modern Minimalist', icon: 'crop_square', label: 'Minimalist', desc: 'Flat vector, negative space, clean' },
  { id: 'Abstract', icon: 'blur_on', label: 'Abstract Concept', desc: 'Nodes, neon, futuristic flow' },
];

const BrandView: React.FC<BrandViewProps> = ({ analysis, selectedName, savedIdentity, savedAssets, onComplete }) => {
  // Core State
  const [selectedStyle, setSelectedStyle] = useState(styles[0].id);
  const [identity, setIdentity] = useState<BrandIdentity | null>(savedIdentity);
  const [unifiedPrompt, setUnifiedPrompt] = useState<string>('');

  // Asset State
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [iconUrl, setIconUrl] = useState<string | null>(null);
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
        const banner = savedAssets.find(a => a.usage === 'MARQUEE');
        const resized = savedAssets.filter(a => a.usage === 'ICON_RESIZED');
        
        if (icon) {
            setIconUrl(icon.url);
            setUnifiedPrompt(icon.promptUsed);
        }
        if (banner) setBannerUrl(banner.url);
        if (resized.length > 0) setResizedIcons(resized);
    }
  }, [savedAssets]);

  // --- Logic: Identity Generation ---
  const handleGenerateIdentity = async () => {
    setIsGeneratingIdentity(true);
    setError(null);
    try {
      const result = await generateBrandIdentity(analysis, selectedName.name);
      setIdentity(result);
    } catch (e: any) {
      setError(e.message || "Failed to generate identity");
    } finally {
      setIsGeneratingIdentity(false);
    }
  };

  // --- Logic: Prompt Optimization ---
  const handleOptimizePrompt = async () => {
    setIsOptimizingPrompt(true);
    setError(null);
    try {
      // We ask for an ICON prompt based on the specific style selected
      const prompt = await generateImagePrompt(selectedStyle, analysis, selectedName.name, 'ICON', identity);
      setUnifiedPrompt(prompt);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsOptimizingPrompt(false);
    }
  };

  // --- Logic: Unified Asset Generation ---
  const handleUnifiedGeneration = async () => {
    if (!unifiedPrompt) {
        setError("Please draft a prompt first using the 'Draft Prompt' button.");
        return;
    }
    setIsGeneratingAssets(true);
    setError(null);

    try {
        const iconPrompt = unifiedPrompt; 
        const bannerPrompt = unifiedPrompt + ", wide 16:9 cinematic wallpaper, abstract background pattern, no text, empty space";

        const [iconResult, bannerResult] = await Promise.all([
            generateImageFromPrompt(iconPrompt, '1:1'),
            generateImageFromPrompt(bannerPrompt, '16:9')
        ]);

        setIconUrl(iconResult);
        setBannerUrl(bannerResult);

        await generateIconSizes(iconResult);

    } catch (e: any) {
        setError(e.message || "Failed to generate assets");
    } finally {
        setIsGeneratingAssets(false);
    }
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

  const handleComplete = () => {
    // Aggregate assets
    const assets: GeneratedAsset[] = [];
    if (iconUrl) assets.push({ id: 'icon-main', usage: 'ICON_MAIN', url: iconUrl, promptUsed: unifiedPrompt, dimensions: '1024x1024' });
    if (bannerUrl) assets.push({ id: 'banner-main', usage: 'MARQUEE', url: bannerUrl, promptUsed: unifiedPrompt, dimensions: '1920x1080' });
    
    // Ensure we send updated assets, merging or overwriting as needed
    onComplete([...assets, ...resizedIcons], identity);
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
            Create a cohesive brand identity. Choose a style, draft a prompt, tweak it to perfection, and generate your assets.
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
                    {!identity && (
                         <button 
                            onClick={handleGenerateIdentity}
                            disabled={isGeneratingIdentity}
                            className="text-xs bg-primary text-background-dark font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-white transition-colors disabled:opacity-50"
                         >
                            {isGeneratingIdentity ? 'Generating...' : 'Generate Identity'}
                        </button>
                    )}
                </div>
                
                {identity ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-surface-darker/50 rounded-xl p-4 border border-border-dark">
                            <label className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-3 block">Brand Palette</label>
                            <div className="flex items-center gap-3">
                                {[
                                    { label: 'Primary', color: identity.colors?.primary },
                                    { label: 'Surface', color: identity.colors?.background },
                                    { label: 'Accent', color: identity.colors?.accent },
                                ].map((c, idx) => (
                                    <div key={idx} className="relative group/color cursor-pointer" title={c.color}>
                                        <div 
                                            className="size-10 rounded-full border-2 border-white/10 shadow-lg group-hover/color:scale-110 transition-transform"
                                            style={{ backgroundColor: c.color || '#000' }}
                                        ></div>
                                        <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] bg-black text-white px-1.5 py-0.5 rounded opacity-0 group-hover/color:opacity-100 transition-opacity whitespace-nowrap">
                                            {c.label}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="bg-surface-darker/50 rounded-xl p-4 border border-border-dark">
                            <label className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-3 block">Typography</label>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="text-3xl font-display font-bold text-white">Aa</span>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-white truncate max-w-[120px]">{identity.typography?.headingFont || 'Sans'}</span>
                                        <span className="text-[10px] text-gray-500">Headings & Display</span>
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

                {/* Visual Output */}
                <div className="flex-1 p-6 flex flex-col gap-6 bg-surface-darker/30">
                    <div className="flex flex-col md:flex-row gap-4 items-center md:items-stretch h-full">
                        
                        {/* Concept Banner / Logo */}
                        <div className="flex-1 w-full bg-surface-darker rounded-xl border border-border-dark p-1 relative group transition-all hover:border-primary/30">
                            <div className="absolute -top-3 left-4 bg-surface-dark px-2 py-0.5 rounded border border-border-dark z-10">
                                <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wider">Marquee Background</span>
                            </div>
                            <div className="h-full min-h-[220px] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-repeat rounded-lg flex items-center justify-center relative overflow-hidden group-hover:shadow-[inset_0_0_30px_rgba(0,0,0,0.5)] transition-shadow">
                                {bannerUrl ? (
                                    <img src={bannerUrl} alt="Concept" className="w-full h-full object-cover rounded-lg" />
                                ) : (
                                    <div className="flex flex-col items-center opacity-30">
                                        <span className="material-symbols-outlined text-6xl mb-2">image</span>
                                        <span className="text-xs uppercase font-bold tracking-widest">Waiting for Forge</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Connector Visuals */}
                        <div className="flex flex-col items-center justify-center text-gray-500 gap-1 px-2">
                            <span className="material-symbols-outlined text-2xl text-primary md:-rotate-90">arrow_downward</span>
                        </div>

                        {/* Main Icon */}
                        <div className="w-full md:w-72 bg-surface-darker rounded-xl border-2 border-primary/20 p-1 relative group shadow-[0_0_20px_rgba(192,244,37,0.1)] hover:border-primary/60 transition-colors">
                            <div className="absolute -top-3 left-4 bg-surface-dark px-2 py-0.5 rounded border border-border-dark z-10 flex items-center gap-1">
                                <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Main Icon</span>
                                <span className="material-symbols-outlined text-[10px] text-primary">token</span>
                            </div>
                            <div className="h-full min-h-[220px] bg-gradient-to-br from-surface-dark to-surface-darker rounded-lg flex items-center justify-center relative">
                                <div className="size-48 rounded-3xl bg-[#1e2218] border border-border-dark shadow-2xl flex items-center justify-center relative overflow-hidden">
                                     {iconUrl ? (
                                        <img src={iconUrl} alt="Icon" className="w-full h-full object-cover" />
                                     ) : (
                                        <span className="material-symbols-outlined text-6xl text-primary/20">emoji_emotions</span>
                                     )}
                                </div>
                            </div>
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
                        <input checked={!!iconUrl} readOnly className="w-5 h-5 bg-surface-darker border-border-dark rounded text-primary focus:ring-primary focus:ring-offset-background-dark cursor-pointer" type="checkbox"/>
                    </div>
                    <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-bold text-white group-hover:text-primary transition-colors">Extension Icons</span>
                            {iconUrl ? (
                                <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded border border-primary/20">Ready</span>
                            ) : (
                                <span className="text-[10px] bg-surface-darker px-1.5 py-0.5 rounded text-gray-400">Pending</span>
                            )}
                        </div>
                        <p className="text-xs text-gray-500">128px, 48px, 32px, 16px PNGs</p>
                    </div>
                </label>
                <label className="group relative flex items-start gap-3 p-3 rounded-xl bg-surface-dark border border-border-dark hover:border-primary/50 transition-all cursor-pointer">
                    <div className="flex items-center h-5">
                        <input checked={!!bannerUrl} readOnly className="w-5 h-5 bg-surface-darker border-border-dark rounded text-primary focus:ring-primary focus:ring-offset-background-dark cursor-pointer" type="checkbox"/>
                    </div>
                    <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-bold text-white group-hover:text-primary transition-colors">Marquee</span>
                            {bannerUrl ? (
                                <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded border border-primary/20">Ready</span>
                            ) : (
                                <span className="text-[10px] bg-surface-darker px-1.5 py-0.5 rounded text-gray-400">Pending</span>
                            )}
                        </div>
                        <p className="text-xs text-gray-500">16:9 Promo Tile Background</p>
                    </div>
                </label>
            </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-auto pt-4 flex flex-col gap-3 pb-8">
            <button 
                onClick={handleComplete}
                disabled={!iconUrl && !bannerUrl}
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