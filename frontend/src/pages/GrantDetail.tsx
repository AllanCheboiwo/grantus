import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { grantsApi } from '../services/api';
import type { Grant } from '../types';
import { 
  PencilIcon, 
  TrashIcon, 
  ArrowLeftIcon,
  LinkIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  MapPinIcon,
  CheckBadgeIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function GrantDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [grant, setGrant] = useState<Grant | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) loadGrant();
  }, [id]);

  const loadGrant = async () => {
    try {
      const data = await grantsApi.getById(id!);
      setGrant(data);
    } catch (error) {
      toast.error('Failed to load grant');
      navigate('/grants');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!grant) return;
    try {
      const updated = await grantsApi.verify(grant.id, 'open');
      setGrant(updated);
      toast.success('Grant verified');
    } catch (error) {
      toast.error('Failed to verify grant');
    }
  };

  const handleDelete = async () => {
    if (!grant || !confirm('Are you sure you want to delete this grant?')) return;
    try {
      await grantsApi.delete(grant.id);
      toast.success('Grant deleted');
      navigate('/grants');
    } catch (error) {
      toast.error('Failed to delete grant');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (!grant) {
    return <div>Grant not found</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Link
            to="/grants"
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors mt-1"
          >
            <ArrowLeftIcon className="w-5 h-5 text-gray-500" />
          </Link>
          <div>
            <h1 className="text-2xl font-display font-bold text-gray-900">{grant.name}</h1>
            {grant.funder && (
              <p className="text-gray-600 mt-1">{grant.funder}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleVerify} className="btn-secondary">
            <CheckBadgeIcon className="w-5 h-5 mr-2" />
            Verify
          </button>
          <Link to={`/grants/${grant.id}/edit`} className="btn-secondary">
            <PencilIcon className="w-5 h-5 mr-2" />
            Edit
          </Link>
          <button onClick={handleDelete} className="btn-danger">
            <TrashIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Overview */}
          <div className="card">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Overview</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <StatusBadge status={grant.status} />
                <span className="badge-gray capitalize">{grant.deadline_type}</span>
              </div>

              {grant.description && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Description</h3>
                  <p className="text-gray-600 whitespace-pre-wrap">{grant.description}</p>
                </div>
              )}

              {grant.source_url && (
                <a
                  href={grant.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700"
                >
                  <LinkIcon className="w-4 h-4" />
                  View original grant page
                </a>
              )}
            </div>
          </div>

          {/* Eligibility */}
          <div className="card">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Eligibility</h2>
            </div>
            <div className="p-6 space-y-6">
              {grant.causes.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Causes</h3>
                  <div className="flex flex-wrap gap-2">
                    {grant.causes.map((cause) => (
                      <span key={cause.id} className="badge-info">
                        {cause.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {grant.applicant_types.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Who Can Apply</h3>
                  <div className="flex flex-wrap gap-2">
                    {grant.applicant_types.map((type) => (
                      <span key={type.id} className="badge-gray">
                        {type.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {grant.provinces.length > 0 ? (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Provinces</h3>
                  <div className="flex flex-wrap gap-2">
                    {grant.provinces.map((province) => (
                      <span key={province.id} className="badge-gray">
                        {province.name}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Provinces</h3>
                  <p className="text-gray-500">National (all provinces eligible)</p>
                </div>
              )}

              {grant.eligibility_flags.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Special Eligibility</h3>
                  <div className="flex flex-wrap gap-2">
                    {grant.eligibility_flags.map((flag) => (
                      <span key={flag.id} className="badge-success">
                        {flag.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {grant.notes && (
            <div className="card">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">Internal Notes</h2>
              </div>
              <div className="p-6">
                <p className="text-gray-600 whitespace-pre-wrap">{grant.notes}</p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Key Details */}
          <div className="card">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Details</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <CalendarIcon className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Deadline</p>
                  <p className="text-gray-600">
                    {grant.deadline_type === 'rolling'
                      ? 'Rolling (ongoing)'
                      : grant.deadline_at
                      ? format(new Date(grant.deadline_at), 'MMMM d, yyyy')
                      : 'Not specified'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CurrencyDollarIcon className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Funding Amount</p>
                  <p className="text-gray-600">
                    {grant.amount_min || grant.amount_max ? (
                      <>
                        {grant.amount_min && `$${Number(grant.amount_min).toLocaleString()}`}
                        {grant.amount_min && grant.amount_max && ' - '}
                        {grant.amount_max && `$${Number(grant.amount_max).toLocaleString()}`}
                        <span className="text-gray-400 ml-1">{grant.currency}</span>
                      </>
                    ) : (
                      'Not specified'
                    )}
                  </p>
                </div>
              </div>

              {grant.last_verified_at && (
                <div className="flex items-start gap-3">
                  <CheckBadgeIcon className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Last Verified</p>
                    <p className="text-gray-600">
                      {format(new Date(grant.last_verified_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Timestamps */}
          <div className="card p-6">
            <div className="text-sm text-gray-500 space-y-2">
              <p>Created: {format(new Date(grant.created_at), 'MMM d, yyyy')}</p>
              <p>Updated: {format(new Date(grant.updated_at), 'MMM d, yyyy')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    open: 'badge-success',
    closed: 'badge-danger',
    unknown: 'badge-gray',
  };

  return <span className={styles[status] || 'badge-gray'}>{status}</span>;
}
