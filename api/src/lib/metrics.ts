interface MetricsSnapshot {
  [metricName: string]: {
    [labelsKey: string]: number;
  };
}

const counters = new Map<string, Map<string, number>>();

function serializeLabels(labels: Record<string, string | number | boolean> = {}): string {
  const keys = Object.keys(labels).sort();
  if (keys.length === 0) return 'default';
  return keys.map((k) => `${k}=${labels[k]}`).join(',');
}

export const metrics = {
  inc(name: string, labels?: Record<string, string | number | boolean>) {
    const key = serializeLabels(labels);
    let metric = counters.get(name);
    if (!metric) {
      metric = new Map();
      counters.set(name, metric);
    }
    const current = metric.get(key) || 0;
    metric.set(key, current + 1);
  },

  snapshot(): MetricsSnapshot {
    const result: MetricsSnapshot = {};
    for (const [name, metricMap] of counters.entries()) {
      result[name] = {};
      for (const [labelsKey, count] of metricMap.entries()) {
        result[name][labelsKey] = count;
      }
    }
    return result;
  },

  reset() {
    counters.clear();
  },
};
