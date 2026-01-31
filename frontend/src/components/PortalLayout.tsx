import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { subscriptionApi, portalApi } from '../services/api';
import type { SubscriptionStatus, Client } from '../types';
import {
  HomeIcon,
  ClipboardDocumentListIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  BuildingLibraryIcon,
  CreditCardIcon,
  LockClosedIcon,
  SparklesIcon,
  BookmarkIcon,
  UserCircleIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

// Navigation items for managed clients (invited by staff)
const managedNavigation = [
  { name: 'Dashboard', href: '/portal', icon: HomeIcon },
  { name: 'Applications', href: '/portal/applications', icon: ClipboardDocumentListIcon },
  { name: 'Grant Database', href: '/portal/grants', icon: BuildingLibraryIcon, requiresSubscription: true },
  { name: 'Subscription', href: '/portal/subscription', icon: CreditCardIcon },
];

// Navigation items for self-service users (public signup)
const selfServiceNavigation = [
  { name: 'Dashboard', href: '/portal', icon: HomeIcon },
  { name: 'Grant Database', href: '/portal/grants', icon: BuildingLibraryIcon, requiresSubscription: true },
  { name: 'Saved Grants', href: '/portal/saved', icon: BookmarkIcon },
  { name: 'My Profile', href: '/portal/profile', icon: UserCircleIcon },
  { name: 'Subscription', href: '/portal/subscription', icon: CreditCardIcon },
];

export default function PortalLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [status, clientData] = await Promise.all([
        subscriptionApi.getStatus(),
        portalApi.getMyClient(),
      ]);
      setSubscriptionStatus(status);
      setClient(clientData);
    } catch (error) {
      // Silently fail
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const hasAccess = subscriptionStatus?.has_access;
  const isSelfService = client?.client_type === 'self_service';
  const navigation = isSelfService ? selfServiceNavigation : managedNavigation;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-900/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center h-16 px-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                <span className="text-white font-bold text-lg">G</span>
              </div>
              <div>
                <span className="font-display text-xl font-semibold text-gray-900">Grantus</span>
                <p className="text-xs text-primary-600 font-medium">Client Portal</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="ml-auto lg:hidden text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const needsSubscription = item.requiresSubscription && !hasAccess;
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  end={item.href === '/portal'}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    )
                  }
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="flex-1">{item.name}</span>
                  {needsSubscription && (
                    <LockClosedIcon className="w-4 h-4 text-gray-400" />
                  )}
                  {item.requiresSubscription && hasAccess && (
                    <SparklesIcon className="w-4 h-4 text-amber-500" />
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center">
                <span className="text-primary-700 font-medium text-sm">
                  {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'C'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.name || user?.email}
                </p>
                <p className="text-xs text-primary-600">Client Portal</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                title="Logout"
              >
                <ArrowRightOnRectangleIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-16 bg-white/80 backdrop-blur-sm border-b border-gray-200 flex items-center px-4 lg:px-8">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 -ml-2 text-gray-400 hover:text-gray-600"
          >
            <Bars3Icon className="w-6 h-6" />
          </button>
          <div className="ml-auto flex items-center gap-4">
            <span className="text-sm text-gray-500">
              Welcome back, <span className="font-medium text-gray-900">{user?.name || 'Client'}</span>
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
