import React from 'react';
import { Trophy, Medal, Flame, Calendar, Salad, RotateCcw } from 'lucide-react';
import { LeaderboardEntry } from '../types';

interface SessionLeaderboardProps {
  entries: LeaderboardEntry[];
  currentEntryId?: string;
  onCookAnother?: () => void;
}

export const SessionLeaderboard: React.FC<SessionLeaderboardProps> = ({
  entries,
  currentEntryId,
  onCookAnother,
}) => {
  // Sort descending by totalScore
  const sortedEntries = [...entries].sort((a, b) => b.totalScore - a.totalScore);

  return (
    <div className="card-shell p-6 md:p-8 space-y-6 bg-white border border-[#E2DBD0]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2DBD0] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[#C97B4A]" />
            <h3 className="text-xl font-bold text-[#1C2B24]">Session Leaderboard</h3>
          </div>
          <p className="text-xs text-[#4C6055]">
            Ranked by total challenge score for all dishes cooked in this browser session.
          </p>
        </div>

        {onCookAnother && (
          <button
            type="button"
            onClick={onCookAnother}
            className="btn-primary text-xs py-2 px-3.5 cursor-pointer self-start sm:self-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Cook Another Challenge</span>
          </button>
        )}
      </div>

      {sortedEntries.length === 0 ? (
        <div className="p-8 text-center rounded-xl bg-[#FAF8F3] border border-dashed border-[#D9CFBE] space-y-2">
          <Salad className="w-8 h-8 text-[#4C6055] mx-auto opacity-60" />
          <h4 className="font-semibold text-sm text-[#1C2B24]">No Challenges Logged Yet</h4>
          <p className="text-xs text-[#4C6055] max-w-sm mx-auto">
            Complete your first recipe challenge to get graded by the AI mentor and earn your place on the scoreboard!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedEntries.map((entry, index) => {
            const isCurrent = entry.id === currentEntryId;
            const rank = index + 1;

            return (
              <div
                key={entry.id}
                className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                  isCurrent
                    ? 'bg-[#E7EFEA] border-[#2F5D50] shadow-sm ring-1 ring-[#2F5D50]/30'
                    : 'bg-[#FAF8F3] border-[#E2DBD0] hover:bg-[#F5F1E8]'
                }`}
              >
                {/* Left: Rank & Dish Info */}
                <div className="flex items-center gap-3">
                  {/* Rank Badge */}
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-sm flex-shrink-0 ${
                      rank === 1
                        ? 'bg-[#C97B4A] text-white shadow'
                        : rank === 2
                        ? 'bg-[#2F5D50] text-white'
                        : rank === 3
                        ? 'bg-[#D9CFBE] text-[#1C2B24]'
                        : 'bg-white text-[#4C6055] border border-[#D9CFBE]'
                    }`}
                  >
                    {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
                  </div>

                  {entry.photoUrl && (
                    <img
                      src={entry.photoUrl}
                      alt={entry.dishName}
                      className="w-12 h-12 rounded-lg object-cover border border-[#E2DBD0] flex-shrink-0"
                    />
                  )}

                  <div className="space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-sm text-[#1C2B24]">
                        {entry.dishName}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-[#2F5D50] text-white px-2 py-0.5 rounded-full">
                          Current Meal
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-[#4C6055]">
                      <span>{entry.cuisine}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(entry.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Scores & Breakdown Badges */}
                <div className="flex items-center gap-3 self-end sm:self-auto">
                  <div className="text-right">
                    <div className="text-2xl font-black text-[#2F5D50]">
                      {entry.totalScore}
                      <span className="text-xs font-semibold text-[#4C6055]"> pts</span>
                    </div>
                    {entry.metricBreakdown.bonusPoints > 0 && (
                      <div className="text-[10px] text-[#C97B4A] font-bold flex items-center gap-0.5 justify-end">
                        <Flame className="w-3 h-3" />
                        +{entry.metricBreakdown.bonusPoints} Survival Bonus
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
