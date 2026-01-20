import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { applicationsApi, grantsApi, clientsApi } from '../services/api';
import type { Application, Grant, Client } from '../types';
import {
  DocumentTextIcon,
  UserGroupIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';

export default function Dashboard() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [grants, setGrants] = useState<Grant[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [pipeline, setPipeline] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [apps, grantsList, clientsList, pipelineData] = await Promise.all([
        applicationsApi.getAll(),
        grantsApi.getAll(),
        clientsApi.getAll(),
        applicationsApi.getPipeline(),
      ]);
      setApplications(apps);
      setGrants(grantsList);
      setClients(clientsList);
      setPipeline(pipelineData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const stats = [
    {
      name: 'Total Grants',
      value: grants.length,
      icon: DocumentTextIcon,
      color: 'bg-accent-100 text-accent-600',
      href: '/grants',
    },
    {
      name: 'Active Clients',
      value: clients.length,
      icon: UserGroupIcon,
      color: 'bg-secondary-100 text-secondary-600',
      href: '/clients',
    },
    {
      name: 'Applications',
      value: applications.length,
      icon: ClipboardDocumentListIcon,
      color: 'bg-primary-100 text-primary-600',
      href: '/applications',
    },
    {
      name: 'Awarded',
      value: pipeline.awarded || 0,
      icon: CheckCircleIcon,
      color: 'bg-emerald-100 text-emerald-600',
      href: '/applications?stage=awarded',
    },
  ];

  // Get grants with upcoming deadlines
  const upcomingDeadlines = grants
    .filter((g) => g.deadline_at && g.status === 'open')
    .sort((a, b) => new Date(a.deadline_at!).getTime() - new Date(b.deadline_at!).getTime())
    .slice(0, 5);

  // Get recent applications
  const recentApplications = [...applications]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome back! Here's what's happening.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Link
            key={stat.name}
            to={stat.href}
            className="card p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-600">{stat.name}</p>
                <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline Overview */}
        <div className="card">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Application Pipeline</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {[
                { key: 'draft', label: 'Draft', color: 'bg-gray-400' },
                { key: 'in_progress', label: 'In Progress', color: 'bg-accent-500' },
                { key: 'submitted', label: 'Submitted', color: 'bg-amber-500' },
                { key: 'awarded', label: 'Awarded', color: 'bg-secondary-500' },
                { key: 'declined', label: 'Declined', color: 'bg-red-500' },
              ].map((stage) => {
                const count = pipeline[stage.key] || 0;
                const total = applications.length || 1;
                const percentage = (count / total) * 100;

                return (
                  <div key={stage.key}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{stage.label}</span>
                      <span className="font-medium text-gray-900">{count}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${stage.color} rounded-full transition-all duration-500`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Upcoming Deadlines */}
        <div className="card">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Upcoming Deadlines</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {upcomingDeadlines.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No upcoming deadlines
              </div>
            ) : (
              upcomingDeadlines.map((grant) => (
                <Link
                  key={grant.id}
                  to={`/grants/${grant.id}`}
                  className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <ClockIcon className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {grant.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {grant.funder || 'Unknown funder'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-amber-600">
                      {format(new Date(grant.deadline_at!), 'MMM d')}
                    </p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(grant.deadline_at!), 'yyyy')}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Applications */}
      <div className="card">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Recent Applications</h2>
          <Link to="/applications" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
            View all →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
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
                  Updated
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentApplications.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No applications yet
                  </td>
                </tr>
              ) : (
                recentApplications.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50">
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
