import React, { useState } from 'react';
import { Sparkles, AlertCircle, Flame, ShieldAlert, ChefHat, Info } from 'lucide-react';
import { CuisineOption } from '../types';

interface ChallengeSetupProps {
  onGenerateRecipe: (cuisine: CuisineOption, customCuisine: string, ingredients: string) => Promise<void>;
  isLoading: boolean;
  error?: string | null;
}

const CUISINE_OPTIONS: CuisineOption[] = [
  'Mexican',
  'East Asian',
  'Mediterranean',
  'Indian',
  'West African',
  'Custom',
];

const PRESETS = [
  {
    label: '⚡ 3-Staple Survival Challenge',
    cuisine: 'Indian' as CuisineOption,
    ingredients: 'Canned chickpeas, yellow onion, ground turmeric & curry powder',
  },
  {
    label: '🌿 Mediterranean Garden Pantry',
    cuisine: 'Mediterranean' as CuisineOption,
    ingredients: 'Dry pasta, frozen spinach, garlic cloves, olive oil, canned crushed tomatoes',
  },
  {
    label: '🌮 Quick Mexican Skillet',
    cuisine: 'Mexican' as CuisineOption,
    ingredients: 'Black beans, corn tortillas, bell pepper, cumin, garlic, lime',
  },
  {
    label: '🥢 East Asian Noodle Bowl',
    cuisine: 'East Asian' as CuisineOption,
    ingredients: 'Rice noodles, cabbage, soy sauce, eggs, green onions, sesame seeds',
  },
];

export const ChallengeSetup: React.FC<ChallengeSetupProps> = ({
  onGenerateRecipe,
  isLoading,
  error,
}) => {
  const [selectedCuisine, setSelectedCuisine] = useState<CuisineOption>('Mexican');
  const [customCuisine, setCustomCuisine] = useState('');
  const [pantryIngredients, setPantryIngredients] = useState('');

  // Count items by commas or line breaks
  const rawItems = pantryIngredients
    .split(/[,\n]+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  const itemCount = rawItems.length;
  const isButtonDisabled = itemCount < 2 || isLoading;
  const isSurvivalChallenge = itemCount >= 2 && itemCount <= 3;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isButtonDisabled) return;
    onGenerateRecipe(selectedCuisine, customCuisine, pantryIngredients);
  };

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setSelectedCuisine(preset.cuisine);
    setPantryIngredients(preset.ingredients);
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-8 py-4">
      {/* App Header Banner */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full badge-forest text-xs font-semibold tracking-wide uppercase">
          <ChefHat className="w-4 h-4" />
          Educational Prototype
        </div>

        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-[#1C2B24]">
          Food Wars
        </h1>

        <p className="text-lg text-[#4C6055] max-w-xl mx-auto leading-relaxed">
          Gamified cultural cooking challenges that transform whatever is in your pantry into
          wholesome, authentic global dishes with real-time AI mentoring.
        </p>
      </div>

      {/* Main Challenge Config Form */}
      <div className="card-shell p-6 md:p-8 space-y-8 bg-white border border-[#E2DBD0]">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Cuisine Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-bold uppercase tracking-wider text-[#1C2B24]">
              1. Select Cultural Cuisine
            </label>
            <p className="text-sm text-[#4C6055]">
              Pick a culinary tradition to inspire authentic flavors and techniques.
            </p>

            <div className="flex flex-wrap gap-2.5 pt-1">
              {CUISINE_OPTIONS.map((cuisine) => {
                const isSelected = selectedCuisine === cuisine;
                return (
                  <button
                    key={cuisine}
                    type="button"
                    onClick={() => setSelectedCuisine(cuisine)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-150 cursor-pointer ${
                      isSelected
                        ? 'bg-[#2F5D50] text-white shadow-sm ring-2 ring-[#2F5D50]/20'
                        : 'bg-[#F5F1E8] text-[#1C2B24] hover:bg-[#ECE5D8] border border-[#D9CFBE]'
                    }`}
                  >
                    {cuisine}
                  </button>
                );
              })}
            </div>

            {selectedCuisine === 'Custom' && (
              <div className="mt-3">
                <input
                  type="text"
                  placeholder="e.g. Peruvian, Caribbean, Lebanese, Ethiopian..."
                  value={customCuisine}
                  onChange={(e) => setCustomCuisine(e.target.value)}
                  className="input-field w-full text-sm"
                  autoFocus
                />
              </div>
            )}
          </div>

          {/* Step 2: Pantry Ingredients Input */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <label className="text-sm font-bold uppercase tracking-wider text-[#1C2B24]">
                2. Available Pantry Ingredients
              </label>

              {/* Mandatory Notice */}
              <div className="inline-flex items-center gap-1.5 text-xs text-[#C97B4A] font-medium bg-[#FBEFE7] px-2.5 py-1 rounded-md border border-[#F3DAC8]">
                <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Do not share personal, sensitive, or identifying information.</span>
              </div>
            </div>

            <p className="text-sm text-[#4C6055]">
              Enter the ingredients you have on hand separated by commas or lines. Basic essentials
              like water, cooking oil, salt, and black pepper are assumed available.
            </p>

            <textarea
              rows={4}
              value={pantryIngredients}
              onChange={(e) => setPantryIngredients(e.target.value)}
              placeholder="e.g. black beans, brown rice, garlic, canned diced tomatoes, ground cumin, frozen broccoli"
              className="input-field w-full font-mono text-sm leading-relaxed resize-y"
            />

            {/* Quick Helper Badges / Status */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded-full font-medium ${
                    itemCount >= 2
                      ? 'bg-[#E7EFEA] text-[#2F5D50]'
                      : 'bg-stone-100 text-stone-500'
                  }`}
                >
                  {itemCount} {itemCount === 1 ? 'ingredient detected' : 'ingredients detected'} (Min 2 required)
                </span>

                {isSurvivalChallenge && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FBEFE7] text-[#C97B4A] font-semibold border border-[#F3DAC8]">
                    <Flame className="w-3.5 h-3.5" />
                    Survival Challenge Mode (Bonus Points Eligible!)
                  </span>
                )}
              </div>

              <span className="text-[#4C6055]">
                Tip: Enter 2–3 staples to test survival bonus points!
              </span>
            </div>
          </div>

          {/* Quick Preset Ideas */}
          <div className="space-y-2 pt-2 border-t border-[#E2DBD0]">
            <span className="text-xs font-semibold text-[#4C6055] uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-[#C97B4A]" />
              Or try a quick test pantry loadout:
            </span>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="text-xs bg-[#FAF8F3] hover:bg-[#F5F1E8] text-[#1C2B24] border border-[#E2DBD0] rounded-md px-2.5 py-1.5 transition-colors cursor-pointer text-left"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Error Message if any */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-sm text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          {/* Primary Action Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isButtonDisabled}
              className="btn-primary w-full py-3.5 text-base shadow-md cursor-pointer flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Crafting Your Custom Cultural Challenge...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Generate Cooking Challenge</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Educational Prototype Notice Box */}
      <div className="p-4 rounded-xl bg-[#FAF8F3] border border-[#E2DBD0] flex items-start gap-3 text-xs text-[#4C6055]">
        <Info className="w-4 h-4 text-[#2F5D50] flex-shrink-0 mt-0.5" />
        <p>
          Food Wars recipes are created to inspire healthy home habits, vegetable integration, and minimal food waste.
          Never risk raw meat safety or consume foods with known allergens. This AI tool is strictly educational.
        </p>
      </div>
    </div>
  );
};
