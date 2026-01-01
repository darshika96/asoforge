import React, { useState, useRef } from 'react';
import { AnalysisResult } from '../types';
import { analyzeProjectInput } from '../services/geminiService';

interface AnalysisViewProps {
  onAnalysisComplete: (result: AnalysisResult, desc: string) => void;
  savedDescription: string;
}

const AnalysisView: React.FC<AnalysisViewProps> = ({ onAnalysisComplete, savedDescription }) => {
  const [description, setDescription] = useState(savedDescription);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'text' | 'upload'>('text');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAnalyze = async () => {
    if (description.length < 20) {
      setError("Please provide a longer description (min 20 chars).");
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const result = await analyzeProjectInput(description);
      onAnalysisComplete(result, description);
    } catch (err: any) {
      console.error(err);
      const msg = err.message || "Failed to analyze text.";

      if (msg.includes("Junk input detected")) {
        setError("Add a real project please! Our AI needs a clear description of your extension's purpose to perform its magic.");
      } else {
        setError(`Analysis failed: ${msg}`);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = (file: File) => {
    // Check file type
    const validTypes = ['text/markdown', 'text/plain', '']; // '' sometimes occurs for .md on some systems
    const fileName = file.name.toLowerCase();

    if (!validTypes.includes(file.type) && !fileName.endsWith('.md') && !fileName.endsWith('.txt')) {
      setError("Invalid file type. Please upload .md or .txt files.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        setDescription(text);
        setActiveTab('text'); // Switch back to preview/edit mode
        setError(null);
      }
    };
    reader.onerror = () => setError("Failed to read file.");
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col gap-8 h-full">
      <header className="flex flex-col gap-2">
        <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-none">
          Initialize Project Specs
        </h2>
        <p className="text-text-muted text-lg max-w-2xl">
          Feed the engine your raw idea to begin analysis. Our AI synthesizes your input to identify core audience and pain points.
        </p>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 h-full min-h-[500px]">
        {/* Input Module */}
        <div className="xl:col-span-5 flex flex-col gap-6">
          <div className="bg-surface-dark border border-border-dark rounded-2xl p-1 shadow-2xl flex flex-col h-full">
            <div className="flex border-b border-border-dark px-2">
              <button
                onClick={() => setActiveTab('text')}
                className={`flex-1 pb-4 pt-5 px-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'text' ? 'border-primary text-white' : 'border-transparent text-text-muted hover:text-white'}`}
              >
                Text Description
              </button>
              <button
                onClick={() => setActiveTab('upload')}
                className={`flex-1 pb-4 pt-5 px-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'upload' ? 'border-primary text-white' : 'border-transparent text-text-muted hover:text-white'}`}
              >
                Upload Markdown
              </button>
            </div>

            <div className="flex-1 p-6 flex flex-col gap-6">
              {activeTab === 'text' ? (
                <div className="flex flex-col gap-2 flex-1 animate-in fade-in duration-300">
                  <label htmlFor="project-desc" className="text-white text-sm font-medium flex items-center gap-2">
                    Project Brief
                    <span className="material-symbols-outlined text-text-muted text-[16px]">info</span>
                  </label>
                  <textarea
                    id="project-desc"
                    className="w-full flex-1 min-h-[200px] resize-none rounded-xl bg-background-dark border border-border-dark focus:border-primary focus:ring-1 focus:ring-primary text-white placeholder:text-text-muted/50 p-4 font-mono text-sm leading-relaxed"
                    placeholder="Example: A browser extension for designers that allows them to quickly inspect CSS grid layouts and export them as Tailwind classes..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={isAnalyzing}
                  />
                </div>
              ) : (
                <div
                  className={`flex-1 flex flex-col items-center justify-center gap-4 border-2 border-dashed rounded-xl transition-all cursor-pointer animate-in fade-in duration-300 ${dragActive ? 'border-primary bg-primary/5' : 'border-border-dark bg-background-dark/50 hover:border-gray-500'}`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={triggerFileInput}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".md,.txt,.markdown"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <div className="size-16 rounded-full bg-surface-darker border border-border-dark flex items-center justify-center">
                    <span className="material-symbols-outlined text-3xl text-primary">cloud_upload</span>
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-white font-bold">Click to upload or drag & drop</p>
                    <p className="text-text-muted text-xs">Supported: .md, .txt (Max 1MB)</p>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-500/10 border border-red-500/50 p-3 rounded-lg text-red-400 text-sm flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">error</span>
                  {error}
                </div>
              )}

              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="group w-full py-4 bg-primary hover:bg-primary-dark text-background-dark font-bold text-lg rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(192,244,37,0.2)] hover:shadow-[0_0_30px_rgba(192,244,37,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAnalyzing ? (
                  <>
                    <span className="material-symbols-outlined animate-spin">sync</span>
                    ANALYZING...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined group-hover:animate-pulse">rocket_launch</span>
                    IGNITE ANALYSIS
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Visualizer Module (Right side) */}
        <div className="xl:col-span-7 flex flex-col">
          <div className="relative flex flex-col h-full bg-[#0a0c08] border border-border-dark rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 bg-surface-dark/50 border-b border-border-dark">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500/80 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                </div>
                <span className="text-xs font-mono text-text-muted uppercase tracking-widest ml-2">Analysis_Protocol_v1.0</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className={`absolute inline-flex h-full w-full rounded-full bg-primary opacity-75 ${isAnalyzing ? 'animate-ping' : ''}`}></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                <span className="text-primary text-xs font-bold uppercase tracking-wider">{isAnalyzing ? 'Processing' : 'Standby'}</span>
              </div>
            </div>

            <div className="relative flex-1 p-6 flex flex-col gap-6 overflow-hidden">
              {/* Background Grid */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(78,84,59,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(78,84,59,0.1)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>

              {/* Visualization Placeholder / Loading State */}
              <div className="relative z-10 flex flex-col items-center justify-center h-full gap-4">
                <div className={`w-32 h-32 rounded-full border border-primary/20 flex items-center justify-center ${isAnalyzing ? 'shadow-[0_0_30px_rgba(192,244,37,0.3)] animate-pulse' : ''}`}>
                  <span className="material-symbols-outlined text-6xl text-primary opacity-80">psychology</span>
                </div>
                <p className="text-text-muted font-mono text-sm">
                  {isAnalyzing ? 'Synthesizing market data...' : 'Waiting for input payload...'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisView;