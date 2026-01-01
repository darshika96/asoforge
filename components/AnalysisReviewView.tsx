import React, { useState } from 'react';
import { AnalysisResult } from '../types';

interface AnalysisReviewViewProps {
  analysis: AnalysisResult;
  onConfirm: (updatedAnalysis: AnalysisResult) => void;
  onBack: () => void;
}

const AnalysisReviewView: React.FC<AnalysisReviewViewProps> = ({ analysis, onConfirm, onBack }) => {
  const [data, setData] = useState<AnalysisResult>(analysis);
  const [newFeature, setNewFeature] = useState('');
  const [newKeyword, setNewKeyword] = useState('');

  // Handlers for Features
  const addFeature = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newFeature.trim()) {
      e.preventDefault();
      setData(prev => ({
        ...prev,
        coreFeatures: [...(prev.coreFeatures || []), newFeature.trim()]
      }));
      setNewFeature('');
    }
  };

  const removeFeature = (idx: number) => {
    setData(prev => ({
      ...prev,
      coreFeatures: (prev.coreFeatures || []).filter((_, i) => i !== idx)
    }));
  };

  // Handlers for Keywords
  const addKeyword = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newKeyword.trim()) {
      e.preventDefault();
      setData(prev => ({
        ...prev,
        primaryKeywords: [...(prev.primaryKeywords || []), newKeyword.trim()]
      }));
      setNewKeyword('');
    }
  };

  const removeKeyword = (idx: number) => {
    setData(prev => ({
      ...prev,
      primaryKeywords: (prev.primaryKeywords || []).filter((_, i) => i !== idx)
    }));
  };

  return (
    <div className="flex flex-col gap-8 pb-20 max-w-5xl mx-auto">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3 text-primary mb-2">
          <span className="material-symbols-outlined">psychology_alt</span>
          <span className="font-mono text-xs font-bold uppercase tracking-widest">Analysis Protocol Complete</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-black leading-tight tracking-tight text-white">
          Blueprint Review
        </h1>
        <p className="text-text-muted text-lg max-w-3xl">
          The AI has extracted the following DNA for your extension. Review and tweak these details, as they will dictate the generated Names, Descriptions, and Assets in the next steps.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Left Column: Core Identity */}
        <div className="flex flex-col gap-6">

          {/* Category */}
          <div className="bg-surface-dark border border-border-dark rounded-xl p-6 shadow-lg">
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3 block">Store Category</label>
            <input
              type="text"
              value={data.category || ''}
              onChange={(e) => setData({ ...data, category: e.target.value })}
              className="w-full bg-surface-darker border border-border-dark rounded-lg p-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-medium"
            />
          </div>

          {/* Target Audience */}
          <div className="bg-surface-dark border border-border-dark rounded-xl p-6 shadow-lg">
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3 block">Target Audience</label>
            <textarea
              value={data.targetAudience || ''}
              onChange={(e) => setData({ ...data, targetAudience: e.target.value })}
              className="w-full h-24 bg-surface-darker border border-border-dark rounded-lg p-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all resize-none leading-relaxed"
            />
            <p className="text-[10px] text-gray-500 mt-2 text-right">Keep it under 20 words for best results.</p>
          </div>

          {/* Brand Tone */}
          <div className="bg-surface-dark border border-border-dark rounded-xl p-6 shadow-lg">
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3 block">Brand Tone</label>
            <input
              type="text"
              value={data.tone || ''}
              onChange={(e) => setData({ ...data, tone: e.target.value })}
              className="w-full bg-surface-darker border border-border-dark rounded-lg p-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
            />
            <p className="text-[10px] text-gray-500 mt-2">Comma separated adjectives (e.g. Professional, Clean, Efficient)</p>
          </div>

        </div>

        {/* Right Column: Arrays */}
        <div className="flex flex-col gap-6">

          {/* Core Features */}
          <div className="bg-surface-dark border border-border-dark rounded-xl p-6 shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider block">Core Features</label>
              <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded border border-primary/20">{(data.coreFeatures || []).length} Detected</span>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {(data.coreFeatures || []).map((feature, idx) => (
                <div key={idx} className="group flex items-center gap-2 bg-surface-darker border border-border-dark hover:border-primary/50 text-white text-sm px-3 py-1.5 rounded-lg transition-all animate-in fade-in zoom-in duration-200">
                  <span>{feature}</span>
                  <button onClick={() => removeFeature(idx)} className="text-gray-500 hover:text-red-400">
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>
              ))}
            </div>

            <div className="relative">
              <input
                type="text"
                value={newFeature}
                onChange={(e) => setNewFeature(e.target.value)}
                onKeyDown={addFeature}
                placeholder="+ Add feature and press Enter"
                className="w-full bg-surface-darker/50 border border-dashed border-border-dark rounded-lg p-3 text-sm text-white focus:border-primary focus:ring-0 outline-none transition-all placeholder:text-gray-600"
              />
              <span className="material-symbols-outlined absolute right-3 top-3 text-gray-600">add</span>
            </div>
          </div>

          {/* Keywords */}
          <div className="bg-surface-dark border border-border-dark rounded-xl p-6 shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider block">SEO Keywords</label>
              <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20">{(data.primaryKeywords || []).length} Detected</span>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {(data.primaryKeywords || []).map((keyword, idx) => (
                <div key={idx} className="group flex items-center gap-2 bg-surface-darker border border-border-dark hover:border-blue-500/50 text-white text-sm px-3 py-1.5 rounded-lg transition-all animate-in fade-in zoom-in duration-200">
                  <span className="text-blue-200">{keyword}</span>
                  <button onClick={() => removeKeyword(idx)} className="text-gray-500 hover:text-red-400">
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>
              ))}
            </div>

            <div className="relative">
              <input
                type="text"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyDown={addKeyword}
                placeholder="+ Add keyword and press Enter"
                className="w-full bg-surface-darker/50 border border-dashed border-border-dark rounded-lg p-3 text-sm text-white focus:border-blue-500 focus:ring-0 outline-none transition-all placeholder:text-gray-600"
              />
              <span className="material-symbols-outlined absolute right-3 top-3 text-gray-600">add</span>
            </div>
          </div>

        </div>
      </div>

      {/* NEW: Enhanced Marketing & Strategy Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SEO Strategy */}
        <div className="bg-surface-dark border border-border-dark rounded-xl p-6 shadow-lg flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-sm">trending_up</span>
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider">SEO Strategy</label>
          </div>
          <textarea
            value={data.seoStrategy || ''}
            onChange={(e) => setData({ ...data, seoStrategy: e.target.value })}
            className="flex-1 min-h-[120px] bg-surface-darker border border-border-dark rounded-lg p-3 text-sm text-gray-300 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all resize-none leading-relaxed"
          />
        </div>

        {/* Market Analysis */}
        <div className="bg-surface-dark border border-border-dark rounded-xl p-6 shadow-lg flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-sm">analytics</span>
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Market Analysis</label>
          </div>
          <textarea
            value={data.marketAnalysis || ''}
            onChange={(e) => setData({ ...data, marketAnalysis: e.target.value })}
            className="flex-1 min-h-[120px] bg-surface-darker border border-border-dark rounded-lg p-3 text-sm text-gray-300 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all resize-none leading-relaxed"
          />
        </div>

        {/* Customer Psychology */}
        <div className="bg-surface-dark border border-border-dark rounded-xl p-6 shadow-lg flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-sm">groups_3</span>
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Customer Psychology</label>
          </div>
          <textarea
            value={data.customerPsychology || ''}
            onChange={(e) => setData({ ...data, customerPsychology: e.target.value })}
            className="flex-1 min-h-[120px] bg-surface-darker border border-border-dark rounded-lg p-3 text-sm text-gray-300 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all resize-none leading-relaxed"
          />
        </div>
      </div>

      {/* Action Footer */}
      <div className="sticky bottom-0 bg-background-dark/95 backdrop-blur border-t border-border-dark p-6 -mx-4 md:-mx-8 lg:-mx-10 mt-auto flex justify-between items-center z-30">
        <button
          onClick={onBack}
          className="text-text-muted hover:text-white font-bold text-sm flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-surface-dark transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Back to Input
        </button>
        <button
          onClick={() => onConfirm(data)}
          className="h-14 px-8 rounded-xl bg-primary text-background-dark font-bold text-lg hover:bg-white hover:shadow-[0_0_20px_rgba(242,242,13,0.4)] transition-all flex items-center justify-center gap-2"
        >
          Confirm & Forge Names
          <span className="material-symbols-outlined text-[24px]">arrow_forward</span>
        </button>
      </div>
    </div>
  );
};

export default AnalysisReviewView;