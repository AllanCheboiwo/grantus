import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { portalApi } from '../../services/api';
import type { Application, Client } from '../../types';
import {
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function PortalDashboard() {
  const [clientInfo, setClientInfo] = useState<Client | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [client, apps] = await Promise.all([
        portalApi.getMyClient(),
        portalApi.getMyApplications(),
      ]);
      setClientInfo(client);
      setApplications(apps);
    } catch (error) {
      toast.error('Failed to load portal data');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  const activeApps = applications.filter((a) => 
    ['draft', 'in_progress', 'submitted', 'reporting'].includes(a.stage)
  );
  const completedApps = applications.filter((a) => 
    ['awarded', 'declined', 'closed'].includes(a.stage)
  );
  const pendingApps = applications.filter((a) => a.stage === 'submitted');

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-white">
        <h1 className="text-2xl font-display font-bold">
          Welcome, {clientInfo?.name || 'Client'}
        </h1>
        <p className="mt-2 text-blue-100">
          Track your grant applications and stay updated on their progress.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Applications"
          value={applications.length}
          icon={DocumentTextIcon}
          color="blue"
        />
        <StatCard
          title="Active"
          value={activeApps.length}
          icon={ClockIcon}
          color="amber"
        />
        <StatCard
          title="Pending Decision"
          value={pendingApps.length}
          icon={ExclamationCircleIcon}
          color="purple"
        />
        <StatCard
          title="Completed"
          value={completedApps.length}
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
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
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
  color: 'blue' | 'amber' | 'purple' | 'green';
}) {
  const colors = {
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
    in_progress: 'bg-blue-100 text-blue-700',
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
