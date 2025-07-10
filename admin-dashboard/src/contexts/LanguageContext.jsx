import { createContext, useContext, useState } from 'react';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

const translations = {
  en: {
    // Navigation
    dashboard: 'Dashboard',
    orders: 'Orders',
    drivers: 'Drivers',
    customers: 'Customers',
    logout: 'Logout',
    
    // Login
    login: 'Login',
    email: 'Email',
    password: 'Password',
    signIn: 'Sign In',
    invalidCredentials: 'Invalid credentials',
    
    // Dashboard
    totalOrders: 'Total Orders',
    pendingOrders: 'Pending Orders',
    activeDrivers: 'Active Drivers',
    totalCustomers: 'Total Customers',
    recentOrders: 'Recent Orders (24h)',
    
    // Orders
    orderId: 'Order ID',
    customer: 'Customer',
    driver: 'Driver',
    status: 'Status',
    priority: 'Priority',
    pickupAddress: 'Pickup Address',
    deliveryAddress: 'Delivery Address',
    createdAt: 'Created At',
    actions: 'Actions',
    
    // Drivers
    driverId: 'Driver ID',
    name: 'Name',
    phone: 'Phone',
    vehicleType: 'Vehicle Type',
    
    // Customers
    customerId: 'Customer ID',
    address: 'Address',
    
    // Status
    pending: 'Pending',
    assigned: 'Assigned',
    picked_up: 'Picked Up',
    in_transit: 'In Transit',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
    active: 'Active',
    inactive: 'Inactive',
    busy: 'Busy',
    offline: 'Offline',
    
    // Priority
    low: 'Low',
    normal: 'Normal',
    high: 'High',
    urgent: 'Urgent',
    
    // Common
    loading: 'Loading...',
    error: 'Error',
    noData: 'No data available',
    refresh: 'Refresh',
    search: 'Search...',
    
    // Currency
    currency: 'XOF'
  },
  fr: {
    // Navigation
    dashboard: 'Tableau de bord',
    orders: 'Commandes',
    drivers: 'Chauffeurs',
    customers: 'Clients',
    logout: 'Déconnexion',
    
    // Login
    login: 'Connexion',
    email: 'Email',
    password: 'Mot de passe',
    signIn: 'Se connecter',
    invalidCredentials: 'Identifiants invalides',
    
    // Dashboard
    totalOrders: 'Total Commandes',
    pendingOrders: 'Commandes en attente',
    activeDrivers: 'Chauffeurs actifs',
    totalCustomers: 'Total Clients',
    recentOrders: 'Commandes récentes (24h)',
    
    // Orders
    orderId: 'ID Commande',
    customer: 'Client',
    driver: 'Chauffeur',
    status: 'Statut',
    priority: 'Priorité',
    pickupAddress: 'Adresse de collecte',
    deliveryAddress: 'Adresse de livraison',
    createdAt: 'Créé le',
    actions: 'Actions',
    
    // Drivers
    driverId: 'ID Chauffeur',
    name: 'Nom',
    phone: 'Téléphone',
    vehicleType: 'Type de véhicule',
    
    // Customers
    customerId: 'ID Client',
    address: 'Adresse',
    
    // Status
    pending: 'En attente',
    assigned: 'Assigné',
    picked_up: 'Collecté',
    in_transit: 'En transit',
    delivered: 'Livré',
    cancelled: 'Annulé',
    active: 'Actif',
    inactive: 'Inactif',
    busy: 'Occupé',
    offline: 'Hors ligne',
    
    // Priority
    low: 'Faible',
    normal: 'Normal',
    high: 'Élevé',
    urgent: 'Urgent',
    
    // Common
    loading: 'Chargement...',
    error: 'Erreur',
    noData: 'Aucune donnée disponible',
    refresh: 'Actualiser',
    search: 'Rechercher...',
    
    // Currency
    currency: 'XOF'
  }
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('en');

  const t = (key) => {
    return translations[language][key] || key;
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'fr' : 'en');
  };

  const value = {
    language,
    setLanguage,
    t,
    toggleLanguage
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};