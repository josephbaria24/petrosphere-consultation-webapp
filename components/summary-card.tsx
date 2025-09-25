import React from 'react';
import { Award, BarChart3, Building2, GaugeCircle, Star, TrendingDown, TrendingUp, Users2 } from "lucide-react";



const toPercentage = (score) => {
  return (score / 5) * 100; 
};

// Basic UI Components
const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-xl border border-gray-200 ${className}`}>
    {children}
  </div>
);

const CardHeader = ({ children, className = '' }) => (
  <div className={`px-6 py-5 border-b border-gray-100 ${className}`}>
    {children}
  </div>
);

const CardTitle = ({ children, className = '' }) => (
  <h3 className={`text-lg font-semibold text-gray-900 ${className}`}>
    {children}
  </h3>
);

const CardContent = ({ children, className = '' }) => (
  <div className={`px-6 py-5 ${className}`}>
    {children}
  </div>
);

const Progress = ({ value, className = '' }) => (
  <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${className}`}>
    <div 
      className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300 ease-out"
      style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
    />
  </div>
);

const Badge = ({ children, variant = 'default', className = '' }) => {
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

// Main Professional Survey Summary Card Component
export const ProfessionalSurveySummaryCard = ({ 
  selectedSurvey, 
  respondentCount, 
  avgScore, 
  trend 
}) => {
  const getLevelLabel = (score) => {
    if (score >= 4.20 && score <= 5.0) return { label: 'Level 5 – Excellence (Resilient & Learning Culture)', variant: 'excellent', icon: Star };
    if (score >= 3.40) return { label: 'Level 4 – Integrated (Cooperative Culture)', variant: 'excellent', icon: Star };
    if (score >= 2.60) return { label: 'Level 3 – Interdependent (Engaged Workforce)', variant: 'good', icon: Award };
    if (score >= 1.80) return { label: 'Level 2 – Independent (Managing Safely)', variant: 'fair', icon: GaugeCircle };
    return { label: 'Level 1 – Dependent (Rules-Driven)', variant: 'poor', icon: GaugeCircle };
  };
  
  const levelInfo = getLevelLabel(avgScore);
  const LevelIcon = levelInfo.icon;

  return (
    <Card className="w-full shadow-xl border-0 bg-card overflow-hidden">
      {/* Header with gradient background */}
      {/* <CardHeader className="bg-blue-600 dark:bg-zinc-800 text-white border-0 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/5"></div>
        <CardTitle className="flex items-center gap-3 text-white relative z-10">
          <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
            <BarChart3 className="w-5 h-5" />
          </div>
          <span className="font-semibold">Survey Summary</span>
        </CardTitle>
      </CardHeader> */}
      <div className="pt-3 pl-5 bg-card flex gap-2">
            <BarChart3 className="w-5 h-5" />
            <span className="font-semibold">Survey Summary</span>
          </div>
          

      <CardContent className="space-y-6 bg-card">
        {/* Level Highlight Section */}
        {/* <div className="bg-card from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-600 dark:text-zinc-300 ">Your Company Score:</span>
            <LevelIcon className="w-5 h-5 text-gray-500" />
          </div>
          <div className="flex flex-col gap-3">
            <Badge variant={levelInfo.variant} className="text-lg font-semibold px-3 py-1 self-start">
              { levelInfo.label}
            </Badge>
            <div className="text-2xl font-bold text-gray-900 dark:text-zinc-300">
              {toPercentage(avgScore).toFixed(0)}%
              <span className="text-sm text-gray-500 font-normal ml-2">
                ({avgScore.toFixed(2)} / 5.0)
              </span>
            </div>

          </div>
        </div> */}

        {/* Company and Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full">

          <div className="flex items-center gap-3 p-3 bg-card rounded-lg border border-gray-100">
            <div className="p-2 bg-blue-50 dark:bg-zinc-700 rounded-lg">
              <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <span className="text-xs text-gray-500 dark:text-zinc-300 font-medium">Company</span>
              <p className="font-semibold text-gray-900  dark:text-zinc-300 truncate">
                {selectedSurvey?.target_company || "N/A"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-card rounded-lg border border-gray-100">
            <div className="p-2 bg-green-50  dark:bg-zinc-700 rounded-lg">
              <Users2 className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1">
              <span className="text-xs text-gray-500 dark:text-zinc-300  font-medium">Respondents</span>
              <p className="font-semibold text-gray-900  dark:text-primary">{respondentCount.toLocaleString()}</p>
            </div>
          </div>
              {/* Trend Section */}
        <div className="bg-card rounded-lg border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-600  dark:text-zinc-300">Trending Direction</span>
            {trend >= 0 ? (
              <TrendingUp className="w-4 h-4 text-emerald-500  dark:text-emerald-300" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-500" />
            )}
          </div>
          
          <div className="flex items-center gap-2 mb-3">
          <span className={`text-lg font-bold ${trend >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {trend > 0 ? "+" : ""}{toPercentage(trend + avgScore).toFixed(0)}%
          </span>

            <span className="text-sm text-gray-500  dark:text-zinc-300">vs previous period</span>
          </div>
          
          <Progress value={Math.abs(trend * 100)} className="h-2" />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>0</span>
            <span>Change Impact</span>
          </div>
        </div>
        </div>

    
      </CardContent>
    </Card>
  );
};

// Default export
export default ProfessionalSurveySummaryCard;