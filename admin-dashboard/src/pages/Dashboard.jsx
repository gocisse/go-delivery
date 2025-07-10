import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { apiService } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  ClipboardDocumentListIcon,
  ClockIcon,
  TruckIcon,
  UserGroupIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const [authStatus, setAuthStatus] = useState('checking');
  const { t } = useLanguage();

  useEffect(() => {
    checkConnectionAndAuth();
  }, []);

  const checkConnectionAndAuth = async () => {
    try {
      setConnectionStatus('checking');
      setAuthStatus('checking');
      
      console.log('Checking backend connection and auth...');
      
      // First check if backend is reachable
      await apiService.healthCheck();
      setConnectionStatus('connected');
      console.log('Backend connection successful');
      
      // Then test authenticated endpoint
      try {
        await apiService.getDashboardStats();
        setAuthStatus('authenticated');
        console.log('Authentication successful');
        fetchDashboardStats();
      } catch (authError) {
        console.error('Authentication failed:', authError);
        setAuthStatus('failed');
        setError(`Authentication failed: ${authError.response?.status} ${authError.response?.statusText}`);
        setLoading(false);
      }
    } catch (connError) {
      console.error('Connection check failed:', connError);
      setConnectionStatus('disconnected');
      setAuthStatus('unknown');
      setError('Cannot connect to backend server at http://144.21.63.195:3001');
      setLoading(false);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      console.log('Fetching dashboard stats...');
      
      const response = await apiService.getDashboardStats();
      console.log('Dashboard stats response:', response.data);
      
      setStats(response.data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch dashboard stats:', err);
      setError(`API Error: ${err.response?.status} - ${err.response?.data?.message || err.message}`);
      
      // Set default stats if API fails
      setStats({
        statistics: {
          total_orders: 0,
          pending_orders: 0,
          active_drivers: 0,
          total_customers: 0,
          recent_orders_24h: 0
        },
        orders_by_status: {},
        generated_at: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  if (connectionStatus === 'checking' || authStatus === 'checking') {
    return <LoadingSpinner size="lg" text="Connecting to backend and verifying authentication..." />;
  }

  if (connectionStatus === 'disconnected') {
    return (
      <div className="text-center py-12">
        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Backend Connection Failed</h3>
        <p className="text-gray-600 mb-4">Cannot connect to http://144.21.63.195:3001</p>
        <button
          onClick={checkConnectionAndAuth}
          className="btn-primary"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  if (authStatus === 'failed') {
    return (
      <div className="text-center py-12">
        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Authentication Failed</h3>
        <p className="text-gray-600 mb-4">
          Backend is reachable but authentication failed. This might be due to:
        </p>
        <ul className="text-sm text-gray-600 mb-4 text-left max-w-md mx-auto">
          <li>• Missing or invalid Authorization header</li>
          <li>• Backend authentication middleware issues</li>
          <li>• CORS configuration problems</li>
        </ul>
        <div className="space-x-4">
          <button
            onClick={checkConnectionAndAuth}
            className="btn-primary"
          >
            Retry Authentication
          </button>
          <button
            onClick={() => window.location.href = '/admin/login'}
            className="btn-secondary"
          >
            Re-login
          </button>
        </div>
      </div>
    );
  }

  if (loading && !stats) {
    return <LoadingSpinner size="lg" text={t('loading')} />;
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
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <CheckCircleIcon className="w-4 h-4 text-green-500" />
            <span className="text-sm text-gray-600">Connected & Authenticated</span>
          </div>
          <button
            onClick={fetchDashboardStats}
            className="btn-secondary"
            disabled={loading}
          >
            {t('refresh')}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            <ExclamationTriangleIcon className="inline h-4 w-4 mr-1" />
            {t('error')}: {error}
          </p>
          <p className="text-sm text-yellow-700 mt-1">
            Showing default values. Check backend logs for details.
          </p>
        </div>
      )}

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
      {stats?.orders_by_status && Object.keys(stats.orders_by_status).length > 0 && (
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

      {/* Debug Info */}
      <div className="card bg-gray-50">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Debug Information</h3>
        <div className="text-xs text-gray-600 space-y-1">
          <p>Backend URL: http://144.21.63.195:3001</p>
          <p>Connection Status: {connectionStatus}</p>
          <p>Auth Status: {authStatus}</p>
          <p>Token Present: {!!localStorage.getItem('token')}</p>
          {stats?.generated_at && (
            <p>Last updated: {new Date(stats.generated_at).toLocaleString()}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;