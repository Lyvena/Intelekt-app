import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  Users,
  Activity,
  TrendingUp,
  Clock,
  Zap,
  Code2,
  MessageSquare,
  RefreshCw,
  Download,
  Calendar,
  Bot,
  Target,
  Layers,
  Compass,
  Gauge,
} from 'lucide-react';
import { analyticsAPI } from '../../services/api';
import type {
  DashboardMetrics,
  RealtimeMetrics,
  FrameworkAnalytics,
  AIProviderAnalytics,
  ProductAnalytics,
} from '../../types';
import { MetricCard } from './MetricCard';
import { ActivityChart } from './ActivityChart';
import { AIProviderStats } from './AIProviderStats';
import { FrameworkMetrics } from './FrameworkMetrics';
import { TopFeatures } from './TopFeatures';
import { RealtimeIndicator } from './RealtimeIndicator';

interface AnalyticsDashboardProps {
  userId?: string;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ userId }) => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [realtimeMetrics, setRealtimeMetrics] = useState<RealtimeMetrics | null>(null);
  const [frameworkAnalytics, setFrameworkAnalytics] = useState<FrameworkAnalytics | null>(null);
  const [aiAnalytics, setAIAnalytics] = useState<AIProviderAnalytics | null>(null);
  const [productAnalytics, setProductAnalytics] = useState<ProductAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [dashboardRes, frameworkRes, aiRes, productRes] = await Promise.all([
        analyticsAPI.getDashboard(userId, days),
        analyticsAPI.getFrameworkAnalytics(days),
        analyticsAPI.getAIProviderAnalytics(days),
        analyticsAPI.getProductAnalytics(days),
      ]);

      if (dashboardRes.success) setMetrics(dashboardRes.data);
      if (frameworkRes.success) setFrameworkAnalytics(frameworkRes.data);
      if (aiRes.success) setAIAnalytics(aiRes.data);
      if (productRes.success) setProductAnalytics(productRes.data);
    } catch (err) {
      setError('Failed to load analytics data');
      console.error('Analytics error:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, days]);

  const fetchRealtime = useCallback(async () => {
    try {
      const res = await analyticsAPI.getRealtime();
      if (res.success) setRealtimeMetrics(res.data);
    } catch (err) {
      console.error('Realtime metrics error:', err);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  useEffect(() => {
    fetchRealtime();
    const interval = setInterval(fetchRealtime, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [fetchRealtime]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchAnalytics(), fetchRealtime()]);
    setRefreshing(false);
  };

  const handleExport = async () => {
    try {
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const data = await analyticsAPI.exportAnalytics(startDate, endDate);
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${startDate}-${endDate}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="text-red-500 text-lg mb-4">{error}</div>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const totalEvents = metrics?.events_by_category
    ? Object.values(metrics.events_by_category).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <div className="h-full overflow-auto bg-gray-900 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-indigo-400" />
            Analytics Dashboard
          </h1>
          <p className="text-gray-400 mt-1">Track your performance and user engagement</p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Time Period Selector */}
          <div className="flex items-center gap-2 bg-gray-800 rounded-lg p-1">
            {[7, 14, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  days === d
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
          
          {/* Actions */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          
          <button
            onClick={handleExport}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            title="Export Data"
          >
            <Download className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Realtime Indicator */}
      {realtimeMetrics && <RealtimeIndicator metrics={realtimeMetrics} />}

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Sessions"
          value={metrics?.total_sessions || 0}
          icon={Users}
          color="blue"
          trend={5.2}
        />
        <MetricCard
          title="Avg. Session Duration"
          value={`${metrics?.avg_session_duration_minutes?.toFixed(1) || 0} min`}
          icon={Clock}
          color="green"
          trend={2.8}
        />
        <MetricCard
          title="Total Events"
          value={totalEvents}
          icon={Activity}
          color="purple"
          trend={12.5}
        />
        <MetricCard
          title="Active Users"
          value={metrics?.daily_active_users?.[metrics.daily_active_users.length - 1]?.users || 0}
          icon={TrendingUp}
          color="orange"
          trend={8.3}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Daily Active Users Chart */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-400" />
            Daily Active Users
          </h3>
          {metrics?.daily_active_users && (
            <ActivityChart data={metrics.daily_active_users} />
          )}
        </div>

        {/* Event Categories */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            Events by Category
          </h3>
          <div className="space-y-3">
            {metrics?.events_by_category && Object.entries(metrics.events_by_category).map(([category, count]) => {
              const percentage = totalEvents > 0 ? (count / totalEvents) * 100 : 0;
              const colors: Record<string, string> = {
                user: 'bg-blue-500',
                project: 'bg-green-500',
                framework: 'bg-purple-500',
                chat: 'bg-orange-500',
                code_generation: 'bg-pink-500',
                export: 'bg-cyan-500',
                deployment: 'bg-yellow-500',
                github: 'bg-gray-500'
              };
              
              return (
                <div key={category}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-300 capitalize">{category.replace('_', ' ')}</span>
                    <span className="text-gray-400">{count.toLocaleString()} ({percentage.toFixed(1)}%)</span>
                  </div>
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${colors[category] || 'bg-indigo-500'} rounded-full transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* AI & Framework Stats Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* AI Provider Stats */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Bot className="w-5 h-5 text-indigo-400" />
            AI Provider Usage
          </h3>
          {aiAnalytics && <AIProviderStats analytics={aiAnalytics} />}
        </div>

        {/* Framework Metrics */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-400" />
            Framework Completion
          </h3>
          {frameworkAnalytics && <FrameworkMetrics analytics={frameworkAnalytics} />}
        </div>
      </div>

      {/* Product Engagement (framework + preview) */}
      {productAnalytics && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="bg-gradient-to-br from-indigo-900/60 via-gray-900 to-gray-900 rounded-xl p-6 border border-gray-700/60 shadow-lg shadow-indigo-900/30">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-indigo-300" />
                <h3 className="text-lg font-semibold text-white">Framework Readiness</h3>
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-indigo-500/20 text-indigo-200">
                {productAnalytics.window_days}d window
              </span>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Ready for Dev</span>
                <span className="text-white text-xl font-bold">{productAnalytics.framework.ready_count}</span>
              </div>
              <div>
                <div className="flex items-center justify-between text-sm text-gray-300 mb-1">
                  <span>Avg. time to ready</span>
                  <span className="text-white font-semibold">
                    {productAnalytics.framework.avg_time_to_ready_sec != null
                      ? `${Math.round(productAnalytics.framework.avg_time_to_ready_sec / 60)} min`
                      : '—'}
                  </span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500"
                    style={{
                      width: productAnalytics.framework.avg_time_to_ready_sec
                        ? `${Math.min(100, (productAnalytics.framework.avg_time_to_ready_sec / (60 * 60)) * 100)}%`
                        : '0%',
                    }}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Step completions</span>
                <span className="text-white font-semibold">{productAnalytics.framework.step_completions}</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-900/60 via-gray-900 to-gray-900 rounded-xl p-6 border border-gray-700/60 shadow-lg shadow-emerald-900/30">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Gauge className="w-5 h-5 text-emerald-300" />
                <h3 className="text-lg font-semibold text-white">Exports</h3>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">First exports</span>
                <span className="text-white text-xl font-bold">{productAnalytics.framework.first_export_count}</span>
              </div>
              <div>
                <div className="flex items-center justify-between text-sm text-gray-300 mb-1">
                  <span>Avg. time to first export</span>
                  <span className="text-white font-semibold">
                    {productAnalytics.framework.avg_time_to_first_export_sec != null
                      ? `${Math.round(productAnalytics.framework.avg_time_to_first_export_sec / 60)} min`
                      : '—'}
                  </span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500"
                    style={{
                      width: productAnalytics.framework.avg_time_to_first_export_sec
                        ? `${Math.min(100, (productAnalytics.framework.avg_time_to_first_export_sec / (60 * 60)) * 100)}%`
                        : '0%',
                    }}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Total exports</span>
                <span className="text-white font-semibold">{productAnalytics.framework.export_count}</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-900/50 via-gray-900 to-gray-900 rounded-xl p-6 border border-gray-700/60 shadow-lg shadow-amber-900/30">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-300" />
                <h3 className="text-lg font-semibold text-white">Preview Performance</h3>
              </div>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-white/5 rounded-lg py-2">
                  <div className="text-xs text-gray-300">Starts</div>
                  <div className="text-white font-semibold">{productAnalytics.preview.starts}</div>
                </div>
                <div className="bg-white/5 rounded-lg py-2">
                  <div className="text-xs text-gray-300">Success</div>
                  <div className="text-white font-semibold">{productAnalytics.preview.success}</div>
                </div>
                <div className="bg-white/5 rounded-lg py-2">
                  <div className="text-xs text-gray-300">Errors</div>
                  <div className="text-white font-semibold">{productAnalytics.preview.errors}</div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-sm text-gray-300 mb-1">
                  <span>Success rate</span>
                  <span className="text-white font-semibold">
                    {productAnalytics.preview.success_rate != null
                      ? `${Math.round(productAnalytics.preview.success_rate * 100)}%`
                      : '—'}
                  </span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500"
                    style={{
                      width: productAnalytics.preview.success_rate != null
                        ? `${Math.min(100, Math.round(productAnalytics.preview.success_rate * 100))}%`
                        : '0%',
                    }}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Avg. duration</span>
                <span className="text-white font-semibold">
                  {productAnalytics.preview.avg_duration_sec != null
                    ? `${Math.round(productAnalytics.preview.avg_duration_sec)}s`
                    : '—'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Additional Stats Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Features */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 lg:col-span-2">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-indigo-400" />
            Most Used Features
          </h3>
          {metrics?.top_features && <TopFeatures features={metrics.top_features} />}
        </div>

        {/* Quick Stats */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Code2 className="w-5 h-5 text-indigo-400" />
            Quick Stats
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-300">
                <MessageSquare className="w-4 h-4" />
                <span>Chat Messages</span>
              </div>
              <span className="text-white font-medium">
                {metrics?.events_by_category?.chat?.toLocaleString() || 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-300">
                <Code2 className="w-4 h-4" />
                <span>Code Generations</span>
              </div>
              <span className="text-white font-medium">
                {metrics?.events_by_category?.code_generation?.toLocaleString() || 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-300">
                <Layers className="w-4 h-4" />
                <span>Projects</span>
              </div>
              <span className="text-white font-medium">
                {metrics?.events_by_category?.project?.toLocaleString() || 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-300">
                <Target className="w-4 h-4" />
                <span>Framework Steps</span>
              </div>
              <span className="text-white font-medium">
                {metrics?.events_by_category?.framework?.toLocaleString() || 0}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
