import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { portalApi } from '../../services/api';
import type { Application, Client, PortalStats, SavedGrant, ManagedServiceRequest } from '../../types';
import {
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  BookmarkIcon,
  SparklesIcon,
  CalendarIcon,
  ArrowRightIcon,
  LockClosedIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function PortalDashboard() {
  const [clientInfo, setClientInfo] = useState<Client | null>(null);
  const [stats, setStats] = useState<PortalStats | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [savedGrants, setSavedGrants] = useState<SavedGrant[]>([]);
  const [expertRequests, setExpertRequests] = useState<ManagedServiceRequest[]>([]);
  const [expertMessage, setExpertMessage] = useState('');
  const [expertPhone, setExpertPhone] = useState('');
  const [expertSubmitting, setExpertSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [client, statsData] = await Promise.all([
        portalApi.getMyClient(),
        portalApi.getStats(),
      ]);
      setClientInfo(client);
      setStats(statsData);
      
      // Load additional data based on client type
      if (client.client_type === 'self_service') {
        const [saved, requests] = await Promise.all([
          portalApi.getSavedGrants(),
          portalApi.getMyManagedServiceRequests().catch(() => []),
        ]);
        setSavedGrants(saved.slice(0, 5));
        setExpertRequests(requests);
      } else {
        const apps = await portalApi.getMyApplications();
        setApplications(apps);
      }
    } catch (error) {
      toast.error('Failed to load portal data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExpertHelpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expertMessage.trim()) {
      toast.error('Please describe how we can help.');
      return;
    }
    setExpertSubmitting(true);
    try {
      await portalApi.requestManagedService({
        message: expertMessage.trim(),
        contact_phone: expertPhone.trim() || undefined,
      });
      toast.success("Request sent! We'll be in touch soon.");
      setExpertMessage('');
      setExpertPhone('');
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to send request');
    } finally {
      setExpertSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  const isSelfService = clientInfo?.client_type === 'self_service';

  // Self-service dashboard
  if (isSelfService && stats?.client_type === 'self_service') {
    return (
      <div className="space-y-8">
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl p-8 text-white">
          <h1 className="text-2xl font-display font-bold">
            Welcome, {clientInfo?.name || 'there'}!
          </h1>
          <p className="mt-2 text-primary-100">
            Discover grants that match your organization and save them for later.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Saved Grants"
            value={stats.saved_grants}
            icon={BookmarkIcon}
            color="primary"
          />
          <StatCard
            title="Matching Grants"
            value={stats.matching_grants}
            icon={SparklesIcon}
            color="purple"
          />
          <StatCard
            title="New This Week"
            value={stats.new_this_week}
            icon={CalendarIcon}
            color="green"
          />
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${stats.has_access ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-600'}`}>
                {stats.has_access ? <CheckCircleIcon className="w-6 h-6" /> : <LockClosedIcon className="w-6 h-6" />}
              </div>
              <div>
                <p className="text-sm text-gray-500">Subscription</p>
                <p className="text-lg font-bold text-gray-900">{stats.has_access ? 'Active' : 'Inactive'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Find Matches */}
          <Link
            to="/portal/grants"
            className="bg-white rounded-xl border border-gray-200 p-6 hover:border-primary-300 hover:shadow-md transition-all group"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-purple-50 rounded-xl">
                <SparklesIcon className="w-6 h-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 group-hover:text-primary-600">
                  Find Matching Grants
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Discover grants that match your organization's profile.
                </p>
              </div>
              <ArrowRightIcon className="w-5 h-5 text-gray-400 group-hover:text-primary-600" />
            </div>
          </Link>

          {/* Update Profile */}
          <Link
            to="/portal/profile"
            className="bg-white rounded-xl border border-gray-200 p-6 hover:border-primary-300 hover:shadow-md transition-all group"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary-50 rounded-xl">
                <DocumentTextIcon className="w-6 h-6 text-primary-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 group-hover:text-primary-600">
                  Update Your Profile
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Improve your matches by updating your eligibility criteria.
                </p>
              </div>
              <ArrowRightIcon className="w-5 h-5 text-gray-400 group-hover:text-primary-600" />
            </div>
          </Link>
        </div>

        {/* Get Expert Help */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center gap-3">
            <div className="p-2 bg-secondary-50 rounded-lg">
              <ChatBubbleLeftRightIcon className="w-5 h-5 text-secondary-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Get Expert Help</h2>
              <p className="text-sm text-gray-500">Want us to find and manage applications for you? Tell us what you need.</p>
            </div>
          </div>
          <div className="p-6">
            <form onSubmit={handleExpertHelpSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">How can we help? *</label>
                <textarea
                  value={expertMessage}
                  onChange={(e) => setExpertMessage(e.target.value)}
                  className="input min-h-[100px]"
                  placeholder="e.g. We need help identifying grants for our youth program and would like someone to prepare applications."
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
                <input
                  type="tel"
                  value={expertPhone}
                  onChange={(e) => setExpertPhone(e.target.value)}
                  className="input"
                  placeholder="(555) 000-0000"
                />
              </div>
              <button
                type="submit"
                disabled={expertSubmitting}
                className="btn-primary"
              >
                {expertSubmitting ? 'Sending...' : 'Send Request'}
              </button>
            </form>
            {expertRequests.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-700 mb-2">Your requests</p>
                <ul className="space-y-2">
                  {expertRequests.slice(0, 3).map((r) => (
                    <li key={r.id} className="text-sm text-gray-600 flex items-start gap-2">
                      <span className="capitalize px-2 py-0.5 rounded bg-gray-100">{r.status}</span>
                      <span className="flex-1 line-clamp-2">{r.message}</span>
                      <span className="text-gray-400">{format(new Date(r.created_at), 'MMM d')}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Recent Saved Grants */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Recently Saved</h2>
              <Link
                to="/portal/saved"
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                View all →
              </Link>
            </div>
          </div>
          {savedGrants.length === 0 ? (
            <div className="p-12 text-center">
              <BookmarkIcon className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No saved grants yet</h3>
              <p className="text-gray-500 mb-6">
                Start browsing the grant database and save grants you're interested in.
              </p>
              <Link
                to="/portal/grants"
                className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700"
              >
                Browse Grants
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {savedGrants.map((saved) => (
                <Link
                  key={saved.id}
                  to={`/portal/grants/${saved.grant_id}`}
                  className="block p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {saved.grant?.name || 'Unknown Grant'}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Saved {format(new Date(saved.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <BookmarkIcon className="w-5 h-5 text-primary-500" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Managed client dashboard (original)
  const managedStats = stats as { client_type: 'managed'; total_applications: number; active: number; pending_decision: number; completed: number } | null;

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl p-8 text-white">
        <h1 className="text-2xl font-display font-bold">
          Welcome, {clientInfo?.name || 'Client'}
        </h1>
        <p className="mt-2 text-primary-100">
          Track your grant applications and stay updated on their progress.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Applications"
          value={managedStats?.total_applications || applications.length}
          icon={DocumentTextIcon}
          color="blue"
        />
        <StatCard
          title="Active"
          value={managedStats?.active || 0}
          icon={ClockIcon}
          color="amber"
        />
        <StatCard
          title="Pending Decision"
          value={managedStats?.pending_decision || 0}
          icon={ExclamationCircleIcon}
          color="purple"
        />
        <StatCard
          title="Completed"
          value={managedStats?.completed || 0}
          icon={CheckCircleIcon}
          color="green"
        />
      </div>

      {/* Recent Applications */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent Applications</h2>
            <Link
              to="/portal/applications"
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              View all →
            </Link>
          </div>
        </div>
        {applications.length === 0 ? (
          <div className="p-12 text-center">
            <DocumentTextIcon className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No applications yet</h3>
            <p className="text-gray-500">
              Your grant applications will appear here once our team starts working on them.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {applications.slice(0, 5).map((app) => (
              <Link
                key={app.id}
                to={`/portal/applications/${app.id}`}
                className="block p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {app.grant?.name || 'Unknown Grant'}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Updated {format(new Date(app.updated_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <StageBadge stage={app.stage} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: 'primary' | 'blue' | 'amber' | 'purple' | 'green';
}) {
  const colors = {
    primary: 'bg-primary-50 text-primary-600',
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    purple: 'bg-purple-50 text-purple-600',
    green: 'bg-green-50 text-green-600',
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-lg ${colors[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500">{title}</p>
        </div>
      </div>
    </div>
  );
}

function StageBadge({ stage }: { stage: string }) {
  const styles: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    in_progress: 'bg-primary-100 text-primary-700',
    submitted: 'bg-amber-100 text-amber-700',
    awarded: 'bg-green-100 text-green-700',
    declined: 'bg-red-100 text-red-700',
    reporting: 'bg-purple-100 text-purple-700',
    closed: 'bg-gray-100 text-gray-700',
  };

  const labels: Record<string, string> = {
    draft: 'Draft',
    in_progress: 'In Progress',
    submitted: 'Submitted',
    awarded: 'Awarded',
    declined: 'Declined',
    reporting: 'Reporting',
    closed: 'Closed',
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[stage] || 'bg-gray-100 text-gray-700'}`}>
      {labels[stage] || stage}
    </span>
  );
}
