import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { grantsApi } from '../services/api';
import { useLookupsStore } from '../stores/lookupsStore';
import type { Grant, GrantStatus } from '../types';
import { PlusIcon, MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import clsx from 'clsx';

export default function Grants() {
  const [grants, setGrants] = useState<Grant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const { provinces, causes, applicantTypes } = useLookupsStore();

  const statusFilter = searchParams.get('status') as GrantStatus | null;

  useEffect(() => {
    loadGrants();
  }, [searchParams]);

  const loadGrants = async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;
      const data = await grantsApi.getAll(params);
      setGrants(data);
    } catch (error) {
      console.error('Failed to load grants:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadGrants();
  };

  const setStatus = (status: GrantStatus | null) => {
    if (status) {
      searchParams.set('status', status);
    } else {
      searchParams.delete('status');
    }
    setSearchParams(searchParams);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Grants</h1>
          <p className="text-gray-600 mt-1">Manage grant opportunities</p>
        </div>
        <Link to="/grants/new" className="btn-primary">
          <PlusIcon className="w-5 h-5 mr-2" />
          Add Grant
        </Link>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search grants..."
                className="input pl-10"
              />
            </div>
          </form>

          {/* Status filter */}
          <div className="flex gap-2">
            {[
              { value: null, label: 'All' },
              { value: 'open', label: 'Open' },
              { value: 'closed', label: 'Closed' },
              { value: 'unknown', label: 'Unknown' },
            ].map((option) => (
              <button
                key={option.label}
                onClick={() => setStatus(option.value as GrantStatus | null)}
                className={clsx(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  statusFilter === option.value
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grants Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
          </div>
        ) : grants.length === 0 ? (
          <div className="text-center py-12">
            <DocumentIcon className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No grants found</h3>
            <p className="text-gray-500 mb-4">Get started by adding your first grant.</p>
            <Link to="/grants/new" className="btn-primary">
              <PlusIcon className="w-5 h-5 mr-2" />
              Add Grant
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                    Grant
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                    Funder
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                    Status
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                    Deadline
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                    Amount
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                    Provinces
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {grants.map((grant) => (
                  <tr key={grant.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <Link
                        to={`/grants/${grant.id}`}
                        className="text-sm font-medium text-gray-900 hover:text-primary-600"
                      >
                        {grant.name}
                      </Link>
                      {grant.causes.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {grant.causes.slice(0, 2).map((cause) => (
                            <span key={cause.id} className="text-xs text-gray-500">
                              {cause.name}
                              {grant.causes.indexOf(cause) < Math.min(1, grant.causes.length - 1) && ','}
                            </span>
                          ))}
                          {grant.causes.length > 2 && (
                            <span className="text-xs text-gray-400">+{grant.causes.length - 2}</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {grant.funder || '—'}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={grant.status} />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {grant.deadline_type === 'rolling' ? (
                        <span className="text-gray-400">Rolling</span>
                      ) : grant.deadline_at ? (
                        format(new Date(grant.deadline_at), 'MMM d, yyyy')
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {grant.amount_min || grant.amount_max ? (
                        <span>
                          {grant.amount_min && `$${Number(grant.amount_min).toLocaleString()}`}
                          {grant.amount_min && grant.amount_max && ' - '}
                          {grant.amount_max && `$${Number(grant.amount_max).toLocaleString()}`}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {grant.provinces.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {grant.provinces.slice(0, 3).map((p) => (
                            <span key={p.id} className="badge-gray text-xs">
                              {p.code}
                            </span>
                          ))}
                          {grant.provinces.length > 3 && (
                            <span className="badge-gray text-xs">+{grant.provinces.length - 3}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">National</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: GrantStatus }) {
  const styles: Record<GrantStatus, string> = {
    open: 'badge-success',
    closed: 'badge-danger',
    unknown: 'badge-gray',
  };

  return <span className={styles[status]}>{status}</span>;
}

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}
