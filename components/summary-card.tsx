/**
 * File: components/summary-card.tsx
 * Description: Professional Survey Summary Card component.
 * Displays high-level stats like organization name, respondent count, and trending direction.
 * Supports inline editing of the organization name for regular users.
 * Functions:
 * - ProfessionalSurveySummaryCard(): Main component for the summary card.
 * - handleSave(): Triggers the organization name update callback.
 * - getLevelLabel(): Determines the culture level based on the average score.
 * Connections:
 * - Used by Dashboard to show survey overview.
 * - Triggers handleUpdateOrgName in Dashboard.
 */

import { useState } from 'react';
import { Award, BarChart3, Building2, GaugeCircle, Pencil, Check, X, Star, TrendingDown, TrendingUp, Users2, Sparkles, Lock } from "lucide-react";

const toPercentage = (score: number) => {
  return (score / 5) * 100;
};

// Basic UI Components
const Card = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-white rounded-xl border border-gray-200 ${className}`}>
    {children}
  </div>
);

const CardContent = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`px-6 py-5 ${className}`}>
    {children}
  </div>
);

const Progress = ({ value, className = '' }: { value: number, className?: string }) => (
  <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${className}`}>
    <div
      className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300 ease-out"
      style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
    />
  </div>
);

const Badge = ({ children, variant = 'default', className = '' }: { children: React.ReactNode, variant?: 'default' | 'excellent' | 'good' | 'fair' | 'poor', className?: string }) => {
  const variants = {
    default: 'bg-gray-100 text-gray-800',
    excellent: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    good: 'bg-blue-100 text-blue-800 border-blue-200',
    fair: 'bg-amber-100 text-amber-800 border-amber-200',
    poor: 'bg-red-100 text-red-800 border-red-200'
  };

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};

interface ProfessionalSurveySummaryCardProps {
  selectedSurvey: any;
  respondentCount: number;
  avgScore: number;
  trend: number;
  orgName?: string;
  onUpdateOrgName?: (newName: string) => Promise<void>;
  isPlatformAdmin?: boolean;
  aiInsights?: any;
  isGeneratingAI?: boolean;
  isDemo?: boolean;
  onUpgradeClick?: () => void;
}

// Main Professional Survey Summary Card Component
export const ProfessionalSurveySummaryCard = ({
  selectedSurvey,
  respondentCount,
  avgScore,
  trend,
  orgName,
  onUpdateOrgName,
  isPlatformAdmin,
  aiInsights,
  isGeneratingAI,
  isDemo,
  onUpgradeClick
}: ProfessionalSurveySummaryCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(orgName || "");

  const handleSave = async () => {
    if (tempName.trim() && onUpdateOrgName) {
      await onUpdateOrgName(tempName);
    }
    setIsEditing(false);
  };

  const getLevelLabel = (score: number) => {
    if (score >= 4.20 && score <= 5.0) return { label: 'Level 5 – Excellence', variant: 'excellent', icon: Star };
    if (score >= 3.40) return { label: 'Level 4 – Integrated', variant: 'excellent', icon: Star };
    if (score >= 2.60) return { label: 'Level 3 – Interdependent', variant: 'good', icon: Award };
    if (score >= 1.80) return { label: 'Level 2 – Independent', variant: 'fair', icon: GaugeCircle };
    return { label: 'Level 1 – Dependent', variant: 'poor', icon: GaugeCircle };
  };

  const levelInfo = getLevelLabel(avgScore);

  return (
    <Card className="w-full shadow-xl border-0 bg-card overflow-visible">
      <div className="pt-3 pl-5 bg-card flex justify-between items-center pr-5">
        <div className="flex gap-2">
          <BarChart3 className="w-5 h-5" />
          <span className="font-semibold">Survey Summary</span>
        </div>
      </div>

      <CardContent className="space-y-6 bg-card">
        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 w-full items-center">

          {/* Score & Gauge Section */}
          <div className="col-span-1 md:col-span-3 flex flex-col items-center justify-center md:border-r border-gray-100 dark:border-zinc-800 pb-6 md:pb-0 md:pr-4">
            <div className="relative w-32 h-16 overflow-hidden">
              {/* Half-circle bg */}
              <div className="absolute top-0 left-0 w-32 h-32 rounded-full border-[12px] border-gray-100 dark:border-zinc-800 box-border"></div>
              {/* Score Arc */}
              <div
                className="absolute top-0 left-0 w-32 h-32 rounded-full border-[12px] border-t-transparent border-r-transparent border-b-transparent transform origin-center transition-all duration-1000 ease-out"
                style={{
                  transform: `rotate(${(avgScore / 5) * 180 - 45}deg)`,
                  borderColor:
                    avgScore >= 4.2 ? '#22c55e' :
                      avgScore >= 3.4 ? '#facc15' :
                        avgScore >= 2.6 ? '#f97316' :
                          avgScore >= 1.8 ? '#b91c1c' : '#7f1d1d'
                }}
              ></div>
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-2xl font-bold">
                {avgScore.toFixed(2)}
              </div>
            </div>
            <Badge variant={levelInfo.variant as any} className="mt-2 text-[10px] px-2 py-0.5">
              {levelInfo.label}
            </Badge>

            {/* AI Quick Insight */}
            <div
              className={`mt-4 px-3 py-2 bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-lg text-center animate-in fade-in slide-in-from-bottom-2 duration-700 w-full relative group/ai ${isDemo ? 'cursor-pointer hover:bg-primary/[0.08] transition-colors overflow-hidden' : ''}`}
              onClick={() => isDemo && onUpgradeClick?.()}
            >
              <div className={`flex items-center justify-center gap-1.5 text-primary font-bold text-[10px] uppercase mb-1 ${isDemo ? 'blur-[1.5px] pointer-events-none' : ''}`}>
                <Sparkles className={`w-3 h-3 ${isGeneratingAI ? 'animate-pulse' : ''}`} />
                AI QUICK INSIGHT
              </div>

              {isDemo && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-1 bg-background/10 backdrop-blur-[1px]">
                  <Lock className="w-3.5 h-3.5 text-primary/80" />
                  <span className="text-[9px] font-black text-primary/80 uppercase tracking-tighter">Get full access</span>
                </div>
              )}

              <div className={isDemo ? 'blur-[4px] pointer-events-none select-none grayscale opacity-60' : ''}>
                {isGeneratingAI ? (
                  <div className="flex flex-col items-center gap-1 py-1">
                    <div className="h-2 w-24 bg-primary/20 animate-pulse rounded" />
                    <div className="h-2 w-16 bg-primary/10 animate-pulse rounded" />
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground leading-tight font-medium italic">
                    {aiInsights?.quick_insight || (
                      avgScore >= 4.2 ? "Resilient culture. Target knowledge sharing." :
                        avgScore >= 3.4 ? "High involvement. Focus on peer accountability." :
                          avgScore >= 2.6 ? "Dependent on systems. Encourage proactive reporting." :
                            avgScore >= 1.8 ? "Reactive state. Bridge the supervisor training gap." :
                              "High risk. Urgent review of basic safety compliance required."
                    )}
                  </p>
                )}
              </div>
            </div>
          </div>


          {/* Details Section */}
          <div className="col-span-1 md:col-span-9 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 bg-card rounded-lg border border-gray-100 dark:border-zinc-800 relative group h-full">
              <div className="p-2 bg-blue-50 dark:bg-zinc-700/50 rounded-lg">
                <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs text-gray-500 dark:text-zinc-400 font-medium">Organization</span>
                {isEditing ? (
                  <div className="flex items-center gap-1 mt-1">
                    <input
                      type="text"
                      value={tempName}
                      onChange={(e) => setTempName(e.target.value)}
                      className="flex-1 min-w-0 bg-background border rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-primary"
                      autoFocus
                    />
                    <button onClick={handleSave} className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded shrink-0">
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={() => setIsEditing(false)} className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded shrink-0">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <p className="font-semibold text-gray-900 dark:text-zinc-100 truncate">
                    {orgName || selectedSurvey?.target_company || "N/A"}
                  </p>
                )}
              </div>
              {!isEditing && !isPlatformAdmin && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditing(true);
                  }}
                  className="absolute top-2 right-2 p-1.5 hover:bg-muted rounded-full z-20 transition-colors opacity-0 group-hover:opacity-100"
                  title="Edit Organization Name"
                >
                  <Pencil className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 p-3 bg-card rounded-lg border border-gray-100 dark:border-zinc-800 h-full">
              <div className="p-2 bg-green-50 dark:bg-zinc-700/50 rounded-lg">
                <Users2 className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1">
                <span className="text-xs text-gray-500 dark:text-zinc-400 font-medium">Respondents</span>
                <p className="font-semibold text-gray-900 dark:text-zinc-100">{respondentCount.toLocaleString()}</p>
              </div>
            </div>

            {/* Trend Section */}
            <div className="bg-card rounded-lg border border-gray-100 dark:border-zinc-800 p-3 h-full flex flex-col justify-center sm:col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-600 dark:text-zinc-400">Trend</span>
                {trend >= 0 ? (
                  <TrendingUp className="w-3 h-3 text-emerald-500" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-red-500" />
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className={`text-base font-bold ${trend >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {trend > 0 ? "+" : ""}{toPercentage(trend + avgScore).toFixed(0)}%
                </span>
                <span className="text-[10px] text-gray-400 dark:text-zinc-500">vs last period</span>
              </div>
            </div>
          </div>
        </div>

      </CardContent>
    </Card>
  );
};

export default ProfessionalSurveySummaryCard;