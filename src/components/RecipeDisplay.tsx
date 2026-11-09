import React, { useState } from 'react';
import {
  Clock,
  Flame,
  CheckCircle2,
  Circle,
  HelpCircle,
  Mic,
  Send,
  Timer,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  HeartPulse,
  ChefHat,
  MessageSquareQuote,
  AlertTriangle,
} from 'lucide-react';
import { Recipe } from '../types';
import { safeFetchJson } from '../utils/api';

interface RecipeDisplayProps {
  recipe: Recipe;
  onOpenLiveVoice: () => void;
  onFinishCooking: () => void;
  onBackToSetup: () => void;
}

export const RecipeDisplay: React.FC<RecipeDisplayProps> = ({
  recipe,
  onOpenLiveVoice,
  onFinishCooking,
  onBackToSetup,
}) => {
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});
  const [activeTimers, setActiveTimers] = useState<Record<number, number>>({});
  const [quickQuestion, setQuickQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [troubleshootHistory, setTroubleshootHistory] = useState<
    Array<{ q: string; a: string; time: string }>
  >([]);

  const toggleStep = (stepNumber: number) => {
    setCompletedSteps((prev) => ({
      ...prev,
      [stepNumber]: !prev[stepNumber],
    }));
  };

  const startTimer = (stepNumber: number, minutes: number) => {
    if (activeTimers[stepNumber]) {
      // cancel
      setActiveTimers((prev) => {
        const next = { ...prev };
        delete next[stepNumber];
        return next;
      });
      return;
    }

    const totalSeconds = minutes * 60;
    setActiveTimers((prev) => ({ ...prev, [stepNumber]: totalSeconds }));

    const interval = setInterval(() => {
      setActiveTimers((prev) => {
        const current = prev[stepNumber];
        if (!current || current <= 1) {
          clearInterval(interval);
          const next = { ...prev };
          delete next[stepNumber];
          return next;
        }
        return { ...prev, [stepNumber]: current - 1 };
      });
    }, 1000);
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleAskQuestion = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!quickQuestion.trim() || isAsking) return;

    const query = quickQuestion.trim();
    setIsAsking(true);
    setQuickQuestion('');

    try {
      const data = await safeFetchJson<{ advice: string; penaltyFreeNotice: string }>('/api/troubleshoot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dishName: recipe.dishName,
          question: query,
        }),
      });

      setTroubleshootHistory((prev) => [
        ...prev,
        {
          q: query,
          a: data.advice,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err) {
      console.error(err);
      setTroubleshootHistory((prev) => [
        ...prev,
        {
          q: query,
          a: 'Stove Tip: Lower heat slightly, stir regularly, and taste carefully. (Connection note: try again in a moment).',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsAsking(false);
    }
  };

  const totalSteps = recipe.steps.length;
  const doneCount = Object.values(completedSteps).filter(Boolean).length;
  const progressPercent = Math.round((doneCount / (totalSteps || 1)) * 100);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 py-2">
      {/* Top Navigation & Badges */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBackToSetup}
          className="inline-flex items-center gap-1.5 text-sm text-[#4C6055] hover:text-[#1C2B24] transition-colors cursor-pointer font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Setup
        </button>

        <div className="flex items-center gap-2">
          {/* Mandatory AI Badge */}
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full badge-forest text-xs font-bold tracking-wide uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            AI-Generated Recipe
          </span>

          {recipe.isSurvivalChallenge && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full badge-terracotta text-xs font-bold tracking-wide uppercase">
              <Flame className="w-3.5 h-3.5" />
              Survival Challenge Mode (+Bonus Points)
            </span>
          )}
        </div>
      </div>

      {/* Recipe Summary Hero Card */}
      <div className="card-shell p-6 md:p-8 space-y-6">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs uppercase tracking-wider font-semibold text-[#C97B4A] bg-[#FBEFE7] px-2.5 py-1 rounded-md border border-[#F3DAC8]">
              {recipe.culturalOrigin}
            </span>

            <div className="flex items-center gap-4 text-xs font-medium text-[#4C6055]">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4 text-[#2F5D50]" />
                {recipe.estimatedTimeMinutes} mins
              </span>
              <span className="flex items-center gap-1">
                <ChefHat className="w-4 h-4 text-[#2F5D50]" />
                Difficulty: <strong className="text-[#1C2B24]">{recipe.difficulty}</strong>
              </span>
            </div>
          </div>

          <h2 className="text-3xl md:text-4xl font-extrabold text-[#1C2B24] tracking-tight">
            {recipe.dishName}
          </h2>

          {/* Mentor Note */}
          {recipe.mentorNote && (
            <div className="p-3.5 rounded-lg bg-[#FAF8F3] border-l-4 border-[#2F5D50] text-sm text-[#1C2B24] italic flex items-start gap-2.5">
              <MessageSquareQuote className="w-4 h-4 text-[#2F5D50] flex-shrink-0 mt-0.5" />
              <span>&ldquo;{recipe.mentorNote}&rdquo;</span>
            </div>
          )}
        </div>

        {/* Nutritional & Health Benefits */}
        {recipe.healthBenefits && recipe.healthBenefits.length > 0 && (
          <div className="p-4 rounded-xl bg-[#FAF8F3] border border-[#E2DBD0] space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-[#2F5D50] flex items-center gap-1.5">
              <HeartPulse className="w-4 h-4" />
              Nutritional & Habit Highlights
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#1C2B24]">
              {recipe.healthBenefits.map((benefit, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <span className="text-[#2F5D50] font-bold">•</span>
                  <span>{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ingredients Checklist Grid */}
        <div className="space-y-3 pt-2">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#1C2B24]">
            Adapted Challenge Ingredients
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {recipe.ingredientsNeeded.map((ing, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg border border-[#E2DBD0] bg-white flex items-start justify-between gap-2 text-sm"
              >
                <div>
                  <div className="font-semibold text-[#1C2B24]">{ing.item}</div>
                  <div className="text-xs text-[#4C6055]">{ing.amount}</div>
                  {ing.substituteNote && (
                    <div className="text-[11px] text-[#C97B4A] mt-0.5">{ing.substituteNote}</div>
                  )}
                </div>
                <span
                  className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                    ing.isFromPantry
                      ? 'bg-[#E7EFEA] text-[#2F5D50]'
                      : 'bg-stone-100 text-stone-600'
                  }`}
                >
                  {ing.isFromPantry ? 'From Pantry' : 'Pantry Staple'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Interactive Cooking Station Steps */}
      <div className="card-shell p-6 md:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold text-[#1C2B24]">Kitchen Station Instructions</h3>
            <p className="text-sm text-[#4C6055]">
              Check off steps as you cook. Use stove timers and technique tips to master the cultural
              profile.
            </p>
          </div>

          <div className="flex items-center gap-2 text-sm font-medium text-[#2F5D50] bg-[#E7EFEA] px-3 py-1.5 rounded-lg self-start">
            <span>
              {doneCount} of {totalSteps} Steps Complete ({progressPercent}%)
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 bg-[#E2DBD0] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#2F5D50] transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Steps List */}
        <div className="space-y-4 pt-2">
          {recipe.steps.map((step) => {
            const isDone = !!completedSteps[step.stepNumber];
            const timerSecs = activeTimers[step.stepNumber];

            return (
              <div
                key={step.stepNumber}
                className={`p-4 md:p-5 rounded-xl border transition-all ${
                  isDone
                    ? 'bg-[#FAF8F3]/60 border-[#D9CFBE] opacity-80'
                    : 'bg-white border-[#E2DBD0] shadow-sm'
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => toggleStep(step.stepNumber)}
                    className="mt-0.5 text-[#2F5D50] hover:text-[#24493e] transition-transform active:scale-90 cursor-pointer flex-shrink-0"
                    aria-label={`Toggle step ${step.stepNumber}`}
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-6 h-6 fill-[#2F5D50] text-white" />
                    ) : (
                      <Circle className="w-6 h-6 text-[#D9CFBE]" />
                    )}
                  </button>

                  <div className="space-y-2 flex-grow">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4
                        className={`font-bold text-base ${
                          isDone ? 'line-through text-[#4C6055]' : 'text-[#1C2B24]'
                        }`}
                      >
                        Step {step.stepNumber}: {step.title}
                      </h4>

                      {/* Timer button if step specifies time */}
                      {step.timerMinutes && (
                        <button
                          type="button"
                          onClick={() => startTimer(step.stepNumber, step.timerMinutes || 5)}
                          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md border transition-colors cursor-pointer ${
                            timerSecs !== undefined
                              ? 'bg-[#C97B4A] text-white border-[#C97B4A] animate-pulse'
                              : 'bg-[#F5F1E8] text-[#1C2B24] border-[#D9CFBE] hover:bg-[#ECE5D8]'
                          }`}
                        >
                          <Timer className="w-3.5 h-3.5" />
                          {timerSecs !== undefined
                            ? `Timer: ${formatTimer(timerSecs)}`
                            : `Set ${step.timerMinutes}m Timer`}
                        </button>
                      )}
                    </div>

                    <p className={`text-sm leading-relaxed ${isDone ? 'text-[#4C6055]' : 'text-[#1C2B24]'}`}>
                      {step.instruction}
                    </p>

                    {/* Technique Tip */}
                    {step.techniqueTip && (
                      <div className="p-2.5 rounded-lg bg-[#FAF8F3] border border-[#E2DBD0] text-xs text-[#4C6055] flex items-start gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-[#C97B4A] flex-shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-[#1C2B24]">Cultural Technique Tip: </strong>
                          {step.techniqueTip}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* "Need Help at the Stove?" Panel */}
      <div className="card-shell p-6 md:p-8 space-y-6 bg-gradient-to-b from-white to-[#FAF8F3] border-2 border-[#D9CFBE]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-[#2F5D50]" />
              <h3 className="text-lg font-bold text-[#1C2B24]">Need Help at the Stove?</h3>
            </div>
            {/* Mandatory Status Note */}
            <p className="text-xs text-[#2F5D50] font-medium bg-[#E7EFEA] px-2.5 py-1 rounded-md inline-block">
              Live mentor simulation — asking questions will not reduce your challenge score.
            </p>
          </div>

          {/* Toggle for Hands-free Live Voice Mode */}
          <button
            type="button"
            onClick={onOpenLiveVoice}
            className="btn-accent px-4 py-2.5 text-sm cursor-pointer shadow-sm hover:shadow flex items-center justify-center gap-2 flex-shrink-0"
          >
            <Mic className="w-4 h-4 animate-bounce" />
            <span>Hands-free Live Voice Mode</span>
          </button>
        </div>

        {/* Quick Text Question Input */}
        <form onSubmit={handleAskQuestion} className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. My sauce is too thin, how do I thicken it? Or can I swap vinegar for lime?"
              value={quickQuestion}
              onChange={(e) => setQuickQuestion(e.target.value)}
              className="input-field flex-grow text-sm"
              disabled={isAsking}
            />
            <button
              type="submit"
              disabled={!quickQuestion.trim() || isAsking}
              className="btn-primary px-4 cursor-pointer text-sm"
            >
              {isAsking ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">Ask Mentor</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-[#4C6055]">
            <span>Quick asks:</span>
            <button
              type="button"
              onClick={() => {
                setQuickQuestion('How do I know when the spices are properly bloomed?');
              }}
              className="underline hover:text-[#1C2B24] cursor-pointer"
            >
              Blooming spices?
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => {
                setQuickQuestion('My pan is sticking, how can I save it?');
              }}
              className="underline hover:text-[#1C2B24] cursor-pointer"
            >
              Pan sticking?
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => {
                setQuickQuestion('How can I dial back the acidity?');
              }}
              className="underline hover:text-[#1C2B24] cursor-pointer"
            >
              Too acidic?
            </button>
          </div>
        </form>

        {/* Troubleshoot Q&A Log */}
        {troubleshootHistory.length > 0 && (
          <div className="space-y-3 pt-3 border-t border-[#E2DBD0]">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#4C6055]">
              Stove-Side Advice Log
            </h4>
            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {troubleshootHistory.map((item, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-white border border-[#E2DBD0] text-xs space-y-1">
                  <div className="flex items-center justify-between font-semibold text-[#1C2B24]">
                    <span>Q: {item.q}</span>
                    <span className="text-[10px] text-[#4C6055] font-normal">{item.time}</span>
                  </div>
                  <div className="text-[#2F5D50] leading-relaxed pl-2 border-l-2 border-[#2F5D50]">
                    {item.a}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Transition Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-xl bg-white border border-[#E2DBD0] shadow-sm">
        <div className="space-y-0.5 text-center sm:text-left">
          <h4 className="font-bold text-[#1C2B24]">Ready to Plate & Present?</h4>
          <p className="text-xs text-[#4C6055]">
            Snap a photo of your finished meal to receive your objective challenge evaluation and points!
          </p>
        </div>

        <button
          type="button"
          onClick={onFinishCooking}
          className="btn-accent py-3 px-6 text-sm font-bold shadow-md cursor-pointer flex items-center gap-2 w-full sm:w-auto justify-center"
        >
          <span>Finished Cooking — Score My Meal</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
