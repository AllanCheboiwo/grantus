import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { applicationsApi } from '../services/api';
import type { Application, ApplicationStage } from '../types';
import { format } from 'date-fns';
import clsx from 'clsx';

const STAGES: { key: ApplicationStage; label: string; color: string }[] = [
  { key: 'draft', label: 'Draft', color: 'bg-gray-100 border-gray-300' },
  { key: 'in_progress', label: 'In Progress', color: 'bg-blue-50 border-blue-300' },
  { key: 'submitted', label: 'Submitted', color: 'bg-amber-50 border-amber-300' },
  { key: 'awarded', label: 'Awarded', color: 'bg-green-50 border-green-300' },
  { key: 'declined', label: 'Declined', color: 'bg-red-50 border-red-300' },
  { key: 'reporting', label: 'Reporting', color: 'bg-purple-50 border-purple-300' },
];

export default function Applications() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<'pipeline' | 'list'>('pipeline');

  const stageFilter = searchParams.get('stage') as ApplicationStage | null;

  useEffect(() => {
    loadApplications();
  }, [stageFilter]);

  const loadApplications = async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = {};
      if (stageFilter) params.stage = stageFilter;
      const data = await applicationsApi.getAll(params);
      setApplications(data);
    } catch (error) {
      console.error('Failed to load applications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const groupedApplications = STAGES.reduce((acc, stage) => {
    acc[stage.key] = applications.filter((app) => app.stage === stage.key);
    return acc;
  }, {} as Record<ApplicationStage, Application[]>);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Applications</h1>
          <p className="text-gray-600 mt-1">Track grant applications through the pipeline</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('pipeline')}
            className={clsx(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              viewMode === 'pipeline'
                ? 'bg-primary-100 text-primary-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            Pipeline
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={clsx(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              viewMode === 'list'
                ? 'bg-primary-100 text-primary-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            List
          </button>
        </div>
      </div>

      {viewMode === 'pipeline' ? (
        /* Pipeline View */
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {STAGES.map((stage) => (
              <div
                key={stage.key}
                className={clsx(
                  'w-72 rounded-xl border-2 flex-shrink-0',
                  stage.color
                )}
              >
                <div className="p-4 border-b border-inherit">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">{stage.label}</h3>
                    <span className="text-sm text-gray-500">
                      {groupedApplications[stage.key]?.length || 0}
                    </span>
                  </div>
                </div>
                <div className="p-3 space-y-3 min-h-[200px] max-h-[600px] overflow-y-auto">
                  {groupedApplications[stage.key]?.map((app) => (
                    <Link
                      key={app.id}
                      to={`/applications/${app.id}`}
                      className="block bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow border border-gray-100"
                    >
                      <h4 className="font-medium text-gray-900 text-sm line-clamp-2">
                        {app.grant?.name || 'Unknown Grant'}
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">
                        {app.client?.name || 'Unknown Client'}
                      </p>
                      {app.internal_deadline_at && (
                        <div className="mt-3 flex items-center gap-1 text-xs text-gray-400">
                          <span>Due:</span>
                          <span className="font-medium">
                            {format(new Date(app.internal_deadline_at), 'MMM d')}
                          </span>
                        </div>
                      )}
                    </Link>
                  ))}
                  {(!groupedApplications[stage.key] ||
                    groupedApplications[stage.key].length === 0) && (
                    <div className="text-center py-8 text-gray-400 text-sm">
                      No applications
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* List View */
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                    Grant
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                    Client
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                    Stage
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                    Deadline
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                    Amount
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                    Updated
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {applications.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      No applications found
                    </td>
                  </tr>
                ) : (
                  applications.map((app) => (
                    <tr key={app.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <Link
                          to={`/applications/${app.id}`}
                          className="text-sm font-medium text-gray-900 hover:text-primary-600"
                        >
                          {app.grant?.name || 'Unknown Grant'}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {app.client?.name || 'Unknown Client'}
                      </td>
                      <td className="px-6 py-4">
                        <StageBadge stage={app.stage} />
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {app.internal_deadline_at
                          ? format(new Date(app.internal_deadline_at), 'MMM d, yyyy')
                          : '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {app.amount_requested
                          ? `$${Number(app.amount_requested).toLocaleString()}`
                          : '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {format(new Date(app.updated_at), 'MMM d, yyyy')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StageBadge({ stage }: { stage: string }) {
  const styles: Record<string, string> = {
    draft: 'badge-gray',
    in_progress: 'badge-info',
    submitted: 'badge-warning',
    awarded: 'badge-success',
    declined: 'badge-danger',
    reporting: 'badge-info',
    closed: 'badge-gray',
  };

  return (
    <span className={styles[stage] || 'badge-gray'}>
      {stage.replace('_', ' ')}
    </span>
  );
}
