import React, { useState } from 'react';
import { ProjectState } from '../types';
import JSZip from 'jszip';
import saveAs from 'file-saver';

interface FinalizeViewProps {
    project: ProjectState;
}

const FinalizeView: React.FC<FinalizeViewProps> = ({ project }) => {
    const [isZipping, setIsZipping] = useState(false);
    const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

    // --- Helper Functions ---

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        setCopyFeedback(label);
        setTimeout(() => setCopyFeedback(null), 2000);
    };

    const base64ToBlob = (base64: string): Blob => {
        const parts = base64.split(';base64,');
        const contentType = parts[0].split(':')[1];
        const raw = window.atob(parts[1]);
        const rawLength = raw.length;
        const uInt8Array = new Uint8Array(rawLength);
        for (let i = 0; i < rawLength; ++i) {
            uInt8Array[i] = raw.charCodeAt(i);
        }
        return new Blob([uInt8Array], { type: contentType });
    };

    const handleDownloadPackage = async (subset?: 'ICONS' | 'BANNERS') => {
        setIsZipping(true);
        const zip = new JSZip();
        const folderName = project.selectedName?.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'extension_assets';

        // 1. Text Assets (Only for full download)
        if (!subset) {
            const textFolder = zip.folder("text_assets");
            textFolder?.file("product_title.txt", project.selectedName?.name || "");
            textFolder?.file("short_description.txt", project.selectedShortDescription?.text || "");
            // Save as .txt because we switched to Plain Text logic for descriptions
            textFolder?.file("long_description.txt", project.fullDescription || "");
            textFolder?.file("privacy_policy.txt", project.privacyPolicy || "");
            textFolder?.file("keywords.txt", (project.analysis?.primaryKeywords || []).join(', '));

            const metadata = {
                name: project.selectedName?.name,
                tagline: project.selectedName?.tagline,
                category: project.analysis?.category,
                keywords: project.analysis?.primaryKeywords,
                features: project.analysis?.coreFeatures,
                audience: project.analysis?.targetAudience,
                tone: project.analysis?.tone,
                painPoints: project.analysis?.customerPsychology
            };
            textFolder?.file("metadata.json", JSON.stringify(metadata, null, 2));
        }

        // 2. Icons
        if (!subset || subset === 'ICONS') {
            const iconsFolder = zip.folder("icons");
            // Main Icon
            const mainIcon = project.generatedAssets.find(a => a.usage === 'ICON_MAIN');
            if (mainIcon) {
                iconsFolder?.file("icon_main_1024.png", base64ToBlob(mainIcon.url));
            }
            // Resized Icons
            project.generatedAssets.filter(a => a.usage === 'ICON_RESIZED').forEach(icon => {
                iconsFolder?.file(`icon_${icon.dimensions}.png`, base64ToBlob(icon.url));
            });
        }

        // 3. Store Graphics (Banners, Tiles, Screenshots) -> ONLY RENDERED
        if (!subset || subset === 'BANNERS') {
            const promoFolder = zip.folder("promo_graphics");

            // Marquee
            project.marquees.forEach((m, i) => {
                if (m.renderedUrl) {
                    promoFolder?.file(`marquee_${i + 1}.jpg`, base64ToBlob(m.renderedUrl));
                }
            });

            // Small Tile
            project.smallTiles.forEach((t, i) => {
                if (t.renderedUrl) {
                    promoFolder?.file(`small_promo_${i + 1}.jpg`, base64ToBlob(t.renderedUrl));
                }
            });

            // Screenshots
            const screenshotsFolder = zip.folder("screenshots");
            project.screenshots.forEach((s, i) => {
                if (s.renderedUrl) {
                    screenshotsFolder?.file(`screenshot_${i + 1}.jpg`, base64ToBlob(s.renderedUrl));
                }
            });
        }

        // Generate Zip
        try {
            const content = await zip.generateAsync({ type: "blob" });
            saveAs(content, `${folderName}${subset ? '_' + subset.toLowerCase() : '_complete_package'}.zip`);
        } catch (e) {
            console.error("Failed to zip", e);
            alert("Failed to create zip package.");
        } finally {
            setIsZipping(false);
        }
    };

    // ... (rest of helper functions)

    const handleDownloadSingle = (content: string | Blob, name: string) => {
        if (typeof content === 'string') {
            if (content.startsWith('data:')) {
                saveAs(base64ToBlob(content) as any, name);
            } else {
                // If string is just text, create a blob
                const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
                saveAs(blob, name);
            }
        } else {
            saveAs(content as any, name);
        }
    };

    const SectionHeader: React.FC<{ icon: string; title: string }> = ({ icon, title }) => (
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-border-dark">
            <span className="material-symbols-outlined text-primary">{icon}</span>
            <h3 className="text-lg font-bold text-white">{title}</h3>
        </div>
    );

    // ... (rest of helper functions used above)

    // --- RENDER ---
    return (
        <div className="flex flex-col gap-8 pb-20">

            {/* Hero Header */}
            <div className="bg-surface-dark border border-border-dark rounded-2xl p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 bg-glow-radial opacity-20 pointer-events-none"></div>
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="bg-primary text-black text-xs font-bold px-2 py-0.5 rounded">Completed</span>
                        <span className="text-text-muted text-sm font-mono uppercase">{project.id}</span>
                    </div>
                    <h1 className="text-4xl font-black text-white leading-tight mb-2">
                        {project.selectedName?.name || 'Untitled Project'}
                    </h1>
                    <p className="text-xl text-gray-300 font-medium">
                        {project.selectedName?.tagline}
                    </p>
                </div>
                <div className="relative z-10 flex flex-col gap-2 w-full md:w-auto">
                    <button
                        onClick={() => handleDownloadPackage()}
                        disabled={isZipping}
                        className="h-14 px-8 rounded-xl bg-primary text-background-dark font-bold text-lg hover:bg-white hover:shadow-[0_0_20px_rgba(192,244,37,0.4)] transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                    >
                        {isZipping ? (
                            <>
                                <span className="material-symbols-outlined animate-spin">sync</span>
                                Packaging...
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined text-[24px]">folder_zip</span>
                                Download Full Package
                            </>
                        )}
                    </button>
                    <p className="text-xs text-center text-gray-500">Includes Assets, Copy, & Metadata</p>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

                {/* Left Column: Text & Strategy */}
                <div className="xl:col-span-1 flex flex-col gap-6">

                    {/* Text Copy Section */}
                    <div className="bg-surface-dark border border-border-dark rounded-xl p-6">
                        <SectionHeader icon="description" title="Store Listings" />

                        <div className="space-y-6">
                            {/* Product Name */}
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-xs font-bold text-gray-400 uppercase">Product Name</label>
                                    <button onClick={() => copyToClipboard(project.selectedName?.name || '', 'Name Copied')} className="text-primary hover:text-white text-xs flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[14px]">content_copy</span>
                                        {copyFeedback === 'Name Copied' ? 'Copied!' : 'Copy'}
                                    </button>
                                </div>
                                <div className="bg-surface-darker p-3 rounded-lg text-sm text-white font-bold border border-border-dark flex justify-between items-center">
                                    {project.selectedName?.name}
                                    <span className="text-[10px] text-gray-500 font-normal">{project.selectedName?.tagline}</span>
                                </div>
                            </div>

                            {/* Short Desc */}
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-xs font-bold text-gray-400 uppercase">Short Description</label>
                                    <button onClick={() => copyToClipboard(project.selectedShortDescription?.text || '', 'Short Desc Copied')} className="text-primary hover:text-white text-xs flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[14px]">content_copy</span>
                                        {copyFeedback === 'Short Desc Copied' ? 'Copied!' : 'Copy'}
                                    </button>
                                </div>
                                <div className="bg-surface-darker p-3 rounded-lg text-sm text-gray-300 border border-border-dark">
                                    {project.selectedShortDescription?.text}
                                </div>
                            </div>

                            {/* Full Desc */}
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-xs font-bold text-gray-400 uppercase">Long Description</label>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleDownloadSingle(project.fullDescription || '', 'long_description.txt')} className="text-gray-400 hover:text-white text-xs" title="Download Text">
                                            <span className="material-symbols-outlined text-[14px]">download</span>
                                        </button>
                                        <button onClick={() => copyToClipboard(project.fullDescription || '', 'Long Desc Copied')} className="text-primary hover:text-white text-xs flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[14px]">content_copy</span>
                                            {copyFeedback === 'Long Desc Copied' ? 'Copied!' : 'Copy'}
                                        </button>
                                    </div>
                                </div>
                                <div className="bg-surface-darker p-3 rounded-lg text-sm text-gray-500 border border-border-dark h-32 overflow-hidden relative">
                                    {project.fullDescription}
                                    <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-surface-darker to-transparent"></div>
                                </div>
                            </div>

                            {/* Privacy Policy */}
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-xs font-bold text-gray-400 uppercase">Privacy Policy</label>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleDownloadSingle(project.privacyPolicy || '', 'privacy_policy.txt')} className="text-gray-400 hover:text-white text-xs" title="Download Text">
                                            <span className="material-symbols-outlined text-[14px]">download</span>
                                        </button>
                                        <button onClick={() => copyToClipboard(project.privacyPolicy || '', 'Privacy Copied')} className="text-primary hover:text-white text-xs flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[14px]">content_copy</span>
                                            {copyFeedback === 'Privacy Copied' ? 'Copied!' : 'Copy'}
                                        </button>
                                    </div>
                                </div>
                                <div className="bg-surface-darker p-3 rounded-lg text-sm text-gray-500 border border-border-dark h-24 overflow-hidden relative">
                                    {project.privacyPolicy || "No policy generated."}
                                    <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-surface-darker to-transparent"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Analysis Summary */}
                    <div className="bg-surface-dark border border-border-dark rounded-xl p-6">
                        <SectionHeader icon="psychology" title="Strategy DNA" />
                        <div className="space-y-4">
                            <div className="flex justify-between border-b border-white/5 pb-2">
                                <span className="text-sm text-gray-400">Target Audience</span>
                                <span className="text-sm text-white font-medium text-right max-w-[60%]">{project.analysis?.targetAudience}</span>
                            </div>
                            <div className="flex justify-between border-b border-white/5 pb-2">
                                <span className="text-sm text-gray-400">Tone</span>
                                <span className="text-sm text-white font-medium text-right">{project.analysis?.tone}</span>
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-sm text-gray-400">Keywords</span>
                                    <button onClick={() => copyToClipboard((project.analysis?.primaryKeywords || []).join(', '), 'Keywords Copied')} className="text-primary hover:text-white text-xs flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[14px]">content_copy</span>
                                        {copyFeedback === 'Keywords Copied' ? 'Copied!' : 'Copy'}
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    {project.analysis?.primaryKeywords.map(k => (
                                        <span key={k} className="text-[10px] bg-blue-500/10 text-blue-300 px-2 py-1 rounded">{k}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Visual Assets */}
                <div className="xl:col-span-2 flex flex-col gap-6">

                    {/* Brand Identity */}
                    <div className="bg-surface-dark border border-border-dark rounded-xl p-6">
                        <SectionHeader icon="palette" title="Brand Identity" />
                        <div className="flex flex-wrap gap-8 items-center">
                            <div className="flex gap-3">
                                {project.brandIdentity && (Object.entries(project.brandIdentity.colors) as [string, string][]).map(([key, value]) => (
                                    <div key={key} className="flex flex-col items-center gap-1 group cursor-pointer" onClick={() => copyToClipboard(value, `Color ${value}`)}>
                                        <div className="size-12 rounded-full shadow-lg border-2 border-white/10 group-hover:scale-110 transition-transform" style={{ backgroundColor: value }}></div>
                                        <span className="text-[10px] text-gray-500 uppercase font-mono">{value}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="h-10 w-px bg-border-dark"></div>
                            <div className="flex flex-col">
                                <span className="text-xs text-gray-500 uppercase font-bold">Typography</span>
                                <span className="text-xl font-display font-bold text-white">{project.brandIdentity?.typography.headingFont}</span>
                                <span className="text-sm font-body text-gray-400">{project.brandIdentity?.typography.bodyFont}</span>
                            </div>
                        </div>
                    </div>

                    {/* Icons & Banners */}
                    <div className="bg-surface-dark border border-border-dark rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4 pb-2 border-b border-border-dark">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">image</span>
                                <h3 className="text-lg font-bold text-white">Store Graphics</h3>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => handleDownloadPackage('ICONS')} className="h-9 px-4 text-xs font-bold bg-primary text-black hover:bg-white rounded-lg transition-colors flex items-center gap-2 shadow-lg">
                                    <span className="material-symbols-outlined text-[18px]">download</span>
                                    Download Icons
                                </button>
                                <button onClick={() => handleDownloadPackage('BANNERS')} className="h-9 px-4 text-xs font-bold bg-primary text-black hover:bg-white rounded-lg transition-colors flex items-center gap-2 shadow-lg">
                                    <span className="material-symbols-outlined text-[18px]">download</span>
                                    Download Banners
                                </button>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {/* 1. Icon Pack Section */}
                            <div>
                                <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">Icon Pack</h4>
                                <div className="flex flex-wrap items-end gap-4 p-4 bg-surface-darker rounded-xl border border-border-dark">
                                    {/* Main Icon */}
                                    {project.generatedAssets.find(a => a.usage === 'ICON_MAIN') && (
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="size-24 bg-surface-dark rounded-xl p-2 border border-border-dark relative group">
                                                <img src={project.generatedAssets.find(a => a.usage === 'ICON_MAIN')?.url} className="w-full h-full object-contain" alt="1024px" />
                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                                                    <button onClick={() => handleDownloadSingle(project.generatedAssets.find(a => a.usage === 'ICON_MAIN')!.url, 'icon_1024.png')} className="bg-white text-black p-1.5 rounded-full hover:scale-110 transition-transform">
                                                        <span className="material-symbols-outlined text-[16px]">download</span>
                                                    </button>
                                                </div>
                                            </div>
                                            <span className="text-[10px] text-gray-400">1024px</span>
                                        </div>
                                    )}

                                    {/* Separator */}
                                    <div className="w-px h-16 bg-border-dark mx-2"></div>

                                    {/* Resized Icons */}
                                    {project.generatedAssets.filter(a => a.usage === 'ICON_RESIZED').sort((a, b) => parseInt(b.dimensions || '0') - parseInt(a.dimensions || '0')).map(icon => (
                                        <div key={icon.id} className="flex flex-col items-center gap-2">
                                            <div className="bg-surface-dark rounded-lg p-1 border border-border-dark flex items-center justify-center relative group" style={{ width: Math.max(48, parseInt(icon.dimensions || '48') / 2) + 'px', height: Math.max(48, parseInt(icon.dimensions || '48') / 2) + 'px' }}>
                                                <img src={icon.url} style={{ width: '100%' }} alt={icon.dimensions} />
                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                                                    <button onClick={() => handleDownloadSingle(icon.url, `icon_${icon.dimensions}.png`)} className="bg-white text-black p-1 rounded-full hover:scale-110 transition-transform">
                                                        <span className="material-symbols-outlined text-[12px]">download</span>
                                                    </button>
                                                </div>
                                            </div>
                                            <span className="text-[10px] text-gray-400">{icon.dimensions}px</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 2. Banners & Screenshots */}
                            <div>
                                <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">Promotional Assets</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

                                    {/* Small Tile Preview (Rendered Only - ALL) */}
                                    {project.smallTiles.filter(t => t.renderedUrl).map((t, i) => (
                                        <div key={i} className="col-span-2 bg-surface-darker rounded-xl border border-border-dark overflow-hidden relative group">
                                            <img src={t.renderedUrl} className="w-full h-full object-cover" alt={`Small Tile ${i + 1}`} />
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <button onClick={() => handleDownloadSingle(t.renderedUrl!, `small_tile_${i + 1}.jpg`)} className="bg-white text-black p-2 rounded-full hover:scale-110 transition-transform">
                                                    <span className="material-symbols-outlined">download</span>
                                                </button>
                                            </div>
                                            <span className="text-[10px] text-white bg-black/50 px-2 py-1 rounded absolute bottom-2 left-2 backdrop-blur">Small Promo {i + 1}</span>
                                        </div>
                                    ))}

                                    {/* Marquee Preview (Rendered Only - ALL) */}
                                    {project.marquees.filter(m => m.renderedUrl).map((m, i) => (
                                        <div key={i} className="col-span-1 md:col-span-2 lg:col-span-4 aspect-[5/2] bg-surface-darker rounded-xl border border-border-dark overflow-hidden relative group">
                                            <img src={m.renderedUrl} className="w-full h-full object-cover" alt={`Marquee ${i + 1}`} />
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <button onClick={() => handleDownloadSingle(m.renderedUrl!, `marquee_${i + 1}.jpg`)} className="bg-white text-black p-2 rounded-full hover:scale-110 transition-transform">
                                                    <span className="material-symbols-outlined">download</span>
                                                </button>
                                            </div>
                                            <span className="text-[10px] text-white bg-black/50 px-2 py-1 rounded absolute bottom-2 left-2 backdrop-blur">Marquee {i + 1}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Screenshots Gallery (Rendered Only) */}
                    <div className="bg-surface-dark border border-border-dark rounded-xl p-6">
                        <SectionHeader icon="screenshot_monitor" title="Screenshots (Final)" />
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {project.screenshots.filter(s => s.renderedUrl).map((shot, idx) => (
                                <div key={idx} className="aspect-[16/10] bg-surface-darker rounded-lg border border-border-dark overflow-hidden relative group">
                                    <img src={shot.renderedUrl} className="w-full h-full object-cover" alt={`Screenshot ${idx}`} />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <button onClick={() => handleDownloadSingle(shot.renderedUrl!, `screenshot_${idx + 1}.jpg`)} className="bg-white text-black p-2 rounded-full">
                                            <span className="material-symbols-outlined">download</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {project.screenshots.filter(s => s.renderedUrl).length === 0 && (
                                <div className="col-span-full py-8 text-center text-gray-500 text-sm italic">
                                    No final rendered screenshots available. Please complete the Store Graphics step.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FinalizeView;