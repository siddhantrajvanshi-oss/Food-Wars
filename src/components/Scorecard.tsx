import React, { useState } from 'react';
import {
  Sparkles,
  Trophy,
  Flame,
  Salad,
  RotateCcw,
  Copy,
  Check,
  Lightbulb,
  Award,
  Share2,
} from 'lucide-react';
import { DishEvaluation, Recipe } from '../types';

interface ScorecardProps {
  evaluation: DishEvaluation;
  recipe: Recipe;
  photoUrl?: string;
  onCookAnother: () => void;
}

export const Scorecard: React.FC<ScorecardProps> = ({
  evaluation,
  recipe,
  photoUrl,
  onCookAnother,
}) => {
  const [copied, setCopied] = useState(false);

  const { metricBreakdown, totalScore, dishName, positiveFeedback, culinaryTipForNextTime } =
    evaluation;

  const handleCopySummary = async () => {
    const text = `🍳 Food Wars Challenge Scorecard!
Dish: ${dishName || recipe.dishName} (${recipe.culturalOrigin})
Total Score: ${totalScore}/100 (+${metricBreakdown.bonusPoints} Survival Bonus)
📊 Metric Breakdown:
- Veggie Balance: ${metricBreakdown.veggieBalance}/35
- Ingredient Efficiency: ${metricBreakdown.ingredientEfficiency}/35
- Cultural Technique: ${metricBreakdown.culturalTechnique}/30
- Bonus Points: +${metricBreakdown.bonusPoints}

💡 Mentor Culinary Tip:
"${culinaryTipForNextTime}"

Built with Food Wars — Educational prototype.`;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.warn('Clipboard write failed:', e);
    }
  };

  return (
    <div className="card-shell p-6 md:p-8 space-y-8 bg-white border border-[#E2DBD0]">
      {/* Header with Mandatory Badge */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2DBD0] pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {/* Mandatory Badge */}
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full badge-forest text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              AI-Generated Evaluation
            </span>

            {metricBreakdown.bonusPoints > 0 && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full badge-terracotta text-xs font-bold uppercase tracking-wider">
                <Flame className="w-3.5 h-3.5" />
                +{metricBreakdown.bonusPoints} Survival Bonus!
              </span>
            )}
          </div>

          <h2 className="text-2xl md:text-3xl font-extrabold text-[#1C2B24]">
            {dishName || recipe.dishName}
          </h2>
          <p className="text-xs text-[#4C6055] font-medium">
            Challenge Cuisine: {recipe.culturalOrigin}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopySummary}
            className="btn-secondary px-3.5 py-2 text-xs font-semibold cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-[#2F5D50]" />
                <span>Score Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy Score Summary</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onCookAnother}
            className="btn-primary px-4 py-2 text-xs font-semibold cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Cook Another Challenge</span>
          </button>
        </div>
      </div>

      {/* Main Score & Photo Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        {/* Total Score Meter */}
        <div className="p-6 rounded-2xl bg-[#FAF8F3] border border-[#E2DBD0] text-center space-y-2 flex flex-col items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-[#E7EFEA] flex items-center justify-center text-[#2F5D50] mb-1">
            <Trophy className="w-5 h-5 text-[#C97B4A]" />
          </div>
          <div className="text-xs uppercase font-bold tracking-widest text-[#4C6055]">
            Overall Challenge Score
          </div>
          <div className="text-5xl font-black text-[#2F5D50] tracking-tight">
            {totalScore}
            <span className="text-xl font-semibold text-[#4C6055]">/100</span>
          </div>

          {metricBreakdown.bonusPoints > 0 && (
            <div className="text-xs text-[#C97B4A] font-bold bg-[#FBEFE7] px-3 py-1 rounded-full border border-[#F3DAC8]">
              Includes +{metricBreakdown.bonusPoints} Minimal-Ingredient Bonus
            </div>
          )}
        </div>

        {/* Dish Photo Thumbnail if available */}
        <div className="md:col-span-2 space-y-2">
          {photoUrl ? (
            <div className="rounded-xl overflow-hidden border border-[#E2DBD0] max-h-48 bg-stone-50">
              <img
                src={photoUrl}
                alt="Finished meal"
                className="w-full h-48 object-cover"
              />
            </div>
          ) : (
            <div className="p-5 rounded-xl bg-[#FAF8F3] border border-[#E2DBD0] text-xs text-[#4C6055] italic">
              Evaluated based on pantry adaptation efficiency, recipe execution, and cook reflection.
            </div>
          )}

          {/* Positive Feedback Summary */}
          {positiveFeedback && (
            <div className="p-3.5 rounded-xl bg-[#E7EFEA] border border-[#CFE2D7] text-xs text-[#1C2B24] leading-relaxed">
              <strong className="text-[#2F5D50] block mb-0.5">Mentor Evaluation:</strong>
              {positiveFeedback}
            </div>
          )}
        </div>
      </div>

      {/* Metric Breakdown Grid */}
      <div className="space-y-4 pt-2">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#1C2B24] flex items-center gap-2">
          <Award className="w-4 h-4 text-[#2F5D50]" />
          Objective Metric Breakdown
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Veggie Balance */}
          <div className="p-4 rounded-xl bg-[#FAF8F3] border border-[#E2DBD0] space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-[#4C6055]">
              <span className="flex items-center gap-1">
                <Salad className="w-4 h-4 text-[#2F5D50]" />
                Veggie Balance
              </span>
              <span className="font-bold text-[#1C2B24]">
                {metricBreakdown.veggieBalance}/35
              </span>
            </div>
            <div className="w-full h-1.5 bg-[#E2DBD0] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#2F5D50] rounded-full"
                style={{ width: `${(metricBreakdown.veggieBalance / 35) * 100}%` }}
              />
            </div>
            <p className="text-[11px] text-[#4C6055]">Macronutrient balance and vegetable integration.</p>
          </div>

          {/* Ingredient Efficiency */}
          <div className="p-4 rounded-xl bg-[#FAF8F3] border border-[#E2DBD0] space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-[#4C6055]">
              <span className="flex items-center gap-1">
                <Sparkles className="w-4 h-4 text-[#2F5D50]" />
                Efficiency
              </span>
              <span className="font-bold text-[#1C2B24]">
                {metricBreakdown.ingredientEfficiency}/35
              </span>
            </div>
            <div className="w-full h-1.5 bg-[#E2DBD0] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#2F5D50] rounded-full"
                style={{ width: `${(metricBreakdown.ingredientEfficiency / 35) * 100}%` }}
              />
            </div>
            <p className="text-[11px] text-[#4C6055]">Minimal waste and smart use of available items.</p>
          </div>

          {/* Cultural Technique */}
          <div className="p-4 rounded-xl bg-[#FAF8F3] border border-[#E2DBD0] space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-[#4C6055]">
              <span className="flex items-center gap-1">
                <Flame className="w-4 h-4 text-[#2F5D50]" />
                Technique
              </span>
              <span className="font-bold text-[#1C2B24]">
                {metricBreakdown.culturalTechnique}/30
              </span>
            </div>
            <div className="w-full h-1.5 bg-[#E2DBD0] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#2F5D50] rounded-full"
                style={{ width: `${(metricBreakdown.culturalTechnique / 30) * 100}%` }}
              />
            </div>
            <p className="text-[11px] text-[#4C6055]">Thoughtful execution of traditional flavor profiles.</p>
          </div>

          {/* Survival Bonus */}
          <div className="p-4 rounded-xl bg-[#FBEFE7] border border-[#F3DAC8] space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-[#C97B4A]">
              <span className="flex items-center gap-1">
                <Flame className="w-4 h-4" />
                Survival Bonus
              </span>
              <span className="font-bold text-[#C97B4A]">
                +{metricBreakdown.bonusPoints}/20
              </span>
            </div>
            <div className="w-full h-1.5 bg-[#F3DAC8] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#C97B4A] rounded-full"
                style={{ width: `${(metricBreakdown.bonusPoints / 20) * 100}%` }}
              />
            </div>
            <p className="text-[11px] text-[#C97B4A]">Reward for 3 or fewer base pantry staples.</p>
          </div>
        </div>
      </div>

      {/* Mentor's Culinary Tip */}
      {culinaryTipForNextTime && (
        <div className="p-5 rounded-xl bg-[#FAF8F3] border-l-4 border-[#C97B4A] space-y-1 text-sm text-[#1C2B24]">
          <div className="text-xs font-bold uppercase tracking-wider text-[#C97B4A] flex items-center gap-1.5">
            <Lightbulb className="w-4 h-4" />
            Mentor&apos;s Culinary Tip for Next Time
          </div>
          <p className="leading-relaxed pl-5 font-medium">{culinaryTipForNextTime}</p>
        </div>
      )}
    </div>
  );
};
