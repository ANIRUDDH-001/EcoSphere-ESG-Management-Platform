import { useDashboardData } from '../hooks';

export function DashboardPage() {
  const { orgScore, deptScores, trend, isLoading, isError } = useDashboardData();

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 animate-pulse">
        <div className="h-8 w-64 bg-slate-200 rounded"></div>
        <div className="h-32 bg-slate-200 rounded"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-32 bg-slate-200 rounded"></div>
          <div className="h-32 bg-slate-200 rounded"></div>
          <div className="h-32 bg-slate-200 rounded"></div>
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
    <div className="p-6 space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">Executive overview of ESG performance.</p>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Headline score row */}
        <section className="col-span-1 xl:col-span-3">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-xl font-semibold mb-4">Overall Organization Score</h2>
            <div className="text-4xl font-bold text-slate-800">{orgScore.overall}</div>
          </div>
        </section>

        {/* Pillar scores */}
        <section className="col-span-1 xl:col-span-3">
          <h2 className="text-xl font-semibold mb-4">Pillars</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="text-slate-500 font-medium mb-2">Environmental</h3>
              <div className="text-3xl font-bold">{orgScore.environmental}</div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="text-slate-500 font-medium mb-2">Social</h3>
              <div className="text-3xl font-bold">{orgScore.social}</div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="text-slate-500 font-medium mb-2">Governance</h3>
              <div className="text-3xl font-bold">{orgScore.governance}</div>
            </div>
          </div>
        </section>

        {/* Trend row */}
        <section className="col-span-1 xl:col-span-2">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-80 flex flex-col">
            <h2 className="text-xl font-semibold mb-4">Score Trend</h2>
            <div className="flex-1 bg-slate-50 border border-slate-100 rounded flex items-center justify-center text-slate-400">
              [Trend Chart Placeholder: {trend.length} points]
            </div>
          </div>
        </section>

        {/* Ranking row */}
        <section className="col-span-1 xl:col-span-1">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-80 flex flex-col">
            <h2 className="text-xl font-semibold mb-4">Department Ranking</h2>
            <div className="flex-1 bg-slate-50 border border-slate-100 rounded overflow-y-auto p-4 space-y-3">
              {deptScores.length === 0 ? (
                <div className="text-slate-400 text-center mt-8">No department data.</div>
              ) : (
                deptScores.map((dept, index) => (
                  <div key={index} className="flex justify-between items-center bg-white p-3 rounded border border-slate-100">
                    <span className="font-medium text-slate-700">{dept.department_id || `Dept ${index + 1}`}</span>
                    <span className="font-bold text-indigo-600">{dept.total_score || 0}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
