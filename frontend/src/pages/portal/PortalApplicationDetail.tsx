import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { portalApi } from '../../services/api';
import type { Application, ApplicationEvent } from '../../types';
import {
  ArrowLeftIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function PortalApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const [application, setApplication] = useState<Application | null>(null);
  const [events, setEvents] = useState<ApplicationEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [app, appEvents] = await Promise.all([
        portalApi.getApplication(id!),
        portalApi.getApplicationEvents(id!),
      ]);
      setApplication(app);
      setEvents(appEvents);
    } catch (error) {
      toast.error('Failed to load application');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (!application) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Application not found</p>
        <Link to="/portal/applications" className="text-blue-600 hover:underline mt-2 inline-block">
          ← Back to applications
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link
          to="/portal/applications"
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors mt-1"
        >
          <ArrowLeftIcon className="w-5 h-5 text-gray-500" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-display font-bold text-gray-900">
              {application.grant?.name || 'Unknown Grant'}
            </h1>
            <StageBadge stage={application.stage} />
          </div>
          <p className="text-gray-600 mt-1">{application.grant?.funder}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Progress */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Application Progress</h2>
            <StageProgress currentStage={application.stage} />
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Activity Timeline</h2>
            {events.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No activity recorded yet.</p>
            ) : (
              <div className="space-y-4">
                {events.map((event, index) => (
                  <div key={event.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 rounded-full bg-primary-500" />
                      {index < events.length - 1 && (
                        <div className="w-0.5 h-full bg-gray-200 my-1" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900 capitalize">
                          {event.event_type.replace('_', ' ')}
                        </span>
                        <span className="text-xs text-gray-400">
                          {format(new Date(event.created_at), 'MMM d, yyyy h:mm a')}
                        </span>
                      </div>
                      {event.from_stage && event.to_stage && (
                        <p className="text-sm text-gray-600 mt-1">
                          Status changed from <span className="font-medium">{event.from_stage}</span> to{' '}
                          <span className="font-medium">{event.to_stage}</span>
                        </p>
                      )}
                      {event.note && (
                        <p className="text-sm text-gray-600 mt-1 bg-gray-50 rounded-lg p-3">
                          {event.note}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Key Details */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Details</h2>
            <div className="space-y-4">
              {application.amount_requested && (
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <CurrencyDollarIcon className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Amount Requested</p>
                    <p className="font-semibold text-gray-900">
                      ${application.amount_requested.toLocaleString()}
                    </p>
                  </div>
                </div>
              )}

              {application.amount_awarded && (
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-50 rounded-lg">
                    <CurrencyDollarIcon className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Amount Awarded</p>
                    <p className="font-semibold text-emerald-600">
                      ${application.amount_awarded.toLocaleString()}
                    </p>
                  </div>
                </div>
              )}

              {application.internal_deadline_at && (
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-50 rounded-lg">
                    <CalendarIcon className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Internal Deadline</p>
                    <p className="font-semibold text-gray-900">
                      {format(new Date(application.internal_deadline_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
              )}

              {application.submitted_at && (
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary-50 rounded-lg">
                    <DocumentTextIcon className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Submitted</p>
                    <p className="font-semibold text-gray-900">
                      {format(new Date(application.submitted_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-50 rounded-lg">
                  <ClockIcon className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Last Updated</p>
                  <p className="font-semibold text-gray-900">
                    {format(new Date(application.updated_at), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Grant Info */}
          {application.grant && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Grant Information</h2>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-500">Funder</p>
                  <p className="font-medium text-gray-900">{application.grant.funder}</p>
                </div>
                {application.grant.amount_min && application.grant.amount_max && (
                  <div>
                    <p className="text-gray-500">Grant Range</p>
                    <p className="font-medium text-gray-900">
                      ${application.grant.amount_min.toLocaleString()} - ${application.grant.amount_max.toLocaleString()}
                    </p>
                  </div>
                )}
                {application.grant.deadline_at && (
                  <div>
                    <p className="text-gray-500">Grant Deadline</p>
                    <p className="font-medium text-gray-900">
                      {format(new Date(application.grant.deadline_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StageProgress({ currentStage }: { currentStage: string }) {
  const stages = [
    { key: 'draft', label: 'Draft' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'submitted', label: 'Submitted' },
    { key: 'awarded', label: 'Decision' },
  ];

  const currentIndex = stages.findIndex((s) => 
    s.key === currentStage || 
    (s.key === 'awarded' && ['awarded', 'declined'].includes(currentStage))
  );

  return (
    <div className="flex items-center justify-between">
      {stages.map((stage, index) => {
        const isComplete = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isDeclined = stage.key === 'awarded' && currentStage === 'declined';

        return (
          <div key={stage.key} className="flex-1 flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  isComplete
                    ? 'bg-primary-600 text-white'
                    : isCurrent
                    ? isDeclined
                      ? 'bg-red-600 text-white'
                      : 'bg-primary-600 text-white ring-4 ring-primary-100'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {isComplete ? '✓' : index + 1}
              </div>
              <p
                className={`text-xs mt-2 font-medium ${
                  isCurrent || isComplete ? 'text-gray-900' : 'text-gray-400'
                }`}
              >
                {isDeclined ? 'Declined' : stage.label}
              </p>
            </div>
            {index < stages.length - 1 && (
              <div
                className={`flex-1 h-1 mx-2 ${
                  index < currentIndex ? 'bg-primary-600' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        );
      })}
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
