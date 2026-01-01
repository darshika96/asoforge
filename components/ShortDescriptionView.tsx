import React, { useState, useEffect } from 'react';
import { AnalysisResult, GeneratedName, ScoredDescription } from '../types';
import { generateShortDescriptions } from '../services/geminiService';

interface ShortDescriptionViewProps {
  analysis: AnalysisResult;
  selectedName: GeneratedName;
  savedDescriptions: ScoredDescription[];
  savedSelection: ScoredDescription | null;
  onDescriptionsGenerated: (descs: ScoredDescription[]) => void;
  onDescriptionSelected: (desc: ScoredDescription) => void;
}

const ShortDescriptionView: React.FC<ShortDescriptionViewProps> = ({
  analysis,
  selectedName,
  savedDescriptions = [],
  savedSelection,
  onDescriptionsGenerated,
  onDescriptionSelected
}) => {
  // Normalize legacy data (strings to objects)
  const normalizedDescriptions = (savedDescriptions || []).map(d => {
    if (typeof d === 'string') {
      return { text: d, score: 0, reasoning: 'Legacy data', keywordsUsed: [] } as ScoredDescription;
    }
    return d;
  });

  const [descriptions, setDescriptions] = useState<ScoredDescription[]>(normalizedDescriptions);
  const [loading, setLoading] = useState(normalizedDescriptions.length === 0);
  const [selected, setSelected] = useState<ScoredDescription | null>(() => {
    if (typeof savedSelection === 'string') {
      return { text: savedSelection, score: 0, reasoning: 'Legacy data', keywordsUsed: [] };
    }
    return savedSelection;
  });

  useEffect(() => {
    if (normalizedDescriptions.length === 0) {
      const fetchData = async () => {
        try {
          const results = await generateShortDescriptions(analysis, selectedName.name);
          setDescriptions(results);
          onDescriptionsGenerated(results);
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRegenerate = async () => {
    setLoading(true);
    setSelected(null);
    try {
      const results = await generateShortDescriptions(analysis, selectedName.name);
      setDescriptions(results);
      onDescriptionsGenerated(results);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6">
        <div className="relative size-24">
          <div className="absolute inset-0 border-4 border-surface-border rounded-full"></div>
          <div className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin"></div>
        </div>
        <h2 className="text-2xl font-bold text-white">Drafting Summaries...</h2>
        <p className="text-text-muted">Optimizing for 132 character limit...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-20">
      <div className="flex flex-col gap-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-dark border border-border-dark w-fit">
          <span className="material-symbols-outlined text-primary text-sm">check_circle</span>
          <span className="text-xs font-bold text-white">{selectedName.name}</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-black leading-tight tracking-tight text-white">
          Short Description
        </h1>
        <p className="text-text-muted text-lg font-normal leading-relaxed max-w-3xl">
          Select a catchy summary for your store listing. This appears right next to your logo in search results.
          <span className="block text-primary text-sm mt-1 font-mono">Strict Limit: 132 Characters</span>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {descriptions.sort((a, b) => b.score - a.score).map((desc, idx) => (
          <div
            key={idx}
            onClick={() => setSelected(desc)}
            className={`group relative flex flex-col gap-4 p-6 rounded-2xl border cursor-pointer transition-all
              ${selected?.text === desc.text
                ? 'border-primary bg-primary/10 shadow-[0_0_25px_rgba(242,242,13,0.15)] scale-[1.01]'
                : 'border-white/5 bg-surface-dark hover:border-primary/40'}`}
          >
            {idx === 0 && desc.score > 90 && (
              <div className="absolute -top-3 left-6 bg-primary text-background-dark text-[10px] font-black px-3 py-1 rounded-full uppercase italic tracking-tighter shadow-lg z-10">
                Top Conversion Pick
              </div>
            )}

            <div className="flex justify-between items-start gap-4">
              <div className="flex items-start gap-4 grow">
                <div className={`mt-1 size-6 rounded-full border-2 relative flex items-center justify-center shrink-0 transition-all ${selected?.text === desc.text ? 'border-primary bg-primary scale-110' : 'border-white/20 bg-transparent'}`}>
                  {selected?.text === desc.text && <span className="material-symbols-outlined text-background-dark text-[16px] font-bold">check</span>}
                </div>
                <div className="flex flex-col gap-3 grow">
                  <p className={`text-xl font-bold leading-relaxed transition-colors ${selected?.text === desc.text ? 'text-white' : 'text-gray-300 group-hover:text-white'}`}>
                    {desc.text}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {desc.keywordsUsed.map((kw, kIdx) => (
                      <span key={kIdx} className="text-[10px] font-bold text-primary/80 bg-primary/5 border border-primary/20 px-2 py-0.5 rounded-md uppercase tracking-wider">
                        #{kw}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end shrink-0">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-white">{desc.score}</span>
                  <span className="text-[12px] text-text-muted font-bold">/100</span>
                </div>
                <span className="text-[10px] uppercase font-black tracking-widest text-text-muted mt-1">ASO Grade</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-4 border-t border-white/5">
              <div className="flex justify-between items-center w-full">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 bg-surface-darker rounded-full w-32 overflow-hidden border border-white/5">
                    <div
                      className={`h-full ${desc.text.length > 132 ? 'bg-red-500' : 'bg-primary shadow-[0_0_10px_rgba(242,242,13,0.5)]'}`}
                      style={{ width: `${Math.min(100, (desc.text.length / 132) * 100)}%` }}
                    ></div>
                  </div>
                  <span className={`text-[10px] font-black italic tracking-wider uppercase ${desc.text.length > 132 ? 'text-red-400' : 'text-text-muted'}`}>
                    {desc.text.length} / 132
                  </span>
                </div>
                <p className="text-[11px] text-text-muted/60 italic font-medium max-w-[60%] text-right">
                  "{desc.reasoning}"
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="sticky bottom-0 bg-background-dark/95 backdrop-blur-xl border-t border-border-dark p-6 -mx-4 md:-mx-8 lg:-mx-10 mt-auto flex justify-between items-center z-30 shadow-[0_-10px_30px_rgba(0,0,0,0.6)]">
        <button
          onClick={handleRegenerate}
          className="text-text-muted hover:text-white font-bold text-sm flex items-center gap-2 group transition-colors"
        >
          <span className="material-symbols-outlined text-[20px] group-hover:rotate-180 transition-transform duration-500">refresh</span>
          Regenerate Scored Descriptions
        </button>
        <button
          onClick={() => selected && onDescriptionSelected(selected)}
          disabled={!selected}
          className="h-12 px-10 rounded-full bg-primary text-background-dark font-black text-base hover:bg-white hover:shadow-[0_0_30px_rgba(242,242,13,0.6)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest"
        >
          Deploy Short Description
          <span className="material-symbols-outlined text-[20px] font-bold">rocket_launch</span>
        </button>
      </div>
    </div>
  );
};

export default ShortDescriptionView;