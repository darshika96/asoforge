import React, { useState, useRef } from 'react';
import { AnalysisResult, GeneratedName } from '../types';
import { generatePrivacyPolicy, enhancePrivacyPolicy } from '../services/geminiService';

interface PrivacyViewProps {
    analysis: AnalysisResult;
    selectedName: GeneratedName;
    savedPolicy: string | null;
    onComplete: (policy: string) => void;
}

const PrivacyView: React.FC<PrivacyViewProps> = ({ analysis, selectedName, savedPolicy, onComplete }) => {
    const [policy, setPolicy] = useState<string>(savedPolicy || '');
    const [manifestData, setManifestData] = useState<any>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mode, setMode] = useState<'UPLOAD' | 'EDIT'>('UPLOAD');

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processManifest(e.dataTransfer.files[0]);
        }
    };

    const processManifest = (file: File) => {
        if (file.name !== 'manifest.json' && !file.name.endsWith('.json')) {
            setError('Please upload a valid manifest.json file.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target?.result as string);
                setManifestData(json);
                setError(null);
                // Auto-trigger generation logic if needed, or just let user click generate
            } catch (err) {
                setError('Invalid JSON file. Please check syntax.');
            }
        };
        reader.readAsText(file);
    };

    const handleGenerate = async () => {
        if (!manifestData) {
            // Fallback for manual generation without manifest (assuming standard permissions)
            setManifestData({ permissions: [], host_permissions: [] });
        }

        setIsGenerating(true);
        try {
            const result = await generatePrivacyPolicy(selectedName.name, analysis, manifestData || { permissions: [] });
            setPolicy(result);
            setMode('EDIT');
        } catch (e: any) {
            setError(e.message || "Failed to generate policy");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleEnhance = async () => {
        if (!policy.trim()) {
            setError("Please enter some text to enhance.");
            return;
        }
        setIsGenerating(true);
        try {
            const result = await enhancePrivacyPolicy(policy, selectedName.name, analysis);
            setPolicy(result);
        } catch (e: any) {
            setError(e.message || "Failed to enhance policy");
        } finally {
            setIsGenerating(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(policy);
    };

    return (
        <div className="flex flex-col h-full gap-6 pb-20">
            <div className="flex flex-col gap-2 shrink-0">
                <h1 className="text-4xl font-black text-white leading-tight">Privacy Policy</h1>
                <p className="text-text-muted">
                    Chrome Web Store compliance requires a clear Privacy Policy justifying your permissions.
                    Upload your <span className="font-mono text-primary">manifest.json</span> to auto-generate a compliant policy.
                </p>
            </div>

            <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">

                {/* Left: Input / Upload */}
                <div className="w-full lg:w-96 flex flex-col gap-6 shrink-0">
                    <div className="bg-surface-dark border border-border-dark rounded-xl p-6 shadow-lg h-fit">
                        <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">upload_file</span>
                            Source Manifest
                        </h3>

                        {!manifestData ? (
                            <div
                                className={`flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${dragActive ? 'border-primary bg-primary/10' : 'border-border-dark bg-surface-darker hover:border-gray-500'}`}
                                onDragEnter={handleDrag}
                                onDragLeave={handleDrag}
                                onDragOver={handleDrag}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={(e) => e.target.files && processManifest(e.target.files[0])} />
                                <span className="material-symbols-outlined text-4xl text-gray-500">javascript</span>
                                <div className="text-center">
                                    <p className="text-sm font-bold text-white">Upload manifest.json</p>
                                    <p className="text-xs text-text-muted">Drag & drop or click</p>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-surface-darker rounded-xl p-4 border border-border-dark relative">
                                <button
                                    onClick={() => { setManifestData(null); setPolicy(''); }}
                                    className="absolute top-2 right-2 text-gray-500 hover:text-red-400"
                                >
                                    <span className="material-symbols-outlined text-sm">close</span>
                                </button>
                                <div className="flex items-center gap-2 mb-2 text-green-400">
                                    <span className="material-symbols-outlined text-sm">check_circle</span>
                                    <span className="text-xs font-bold">Manifest Parsed</span>
                                </div>
                                <div className="space-y-2">
                                    <div>
                                        <span className="text-[10px] uppercase text-text-muted font-bold">Permissions</span>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {(manifestData.permissions || []).length > 0 ? (
                                                manifestData.permissions.map((p: string) => (
                                                    <span key={p} className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-white">{p}</span>
                                                ))
                                            ) : <span className="text-[10px] text-gray-500 italic">None</span>}
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-[10px] uppercase text-text-muted font-bold">Host Permissions</span>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {(manifestData.host_permissions || []).length > 0 ? (
                                                manifestData.host_permissions.map((p: string) => (
                                                    <span key={p} className="text-[10px] bg-blue-500/20 px-1.5 py-0.5 rounded text-blue-200">{p}</span>
                                                ))
                                            ) : <span className="text-[10px] text-gray-500 italic">None</span>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="mt-3 p-2 bg-red-900/20 border border-red-500/30 rounded text-xs text-red-300 flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm">error</span>
                                {error}
                            </div>
                        )}

                        <button
                            onClick={handleGenerate}
                            disabled={isGenerating}
                            className="w-full mt-4 py-3 bg-primary text-background-dark font-bold rounded-lg flex items-center justify-center gap-2 hover:bg-white transition-colors disabled:opacity-50"
                        >
                            {isGenerating ? (
                                <>
                                    <span className="material-symbols-outlined animate-spin text-sm">sync</span>
                                    Analyzing Permissions...
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-sm">gavel</span>
                                    Generate Policy
                                </>
                            )}
                        </button>

                        {!manifestData && (
                            <button
                                onClick={() => { setManifestData({ permissions: [] }); handleGenerate(); }}
                                className="w-full mt-2 py-2 text-xs text-text-muted hover:text-white underline decoration-dashed"
                            >
                                Skip Upload (Write Generic Policy)
                            </button>
                        )}
                    </div>
                </div>

                {/* Right: Editor / Result */}
                <div className="flex-1 bg-surface-dark border border-border-dark rounded-xl flex flex-col shadow-2xl overflow-hidden p-6">
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-bold text-gray-300">Privacy Policy</label>
                        <div className="flex gap-2">
                            {policy.trim().length > 0 && (
                                <button
                                    onClick={handleEnhance}
                                    disabled={isGenerating}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 text-xs font-bold transition-colors disabled:opacity-50"
                                >
                                    <span className="material-symbols-outlined text-sm">auto_awesome</span>
                                    {isGenerating ? 'Enhancing...' : 'AI Enhance'}
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 relative group">
                        <textarea
                            value={policy}
                            onChange={(e) => setPolicy(e.target.value)}
                            placeholder={isGenerating ? "AI is reviewing your manifest..." : "Enter your privacy policy here or generate one..."}
                            className="w-full h-full bg-surface-darker border-2 border-border-dark focus:border-primary rounded-lg p-4 text-sm font-mono text-gray-300 focus:outline-none resize-none transition-all placeholder:text-gray-600"
                            spellCheck={false}
                        />

                        {/* Floating Action Bar - mimicking Dev Console */}
                        <div className="absolute top-4 right-4 flex gap-2 opacity-100 transition-opacity">
                            <button
                                onClick={copyToClipboard}
                                className="flex items-center gap-2 px-4 py-2 bg-primary text-background-dark rounded font-bold shadow-lg hover:bg-white hover:scale-105 active:scale-95 transition-all text-xs"
                                title="Copy to Clipboard"
                            >
                                <span className="material-symbols-outlined text-sm">content_copy</span>
                                Copy Policy
                            </button>
                        </div>
                    </div>

                    <p className="mt-2 text-xs text-text-muted flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">info</span>
                        Copy this text and paste it into the "Privacy Policy" field in your Developer Dashboard.
                    </p>
                </div>

            </div>

            <div className="absolute bottom-0 left-0 right-0 bg-background-dark/95 backdrop-blur border-t border-border-dark p-6 px-10 flex justify-between items-center z-30">
                <span className="text-xs text-text-muted italic">
                    Next: Finalize Package & Download
                </span>
                <button
                    onClick={() => onComplete(policy)}
                    className="h-12 px-8 rounded-full bg-primary text-background-dark font-bold text-base hover:bg-white hover:shadow-[0_0_20px_rgba(242,242,13,0.4)] transition-all flex items-center justify-center gap-2"
                >
                    Review & Finalize
                    <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                </button>
            </div>
        </div>
    );
};

export default PrivacyView;