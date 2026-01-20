import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { applicationsApi } from '../services/api';
import type { Application, ApplicationStage, ApplicationEvent } from '../types';
import {
  ArrowLeftIcon,
  TrashIcon,
  PlusIcon,
  ClockIcon,
  CurrencyDollarIcon,
  UserIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const STAGES: ApplicationStage[] = [
  'draft',
  'in_progress',
  'submitted',
  'awarded',
  'declined',
  'reporting',
  'closed',
];

export default function ApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [application, setApplication] = useState<Application | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteText, setNoteText] = useState('');

  useEffect(() => {
    if (id) loadApplication();
  }, [id]);

  const loadApplication = async () => {
    try {
      const data = await applicationsApi.getById(id!);
      setApplication(data);
    } catch (error) {
      toast.error('Failed to load application');
      navigate('/applications');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStageChange = async (newStage: ApplicationStage) => {
    if (!application || isUpdating) return;
    setIsUpdating(true);
    try {
      const updated = await applicationsApi.update(application.id, { stage: newStage });
      setApplication(updated);
      toast.success(`Stage updated to ${newStage.replace('_', ' ')}`);
    } catch (error) {
      toast.error('Failed to update stage');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!application || !noteText.trim()) return;
    try {
      await applicationsApi.addEvent(application.id, {
        event_type: 'note',
        note: noteText,
      });
      toast.success('Note added');
      setNoteText('');
      setShowNoteForm(false);
      loadApplication(); // Refresh to get updated events
    } catch (error) {
      toast.error('Failed to add note');
    }
  };

  const handleDelete = async () => {
    if (!application || !confirm('Are you sure you want to delete this application?')) return;
    try {
      await applicationsApi.delete(application.id);
      toast.success('Application deleted');
      navigate('/applications');
    } catch (error) {
      toast.error('Failed to delete application');
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
    return <div>Application not found</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Link
            to="/applications"
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors mt-1"
          >
            <ArrowLeftIcon className="w-5 h-5 text-gray-500" />
          </Link>
          <div>
            <h1 className="text-2xl font-display font-bold text-gray-900">
              {application.grant?.name || 'Unknown Grant'}
            </h1>
            <p className="text-gray-600 mt-1">
              <Link
                to={`/clients/${application.client_id}`}
                className="hover:text-primary-600"
              >
                {application.client?.name || 'Unknown Client'}
              </Link>
            </p>
          </div>
        </div>
        <button onClick={handleDelete} className="btn-danger">
          <TrashIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Stage Selector */}
      <div className="card p-6">
        <h2 className="text-sm font-medium text-gray-700 mb-4">Current Stage</h2>
        <div className="flex flex-wrap gap-2">
          {STAGES.map((stage) => (
            <button
              key={stage}
              onClick={() => handleStageChange(stage)}
              disabled={isUpdating}
              className={clsx(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                application.stage === stage
                  ? getStageButtonStyle(stage)
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {stage.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Timeline */}
          <div className="card">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Timeline</h2>
              <button
                onClick={() => setShowNoteForm(!showNoteForm)}
                className="btn-secondary text-sm"
              >
                <PlusIcon className="w-4 h-4 mr-1" />
                Add Note
              </button>
            </div>

            {showNoteForm && (
              <form onSubmit={handleAddNote} className="p-4 border-b border-gray-100 bg-gray-50">
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  className="input min-h-[80px] mb-3"
                  placeholder="Add a note..."
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowNoteForm(false)}
                    className="btn-secondary text-sm"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary text-sm">
                    Save Note
                  </button>
                </div>
              </form>
            )}

            <div className="divide-y divide-gray-100">
              {application.events.length === 0 ? (
                <div className="p-6 text-center text-gray-500">No events yet</div>
              ) : (
                application.events.map((event) => (
                  <TimelineEvent key={event.id} event={event} />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Details */}
          <div className="card">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Details</h2>
            </div>
            <div className="p-6 space-y-4">
              {application.internal_deadline_at && (
                <div className="flex items-start gap-3">
                  <ClockIcon className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Internal Deadline</p>
                    <p className="text-gray-600">
                      {format(new Date(application.internal_deadline_at), 'MMMM d, yyyy')}
                    </p>
                  </div>
                </div>
              )}

              {application.amount_requested && (
                <div className="flex items-start gap-3">
                  <CurrencyDollarIcon className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Amount Requested</p>
                    <p className="text-gray-600">
                      ${Number(application.amount_requested).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}

              {application.amount_awarded && (
                <div className="flex items-start gap-3">
                  <CurrencyDollarIcon className="w-5 h-5 text-secondary-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Amount Awarded</p>
                    <p className="text-secondary-600 font-medium">
                      ${Number(application.amount_awarded).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}

              {application.submitted_at && (
                <div className="flex items-start gap-3">
                  <DocumentTextIcon className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Submitted</p>
                    <p className="text-gray-600">
                      {format(new Date(application.submitted_at), 'MMMM d, yyyy')}
                    </p>
                  </div>
                </div>
              )}

              {application.decision_at && (
                <div className="flex items-start gap-3">
                  <DocumentTextIcon className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Decision Date</p>
                    <p className="text-gray-600">
                      {format(new Date(application.decision_at), 'MMMM d, yyyy')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Links */}
          <div className="card p-6 space-y-3">
            <Link
              to={`/grants/${application.grant_id}`}
              className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700"
            >
              <DocumentTextIcon className="w-4 h-4" />
              View Grant Details
            </Link>
            <Link
              to={`/clients/${application.client_id}`}
              className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700"
            >
              <UserIcon className="w-4 h-4" />
              View Client Profile
            </Link>
          </div>

          {/* Timestamps */}
          <div className="card p-6">
            <div className="text-sm text-gray-500 space-y-2">
              <p>Created: {format(new Date(application.created_at), 'MMM d, yyyy')}</p>
              <p>Updated: {format(new Date(application.updated_at), 'MMM d, yyyy')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TimelineEvent({ event }: { event: ApplicationEvent }) {
  const getEventIcon = () => {
    switch (event.event_type) {
      case 'status_change':
        return '🔄';
      case 'note':
        return '📝';
      case 'doc_request':
        return '📄';
      case 'submission':
        return '📤';
      case 'decision':
        return '⚖️';
      default:
        return '•';
    }
  };

  const getEventDescription = () => {
    if (event.event_type === 'status_change') {
      return `Status changed from "${event.from_stage || 'none'}" to "${event.to_stage}"`;
    }
    return event.note || event.event_type.replace('_', ' ');
  };

  return (
    <div className="p-4 hover:bg-gray-50">
      <div className="flex gap-3">
        <span className="text-lg">{getEventIcon()}</span>
        <div className="flex-1">
          <p className="text-sm text-gray-900">{getEventDescription()}</p>
          <p className="text-xs text-gray-500 mt-1">
            {format(new Date(event.created_at), 'MMM d, yyyy h:mm a')}
          </p>
        </div>
      </div>
    </div>
  );
}

function getStageButtonStyle(stage: ApplicationStage): string {
  const styles: Record<ApplicationStage, string> = {
    draft: 'bg-gray-200 text-gray-800 ring-2 ring-gray-400',
    in_progress: 'bg-blue-100 text-blue-800 ring-2 ring-blue-400',
    submitted: 'bg-amber-100 text-amber-800 ring-2 ring-amber-400',
    awarded: 'bg-green-100 text-green-800 ring-2 ring-green-400',
    declined: 'bg-red-100 text-red-800 ring-2 ring-red-400',
    reporting: 'bg-purple-100 text-purple-800 ring-2 ring-purple-400',
    closed: 'bg-gray-200 text-gray-800 ring-2 ring-gray-400',
  };
  return styles[stage];
}
