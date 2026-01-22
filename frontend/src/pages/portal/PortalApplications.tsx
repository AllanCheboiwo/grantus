import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { portalApi } from '../../services/api';
import type { Application } from '../../types';
import { DocumentTextIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function PortalApplications() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      const apps = await portalApi.getMyApplications();
      setApplications(apps);
    } catch (error) {
      toast.error('Failed to load applications');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredApps = applications.filter((app) => {
    if (filter === 'all') return true;
    if (filter === 'active') return ['draft', 'in_progress', 'submitted', 'reporting'].includes(app.stage);
    if (filter === 'completed') return ['awarded', 'declined', 'closed'].includes(app.stage);
    return app.stage === filter;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">My Applications</h1>
        <p className="text-gray-600 mt-1">Track the status of all your grant applications</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {[
          { value: 'all', label: 'All' },
          { value: 'active', label: 'Active' },
          { value: 'submitted', label: 'Submitted' },
          { value: 'awarded', label: 'Awarded' },
          { value: 'completed', label: 'Completed' },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f.value
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Applications List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {filteredApps.length === 0 ? (
          <div className="p-12 text-center">
            <DocumentTextIcon className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No applications found</h3>
            <p className="text-gray-500">
              {filter === 'all'
                ? 'Your grant applications will appear here.'
                : 'No applications match this filter.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredApps.map((app) => (
              <Link
                key={app.id}
                to={`/portal/applications/${app.id}`}
                className="block p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {app.grant?.name || 'Unknown Grant'}
                      </h3>
                      <StageBadge stage={app.stage} />
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {app.grant?.funder || 'Unknown Funder'}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                      <span>Created: {format(new Date(app.created_at), 'MMM d, yyyy')}</span>
                      <span>Updated: {format(new Date(app.updated_at), 'MMM d, yyyy')}</span>
                      {app.amount_requested && (
                        <span>Requested: ${app.amount_requested.toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-blue-600 font-medium">
                    View details →
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
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
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[stage] || 'bg-gray-100 text-gray-700'}`}>
      {labels[stage] || stage}
    </span>
  );
}
