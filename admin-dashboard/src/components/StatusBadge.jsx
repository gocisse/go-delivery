import { useLanguage } from '../contexts/LanguageContext';

const StatusBadge = ({ status, type = 'order' }) => {
  const { t } = useLanguage();
  
  const getStatusClass = (status) => {
    const statusClasses = {
      // Order statuses
      pending: 'status-pending',
      assigned: 'status-assigned',
      picked_up: 'status-picked_up',
      in_transit: 'status-in_transit',
      delivered: 'status-delivered',
      cancelled: 'status-cancelled',
      
      // Driver statuses
      active: 'status-active',
      inactive: 'status-inactive',
      busy: 'status-busy',
      offline: 'status-offline',
    };
    
    return statusClasses[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <span className={`status-badge ${getStatusClass(status)}`}>
      {t(status)}
    </span>
  );
};

export default StatusBadge;