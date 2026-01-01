import React, { useState, useEffect } from 'react';
import { AnalysisResult, GeneratedName } from '../types';
import { generateNameSuggestions } from '../services/geminiService';

interface NamingViewProps {
  analysis: AnalysisResult;
  savedNames: GeneratedName[];
  savedSelection: GeneratedName | null;
  onNamesGenerated: (names: GeneratedName[]) => void;
  onNameSelected: (name: GeneratedName) => void;
}

const NamingView: React.FC<NamingViewProps> = ({ analysis, savedNames, savedSelection, onNamesGenerated, onNameSelected }) => {
  const [names, setNames] = useState<GeneratedName[]>(savedNames || []);
  const [loading, setLoading] = useState(savedNames.length === 0);
  const [selected, setSelected] = useState<GeneratedName | null>(savedSelection || null);

  useEffect(() => {
    // Only fetch if we don't have saved names
    if (savedNames.length === 0) {
      const fetchNames = async () => {
        try {
          const results = await generateNameSuggestions(analysis);
          setNames(results);
          onNamesGenerated(results);
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
      };
      fetchNames();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const seoNames = names.filter(n => n.type === 'SEO');
  const creativeNames = names.filter(n => n.type === 'CREATIVE');

  const handleSelect = (n: GeneratedName) => {
    setSelected(n);
  };

  const handleConfirm = () => {
    if (selected) {
      onNameSelected(selected);
    }
  };

  const handleRegenerate = async () => {
    setLoading(true);
    try {
      const results = await generateNameSuggestions(analysis);
      setNames(results);
      onNamesGenerated(results);
      setSelected(null);
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
        <h2 className="text-2xl font-bold text-white">Forging Names...</h2>
        <p className="text-text-muted">Analyzing keywords: {(analysis.primaryKeywords || []).slice(0, 3).join(', ') || 'Processing context...'}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-20">
      <div className="flex flex-wrap justify-between items-end gap-6 pb-6 border-b border-border-dark">
        <div className="flex flex-col gap-3 max-w-2xl">
          <h1 className="text-4xl md:text-5xl font-black leading-tight tracking-tight text-white">Brand Forge</h1>
          <p className="text-text-muted text-lg font-normal leading-relaxed">
            Our brand strategist AI has generated {names.length} candidates using Word Fusion, Metaphor, and SEO optimization.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* SEO Names */}
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-3 pb-2 border-b border-white/5">
            <span className="material-symbols-outlined text-primary">search</span>
            <h2 className="text-2xl font-bold tracking-tight text-white uppercase italic">SEO Dominators</h2>
          </div>
          <div className="flex flex-col gap-4">
            {seoNames.sort((a, b) => b.score - a.score).map((item, idx) => (
              <NameCard
                key={idx}
                item={item}
                isBest={idx === 0 && item.score > 90}
                isSelected={selected?.name === item.name}
                onSelect={() => handleSelect(item)}
              />
            ))}
          </div>
        </div>

        {/* Creative Names */}
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-3 pb-2 border-b border-white/5">
            <span className="material-symbols-outlined text-primary">auto_awesome</span>
            <h2 className="text-2xl font-bold tracking-tight text-white uppercase italic">Creative Sparks</h2>
          </div>
          <div className="flex flex-col gap-4">
            {creativeNames.sort((a, b) => b.score - a.score).map((item, idx) => (
              <NameCard
                key={idx}
                item={item}
                isBest={idx === 0 && item.score > 90}
                isSelected={selected?.name === item.name}
                onSelect={() => handleSelect(item)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="sticky bottom-0 bg-background-dark/90 backdrop-blur border-t border-border-dark p-6 -mx-4 md:-mx-8 lg:-mx-10 mt-auto flex justify-between items-center z-30 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
        <button onClick={handleRegenerate} className="text-text-muted hover:text-white font-bold text-sm flex items-center gap-2 group transition-colors">
          <span className="material-symbols-outlined group-hover:rotate-180 transition-transform duration-500">refresh</span>
          Regenerate Brand List
        </button>
        <button
          onClick={handleConfirm}
          disabled={!selected}
          className="h-12 px-10 rounded-full bg-primary text-background-dark font-black text-base hover:bg-white hover:shadow-[0_0_30px_rgba(242,242,13,0.5)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider"
        >
          Lock In Brand
          <span className="material-symbols-outlined text-[20px]">check_circle</span>
        </button>
      </div>
    </div>
  );
};

const NameCard: React.FC<{ item: GeneratedName; isBest?: boolean; isSelected: boolean; onSelect: () => void }> = ({ item, isBest, isSelected, onSelect }) => {
  const domainUrl = `https://www.namecheap.com/domains/registration/results/?domain=${item.name.toLowerCase().replace(/\s+/g, '')}.com`;

  return (
    <div
      onClick={onSelect}
      className={`group relative flex items-center gap-4 rounded-xl border p-5 cursor-pointer transition-all 
        ${isSelected
          ? 'border-primary bg-primary/10 shadow-[0_0_20px_rgba(242,242,13,0.2)]'
          : 'border-white/5 bg-surface-dark hover:border-primary/50'
        }`}
    >
      {isBest && (
        <div className="absolute -top-3 -right-3 bg-primary text-background-dark text-[10px] font-black px-3 py-1 rounded-full uppercase italic tracking-tighter shadow-lg z-10">
          Best Value
        </div>
      )}

      <div className={`size-6 rounded-full border-2 relative flex items-center justify-center transition-all ${isSelected ? 'border-primary bg-primary scale-110' : 'border-white/20 bg-transparent'}`}>
        {isSelected && <span className="material-symbols-outlined text-background-dark text-[16px] font-bold">check</span>}
      </div>

      <div className="flex grow flex-col gap-1">
        <div className="flex justify-between items-start">
          <div className="flex flex-col">
            <p className={`text-xl font-black leading-tight transition-colors ${isSelected ? 'text-primary' : 'text-white group-hover:text-primary'}`}>
              {item.name}
            </p>
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary/70">
              {item.strategy || 'SEO Intent'}
            </span>
          </div>
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1">
              <span className="text-2xl font-black text-white">{item.score}</span>
              <span className="text-[10px] text-text-muted mt-1">/100</span>
            </div>
            <a
              href={domainUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-[10px] font-bold text-primary hover:text-white flex items-center gap-1 mt-1 underline decoration-primary/30"
            >
              Check .com
              <span className="material-symbols-outlined text-[12px]">open_in_new</span>
            </a>
          </div>
        </div>
        <p className="text-text-muted text-sm font-medium leading-snug line-clamp-2 italic opacity-80 mb-2">
          "{item.tagline}"
        </p>
        <p className="text-text-muted/60 text-xs font-normal border-t border-white/5 pt-2 group-hover:text-text-muted transition-colors">
          {item.reasoning}
        </p>
      </div>
    </div>
  );
};

export default NamingView;