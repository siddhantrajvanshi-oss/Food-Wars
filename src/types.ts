export type CuisineOption =
  | 'Mexican'
  | 'East Asian'
  | 'Mediterranean'
  | 'Indian'
  | 'West African'
  | 'Custom';

export interface RecipeIngredient {
  item: string;
  amount: string;
  isFromPantry: boolean;
  substituteNote?: string;
}

export interface RecipeStep {
  stepNumber: number;
  title: string;
  instruction: string;
  techniqueTip: string;
  timerMinutes?: number;
}

export interface Recipe {
  dishName: string;
  culturalOrigin: string;
  estimatedTimeMinutes: number;
  difficulty: 'Easy' | 'Medium' | 'Advanced' | string;
  isSurvivalChallenge: boolean;
  healthBenefits: string[];
  ingredientsNeeded: RecipeIngredient[];
  steps: RecipeStep[];
  mentorNote: string;
}

export interface MetricBreakdown {
  ingredientEfficiency: number;
  veggieBalance: number;
  culturalTechnique: number;
  bonusPoints: number;
}

export interface DishEvaluation {
  dishName: string;
  totalScore: number;
  metricBreakdown: MetricBreakdown;
  positiveFeedback: string;
  culinaryTipForNextTime: string;
}

export interface LeaderboardEntry {
  id: string;
  dishName: string;
  cuisine: string;
  totalScore: number;
  metricBreakdown: MetricBreakdown;
  culinaryTip: string;
  positiveFeedback: string;
  timestamp: number;
  photoUrl?: string;
  reflection?: string;
  isSurvivalChallenge?: boolean;
}
