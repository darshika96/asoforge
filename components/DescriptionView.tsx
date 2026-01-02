import React, { useState, useEffect } from 'react';
import { AnalysisResult, GeneratedName } from '../types';
import { generateStoreListing } from '../services/geminiService';

interface DescriptionViewProps {
  analysis: AnalysisResult;
  selectedName: GeneratedName;
  shortDescription: string;
  savedDescription: string | null;
  onComplete: (fullDescription: string) => void;
}

const DescriptionView: React.FC<DescriptionViewProps> = ({ analysis, selectedName, shortDescription, savedDescription, onComplete }) => {
  const [description, setDescription] = useState<string>(savedDescription || '');
  const [loading, setLoading] = useState(!savedDescription);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    if (!savedDescription) {
      const generate = async () => {
        try {
          const result = await generateStoreListing(analysis, selectedName.name, shortDescription);
          setDescription(result);
        } catch (e) {
          console.error("Failed to generate description", e);
          setDescription("Failed to generate description. Please try regenerating.");
        } finally {
          setLoading(false);
        }
      };
      generate();
    }
  }, [analysis, selectedName, shortDescription, savedDescription]);

  const handleRegenerate = async () => {
    setLoading(true);
    try {
      const result = await generateStoreListing(analysis, selectedName.name, shortDescription);
      setDescription(result);
      setEditMode(false);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(description);
  };

  return (
    <div className="flex flex-col h-full gap-6 pb-20">
      <div className="flex flex-col gap-2 shrink-0">
        <h1 className="text-4xl font-black text-white leading-tight">Store Listing</h1>
        <p className="text-text-muted">
          Your full description, optimized for conversion and SEO. Based on
          <span className="text-primary font-bold"> {selectedName.name}</span>.
        </p>
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 bg-surface-dark border border-border-dark rounded-2xl animate-pulse">
          <div className="size-16 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
          <p className="text-white font-bold">Crafting your story...</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
          {/* Editor / Preview Area */}
          <div className="flex-1 flex flex-col gap-4 min-h-0">
            <div className="bg-surface-dark border border-border-dark rounded-2xl flex flex-col h-full shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border-dark bg-surface-darker/50">
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditMode(false)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${!editMode ? 'bg-primary text-background-dark' : 'text-text-muted hover:text-white'}`}
                  >
                    Preview
                  </button>
                  <button
                    onClick={() => setEditMode(true)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${editMode ? 'bg-primary text-background-dark' : 'text-text-muted hover:text-white'}`}
                  >
                    Edit Text
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={copyToClipboard}
                    className="p-1.5 text-text-muted hover:text-white transition-colors rounded hover:bg-surface-darker"
                    title="Copy to Clipboard"
                  >
                    <span className="material-symbols-outlined text-sm">content_copy</span>
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                {editMode ? (
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full h-full bg-transparent text-gray-300 font-mono text-sm resize-none focus:outline-none"
                    spellCheck={false}
                  />
                ) : (
                  <div className="prose prose-invert prose-sm max-w-none prose-headings:text-white prose-a:text-primary prose-strong:text-white prose-ul:marker:text-primary">
                    <pre className="whitespace-pre-wrap font-sans text-gray-300 leading-relaxed">
                      {description}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Stats / Controls Sidebar */}
          <div className="w-full lg:w-80 flex flex-col gap-4 shrink-0">
            <div className="bg-surface-dark border border-border-dark rounded-xl p-5 flex flex-col gap-4">
              <h3 className="text-white font-bold text-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-lg">analytics</span>
                Listing Stats
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-surface-darker rounded-lg p-3 border border-border-dark">
                  <span className="text-[10px] text-text-muted uppercase tracking-wider block mb-1">Words</span>
                  <span className="text-xl font-bold text-white">{description.split(/\s+/).length}</span>
                </div>
                <div className="bg-surface-darker rounded-lg p-3 border border-border-dark">
                  <span className="text-[10px] text-text-muted uppercase tracking-wider block mb-1">Characters</span>
                  <span className="text-xl font-bold text-white">{description.length}</span>
                </div>
              </div>
              <div className="text-xs text-text-muted">
                <p className="flex items-center gap-2 mb-1">
                  <span className="material-symbols-outlined text-green-400 text-sm">check</span>
                  Optimized Layout
                </p>
                <p className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-green-400 text-sm">check</span>
                  Keywords & Emojis
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-surface-dark to-surface-darker border border-border-dark rounded-xl p-5">
              <h3 className="text-white font-bold text-sm mb-2">Refine Result</h3>
              <p className="text-xs text-text-muted mb-4">Not satisfied? Generate a new variation based on the same core analysis.</p>
              <button
                onClick={handleRegenerate}
                className="w-full py-2 bg-surface-border hover:bg-white hover:text-black text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">refresh</span>
                Regenerate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 bg-background-dark/95 backdrop-blur border-t border-border-dark p-6 px-10 flex justify-between items-center z-30">
        <span className="text-xs text-text-muted italic">
          Next: Generate screenshots and promo tiles
        </span>
        <button
          onClick={() => onComplete(description)}
          className="h-12 px-8 rounded-full bg-primary text-background-dark font-bold text-base hover:bg-white hover:shadow-[0_0_20px_rgba(242,242,13,0.4)] transition-all flex items-center justify-center gap-2"
        >
          Save & Continue
          <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
        </button>
      </div>
    </div>
  );
};

export default DescriptionView;