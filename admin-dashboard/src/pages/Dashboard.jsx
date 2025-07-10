import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { apiService } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  ClipboardDocumentListIcon,
  ClockIcon,
  TruckIcon,
  UserGroupIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { t } = useLanguage();

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await apiService.getDashboardStats();
      setStats(response.data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch dashboard stats:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner size="lg" text={t('loading')} />;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{t('error')}: {error}</p>
        <button
          onClick={fetchDashboardStats}
          className="btn-primary"
        >
          {t('refresh')}
        </button>
      </div>
    );
  }

  const statCards = [
    {
      name: t('totalOrders'),
      value: stats?.statistics?.total_orders || 0,
      icon: ClipboardDocumentListIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      name: t('pendingOrders'),
      value: stats?.statistics?.pending_orders || 0,
      icon: ClockIcon,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100'
    },
    {
      name: t('activeDrivers'),
      value: stats?.statistics?.active_drivers || 0,
      icon: TruckIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      name: t('totalCustomers'),
      value: stats?.statistics?.total_customers || 0,
      icon: UserGroupIcon,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      name: t('recentOrders'),
      value: stats?.statistics?.recent_orders_24h || 0,
      icon: CalendarDaysIcon,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">{t('dashboard')}</h1>
        <button
          onClick={fetchDashboardStats}
          className="btn-secondary"
        >
          {t('refresh')}
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {statCards.map((stat) => (
          <div key={stat.name} className="card">
            <div className="flex items-center">
              <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value.toLocaleString()}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Orders by Status */}
      {stats?.orders_by_status && (
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Orders by Status</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Object.entries(stats.orders_by_status).map(([status, count]) => (
              <div key={status} className="text-center">
                <p className="text-2xl font-bold text-gray-900">{count}</p>
                <p className="text-sm text-gray-600 capitalize">{t(status)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Last Updated */}
      {stats?.generated_at && (
        <div className="text-center text-sm text-gray-500">
          Last updated: {new Date(stats.generated_at).toLocaleString()}
        </div>
      )}
    </div>
  );
};

export default Dashboard;