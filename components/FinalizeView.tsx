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
            textFolder?.file("short_description.txt", project.selectedShortDescription?.text || "");
            textFolder?.file("store_listing.md", project.fullDescription || "");
            textFolder?.file("privacy_policy.md", project.privacyPolicy || "");

            const metadata = {
                name: project.selectedName?.name,
                tagline: project.selectedName?.tagline,
                category: project.analysis?.category,
                keywords: project.analysis?.primaryKeywords,
                features: project.analysis?.coreFeatures,
                audience: project.analysis?.targetAudience
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

        // 3. Store Graphics (Banners, Tiles, Screenshots)
        if (!subset || subset === 'BANNERS') {
            const promoFolder = zip.folder("promo_graphics");

            // Marquee
            project.marquees.forEach((m, i) => {
                const url = m.renderedUrl || m.previewUrl;
                if (url) {
                    promoFolder?.file(`marquee_${i + 1}.jpg`, base64ToBlob(url));
                }
            });

            // Small Tile
            project.smallTiles.forEach((t, i) => {
                const url = t.renderedUrl || t.previewUrl;
                if (url) {
                    promoFolder?.file(`small_promo_${i + 1}.jpg`, base64ToBlob(url));
                }
            });

            // Screenshots
            const screenshotsFolder = zip.folder("screenshots");
            project.screenshots.forEach((s, i) => {
                const url = s.renderedUrl || s.previewUrl;
                if (url && url.startsWith('data:')) {
                    screenshotsFolder?.file(`screenshot_${i + 1}.jpg`, base64ToBlob(url));
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

    const handleDownloadSingle = (content: string | Blob, name: string) => {
        if (typeof content === 'string') {
            if (content.startsWith('data:')) {
                saveAs(base64ToBlob(content) as any, name);
            } else {
                saveAs(content, name);
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
                                        <button onClick={() => handleDownloadSingle(new Blob([project.fullDescription || ''], { type: 'text/markdown' }), 'store_listing.md')} className="text-gray-400 hover:text-white text-xs" title="Download MD">
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
                                    <button onClick={() => copyToClipboard(project.privacyPolicy || '', 'Privacy Copied')} className="text-primary hover:text-white text-xs flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[14px]">content_copy</span>
                                        {copyFeedback === 'Privacy Copied' ? 'Copied!' : 'Copy'}
                                    </button>
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
                                <span className="text-sm text-gray-400 block mb-2">Keywords</span>
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
                                <button onClick={() => handleDownloadPackage('ICONS')} className="text-xs bg-surface-darker hover:bg-white hover:text-black border border-border-dark px-3 py-1 rounded transition-colors">
                                    Download Icons
                                </button>
                                <button onClick={() => handleDownloadPackage('BANNERS')} className="text-xs bg-surface-darker hover:bg-white hover:text-black border border-border-dark px-3 py-1 rounded transition-colors">
                                    Download Banners
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Main Icon */}
                            <div className="aspect-square bg-surface-darker rounded-xl border border-border-dark p-4 flex flex-col items-center justify-center gap-2 relative group">
                                {project.generatedAssets.find(a => a.usage === 'ICON_MAIN') && (
                                    <>
                                        <img src={project.generatedAssets.find(a => a.usage === 'ICON_MAIN')?.url} className="w-2/3 h-2/3 object-contain drop-shadow-xl" alt="Main Icon" />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                                            <button onClick={() => handleDownloadSingle(project.generatedAssets.find(a => a.usage === 'ICON_MAIN')!.url, 'icon_main.png')} className="bg-white text-black p-2 rounded-full">
                                                <span className="material-symbols-outlined">download</span>
                                            </button>
                                        </div>
                                    </>
                                )}
                                <span className="text-[10px] text-gray-500 absolute bottom-2">Main Icon</span>
                            </div>

                            {/* Small Tile Preview */}
                            <div className="col-span-2 bg-surface-darker rounded-xl border border-border-dark overflow-hidden relative group">
                                {project.smallTiles.length > 0 && (
                                    <>
                                        <img src={project.smallTiles[0].renderedUrl || project.smallTiles[0].previewUrl} className="w-full h-full object-cover" alt="Small Tile" />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <button onClick={() => handleDownloadSingle(project.smallTiles[0].renderedUrl || project.smallTiles[0].previewUrl, 'small_tile.jpg')} className="bg-white text-black p-2 rounded-full">
                                                <span className="material-symbols-outlined">download</span>
                                            </button>
                                        </div>
                                    </>
                                )}
                                <span className="text-[10px] text-white bg-black/50 px-2 py-1 rounded absolute bottom-2 left-2 backdrop-blur">Small Promo</span>
                            </div>

                            {/* Marquee Preview */}
                            <div className="col-span-1 md:col-span-2 lg:col-span-4 aspect-[5/2] bg-surface-darker rounded-xl border border-border-dark overflow-hidden relative group">
                                {project.marquees.length > 0 && (
                                    <>
                                        <img src={project.marquees[0].renderedUrl || project.marquees[0].previewUrl} className="w-full h-full object-cover" alt="Marquee" />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <button onClick={() => handleDownloadSingle(project.marquees[0].renderedUrl || project.marquees[0].previewUrl, 'marquee.jpg')} className="bg-white text-black p-2 rounded-full">
                                                <span className="material-symbols-outlined">download</span>
                                            </button>
                                        </div>
                                    </>
                                )}
                                <span className="text-[10px] text-white bg-black/50 px-2 py-1 rounded absolute bottom-2 left-2 backdrop-blur">Marquee</span>
                            </div>
                        </div>
                    </div>

                    {/* Screenshots Gallery */}
                    <div className="bg-surface-dark border border-border-dark rounded-xl p-6">
                        <SectionHeader icon="screenshot_monitor" title="Screenshots" />
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {project.screenshots.map((shot, idx) => (
                                (shot.renderedUrl || shot.previewUrl) && (
                                    <div key={idx} className="aspect-[16/10] bg-surface-darker rounded-lg border border-border-dark overflow-hidden relative group">
                                        <img src={shot.renderedUrl || shot.previewUrl} className="w-full h-full object-cover" alt={`Screenshot ${idx}`} />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <button onClick={() => handleDownloadSingle(shot.renderedUrl || shot.previewUrl, `screenshot_${idx + 1}.jpg`)} className="bg-white text-black p-2 rounded-full">
                                                <span className="material-symbols-outlined">download</span>
                                            </button>
                                        </div>
                                    </div>
                                )
                            ))}
                            {project.screenshots.length === 0 && (
                                <div className="col-span-full py-8 text-center text-gray-500 text-sm italic">
                                    No screenshots generated in Studio.
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