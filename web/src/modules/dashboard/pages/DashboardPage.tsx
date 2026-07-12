import { useDashboardData } from '../hooks';
import { OverallScoreCard } from '../components/OverallScoreCard';
import { PillarGauges } from '../components/PillarGauges';
import { EsgTrendCard } from '../components/EsgTrendCard';
import { DepartmentRankingCard } from '../components/DepartmentRankingCard';
import { ParticipationTeaser } from '../components/ParticipationTeaser';
import { LeaderboardTeaser } from '../components/LeaderboardTeaser';
import { AiInsightBanner } from '../components/AiInsightBanner';

export function DashboardPage() {
  const { orgScore, trend, isLoading, isError } = useDashboardData();

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 animate-pulse">
        <div className="h-24 bg-slate-200 rounded-xl"></div>
        <div className="h-8 w-64 bg-slate-200 rounded"></div>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="col-span-1 h-64 bg-slate-200 rounded"></div>
          <div className="col-span-2 h-64 bg-slate-200 rounded"></div>
        </div>
        <div className="h-64 bg-slate-200 rounded"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6">
        <div className="bg-red-50 text-red-600 p-4 rounded-md border border-red-200">
          <h2 className="text-lg font-medium">Failed to load dashboard data</h2>
          <p>Please try refreshing the page.</p>
        </div>
      </div>
    );
  }

  const isEmpty = !orgScore || (orgScore.overall === 0 && orgScore.environmental === 0 && orgScore.social === 0 && orgScore.governance === 0);

  if (isEmpty) {
    return (
      <div className="p-6 h-full flex items-center justify-center min-h-[50vh]">
        <div className="text-center bg-slate-50 p-12 rounded-xl border border-slate-200 max-w-lg">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">No scores yet &mdash; seed the demo</h2>
          <p className="text-slate-600 mb-6">Your organization does not have any recorded ESG scores.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">Executive overview of ESG performance.</p>
      </header>

      <AiInsightBanner />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Headline row: Overall Score + Pillars */}
        <section className="col-span-1 xl:col-span-1">
          <OverallScoreCard score={orgScore.overall} trendData={trend} isLoading={isLoading} />
        </section>
        <section className="col-span-1 xl:col-span-2">
          <PillarGauges orgScore={orgScore} isLoading={isLoading} />
        </section>

        {/* Trend row */}
        <section className="col-span-1 xl:col-span-2">
          <EsgTrendCard />
        </section>

        {/* Ranking row */}
        <section className="col-span-1 xl:col-span-1">
          <DepartmentRankingCard />
        </section>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <section>
          <ParticipationTeaser />
        </section>
        <section>
          <LeaderboardTeaser />
        </section>
      </div>
    </div>
  );
}
