/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ChefHat, Trophy, RotateCcw, AlertTriangle, ShieldAlert } from 'lucide-react';
import { ChallengeSetup } from './components/ChallengeSetup';
import { RecipeDisplay } from './components/RecipeDisplay';
import { LiveVoiceAssistant } from './components/LiveVoiceAssistant';
import { ImageUploader } from './components/ImageUploader';
import { Scorecard } from './components/Scorecard';
import { SessionLeaderboard } from './components/SessionLeaderboard';
import { Recipe, DishEvaluation, LeaderboardEntry, CuisineOption } from './types';

import { safeFetchJson } from './utils/api';

type Screen = 'setup' | 'recipe' | 'submit' | 'scorecard';

const STORAGE_KEY = 'food_wars_leaderboard_v1';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('setup');
  const [selectedCuisine, setSelectedCuisine] = useState<string>('Mexican');
  const [pantryIngredients, setPantryIngredients] = useState<string>('');

  const [currentRecipe, setCurrentRecipe] = useState<Recipe | null>(null);
  const [isGeneratingRecipe, setIsGeneratingRecipe] = useState<boolean>(false);
  const [recipeError, setRecipeError] = useState<string | null>(null);

  const [isLiveVoiceOpen, setIsLiveVoiceOpen] = useState<boolean>(false);

  const [lastUploadedPhotoUrl, setLastUploadedPhotoUrl] = useState<string | undefined>(undefined);
  const [currentEvaluation, setCurrentEvaluation] = useState<DishEvaluation | null>(null);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [evalError, setEvalError] = useState<string | null>(null);

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [currentEntryId, setCurrentEntryId] = useState<string | undefined>(undefined);
  const [showLeaderboardModal, setShowLeaderboardModal] = useState<boolean>(false);

  // Load session leaderboard from storage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setLeaderboard(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Could not load session leaderboard:', e);
    }
  }, []);

  // Save leaderboard to storage whenever it changes
  const saveLeaderboard = (newEntries: LeaderboardEntry[]) => {
    setLeaderboard(newEntries);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newEntries));
    } catch (e) {
      console.warn('Could not save session leaderboard:', e);
    }
  };

  // Screen 1: Generate Recipe
  const handleGenerateRecipe = async (
    cuisine: CuisineOption,
    customCuisine: string,
    ingredients: string
  ) => {
    setIsGeneratingRecipe(true);
    setRecipeError(null);
    const chosenCuisine = cuisine === 'Custom' && customCuisine ? customCuisine : cuisine;
    setSelectedCuisine(chosenCuisine);
    setPantryIngredients(ingredients);

    try {
      const recipe = await safeFetchJson<Recipe>('/api/generate-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cuisine,
          customCuisine,
          pantryIngredients: ingredients,
        }),
      });

      setCurrentRecipe(recipe);
      setCurrentScreen('recipe');
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Generate recipe error:', error);
      setRecipeError(error.message || 'Error communicating with culinary mentor. Please retry.');
    } finally {
      setIsGeneratingRecipe(false);
    }
  };

  // Screen 4: Submit Dish for Evaluation
  const handleSubmitForScoring = async (
    photoBase64: string | undefined,
    photoMimeType: string | undefined,
    reflection: string
  ) => {
    if (!currentRecipe) return;

    setIsEvaluating(true);
    setEvalError(null);
    if (photoBase64) {
      setLastUploadedPhotoUrl(photoBase64);
    }

    try {
      const evalResult = await safeFetchJson<DishEvaluation>('/api/evaluate-dish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dishName: currentRecipe.dishName,
          pantryIngredients,
          reflection,
          photoBase64,
          photoMimeType,
        }),
      });

      setCurrentEvaluation(evalResult);

      // Create new Leaderboard Entry
      const entryId = 'entry_' + Date.now();
      setCurrentEntryId(entryId);

      const newEntry: LeaderboardEntry = {
        id: entryId,
        dishName: evalResult.dishName || currentRecipe.dishName,
        cuisine: currentRecipe.culturalOrigin || selectedCuisine,
        totalScore: evalResult.totalScore,
        metricBreakdown: evalResult.metricBreakdown,
        culinaryTip: evalResult.culinaryTipForNextTime,
        positiveFeedback: evalResult.positiveFeedback,
        timestamp: Date.now(),
        photoUrl: photoBase64,
        reflection,
        isSurvivalChallenge: currentRecipe.isSurvivalChallenge,
      };

      saveLeaderboard([newEntry, ...leaderboard]);
      setCurrentScreen('scorecard');
    } catch (err: unknown) {
      const error = err as Error;
      console.error(error);
      setEvalError(error.message || 'Evaluation failed. Please retry.');
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleCookAnotherChallenge = () => {
    setCurrentRecipe(null);
    setCurrentEvaluation(null);
    setLastUploadedPhotoUrl(undefined);
    setCurrentEntryId(undefined);
    setCurrentScreen('setup');
  };

  return (
    <div className="min-h-screen bg-[#F5F1E8] text-[#1C2B24] flex flex-col justify-between selection:bg-[#2F5D50] selection:text-white">
      {/* Top Application Bar */}
      <header className="sticky top-0 z-40 bg-[#F5F1E8]/90 backdrop-blur-md border-b border-[#E2DBD0] px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div
            onClick={handleCookAnotherChallenge}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-lg bg-[#2F5D50] flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
              <ChefHat className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight text-[#1C2B24] block leading-none">
                Food Wars
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#C97B4A]">
                Gamified Cultural Cooking
              </span>
            </div>
          </div>

          {/* Quick Header Navigation & Leaderboard Counter */}
          <div className="flex items-center gap-3">
            {leaderboard.length > 0 && (
              <button
                type="button"
                onClick={() => setShowLeaderboardModal(true)}
                className="btn-secondary text-xs py-1.5 px-3 cursor-pointer flex items-center gap-1.5"
              >
                <Trophy className="w-3.5 h-3.5 text-[#C97B4A]" />
                <span className="font-semibold">{leaderboard.length} Challenges Logged</span>
              </button>
            )}

            {currentScreen !== 'setup' && (
              <button
                type="button"
                onClick={handleCookAnotherChallenge}
                className="text-xs text-[#4C6055] hover:text-[#1C2B24] transition-colors flex items-center gap-1 cursor-pointer font-medium"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">New Challenge</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main App Content Flow */}
      <main className="flex-grow max-w-5xl w-full mx-auto px-4 py-6 md:py-8">
        {currentScreen === 'setup' && (
          <ChallengeSetup
            onGenerateRecipe={handleGenerateRecipe}
            isLoading={isGeneratingRecipe}
            error={recipeError}
          />
        )}

        {currentScreen === 'recipe' && currentRecipe && (
          <RecipeDisplay
            recipe={currentRecipe}
            onOpenLiveVoice={() => setIsLiveVoiceOpen(true)}
            onFinishCooking={() => setCurrentScreen('submit')}
            onBackToSetup={() => setCurrentScreen('setup')}
          />
        )}

        {currentScreen === 'submit' && currentRecipe && (
          <ImageUploader
            recipe={currentRecipe}
            pantryIngredients={pantryIngredients}
            onSubmitForScoring={handleSubmitForScoring}
            onBackToRecipe={() => setCurrentScreen('recipe')}
            isLoading={isEvaluating}
            error={evalError}
          />
        )}

        {currentScreen === 'scorecard' && currentEvaluation && currentRecipe && (
          <div className="space-y-8 max-w-4xl mx-auto">
            <Scorecard
              evaluation={currentEvaluation}
              recipe={currentRecipe}
              photoUrl={lastUploadedPhotoUrl}
              onCookAnother={handleCookAnotherChallenge}
            />

            <SessionLeaderboard
              entries={leaderboard}
              currentEntryId={currentEntryId}
              onCookAnother={handleCookAnotherChallenge}
            />
          </div>
        )}
      </main>

      {/* Screen 3: Live Voice Assistant Modal */}
      {currentRecipe && (
        <LiveVoiceAssistant
          recipe={currentRecipe}
          isOpen={isLiveVoiceOpen}
          onClose={() => setIsLiveVoiceOpen(false)}
        />
      )}

      {/* Optional Session Leaderboard View Modal */}
      {showLeaderboardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <SessionLeaderboard
              entries={leaderboard}
              currentEntryId={currentEntryId}
              onCookAnother={() => {
                setShowLeaderboardModal(false);
                handleCookAnotherChallenge();
              }}
            />
            <div className="mt-3 text-center">
              <button
                type="button"
                onClick={() => setShowLeaderboardModal(false)}
                className="btn-secondary py-2 px-6 text-xs cursor-pointer font-bold"
              >
                Close Scoreboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mandatory Footer */}
      <footer className="w-full bg-[#FAF8F3] border-t border-[#E2DBD0] py-6 px-4 mt-12 text-center">
        <div className="max-w-4xl mx-auto space-y-1">
          <p className="text-xs md:text-sm font-medium text-[#1C2B24]">
            Food Wars — Built by Siddhant Rajvanshi. Educational prototype. Not professional advice or
            medical dietary guidance.
          </p>
          <p className="text-[11px] text-[#4C6055]">
            Gamified culinary guidance and objective scoring designed for home cook education.
          </p>
        </div>
      </footer>
    </div>
  );
}
