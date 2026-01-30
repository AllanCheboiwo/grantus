import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { portalApi, subscriptionApi } from '../../services/api';
import type { Grant, SubscriptionStatus } from '../../types';
import {
  ArrowLeftIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  GlobeAltIcon,
  LockClosedIcon,
  SparklesIcon,
  BuildingLibraryIcon,
  MapPinIcon,
  TagIcon,
  FlagIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function PortalGrantDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [grant, setGrant] = useState<Grant | null>(null);
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const statusData = await subscriptionApi.getStatus();
      setStatus(statusData);
      
      if (statusData.has_access && id) {
        const grantData = await portalApi.getGrant(id);
        setGrant(grantData);
      }
    } catch (error: any) {
      if (error.response?.status === 403) {
        setStatus((prev) => prev ? { ...prev, has_access: false } : null);
      } else if (error.response?.status === 404) {
        toast.error('Grant not found');
        navigate('/portal/grants');
      } else {
        toast.error('Failed to load grant');
      }
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

  // Paywall
  if (!status?.has_access) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-6">
            <LockClosedIcon className="w-8 h-8 text-gray-400" />
          </div>
          <h1 className="text-2xl font-display font-bold text-gray-900 mb-3">
            Subscription Required
          </h1>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            Upgrade your account to view grant details and access the full Grant Database.
          </p>
          <Link
            to="/portal/subscription"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700"
          >
            <SparklesIcon className="w-5 h-5" />
            View Subscription Plans
          </Link>
        </div>
      </div>
    );
  }

  if (!grant) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Grant not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back Button */}
      <Link
        to="/portal/grants"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        Back to Grants
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium mb-3 ${
              grant.status === 'open' ? 'bg-green-100 text-green-700' :
              grant.status === 'closed' ? 'bg-red-100 text-red-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {grant.status === 'open' ? 'Open' : grant.status === 'closed' ? 'Closed' : 'Unknown'}
            </span>
            <h1 className="text-2xl font-display font-bold text-gray-900">{grant.name}</h1>
            {grant.funder && (
              <p className="text-lg text-gray-600 mt-2">{grant.funder}</p>
            )}
          </div>
        </div>

        {/* Key Info Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-6 border-t border-gray-200">
          {/* Amount */}
          {(grant.amount_min || grant.amount_max) && (
            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <CurrencyDollarIcon className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Funding Amount</p>
                <p className="font-semibold text-gray-900">
                  {grant.amount_min && grant.amount_max
                    ? `$${grant.amount_min.toLocaleString()} - $${grant.amount_max.toLocaleString()}`
                    : grant.amount_max
                    ? `Up to $${grant.amount_max.toLocaleString()}`
                    : `From $${grant.amount_min?.toLocaleString()}`}
                  {grant.currency !== 'CAD' && ` ${grant.currency}`}
                </p>
              </div>
            </div>
          )}

          {/* Deadline */}
          {grant.deadline_at && (
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-50 rounded-lg">
                <CalendarIcon className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Deadline</p>
                <p className="font-semibold text-gray-900">
                  {format(new Date(grant.deadline_at), 'MMMM d, yyyy')}
                </p>
                <p className="text-sm text-gray-500 capitalize">
                  {grant.deadline_type} deadline
                </p>
              </div>
            </div>
          )}

          {/* Source URL */}
          {grant.source_url && (
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary-50 rounded-lg">
                <GlobeAltIcon className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">More Info</p>
                <a
                  href={grant.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-primary-600 hover:text-primary-700 hover:underline"
                >
                  Visit Website →
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      {grant.description && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Description</h2>
          <p className="text-gray-700 whitespace-pre-wrap">{grant.description}</p>
        </div>
      )}

      {/* Eligibility */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Eligibility</h2>
        <div className="space-y-6">
          {/* Causes */}
          {grant.causes.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                <TagIcon className="w-4 h-4" />
                <span>Causes / Focus Areas</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {grant.causes.map((cause) => (
                  <span
                    key={cause.id}
                    className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-sm"
                  >
                    {cause.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Applicant Types */}
          {grant.applicant_types.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                <BuildingLibraryIcon className="w-4 h-4" />
                <span>Eligible Organizations</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {grant.applicant_types.map((type) => (
                  <span
                    key={type.id}
                    className="px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-sm"
                  >
                    {type.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Provinces */}
          {grant.provinces.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                <MapPinIcon className="w-4 h-4" />
                <span>Geographic Scope</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {grant.provinces.map((province) => (
                  <span
                    key={province.id}
                    className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm"
                  >
                    {province.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Eligibility Flags */}
          {grant.eligibility_flags.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                <FlagIcon className="w-4 h-4" />
                <span>Additional Requirements</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {grant.eligibility_flags.map((flag) => (
                  <span
                    key={flag.id}
                    className="px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-sm"
                  >
                    {flag.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Notes (if any) */}
      {grant.notes && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <h2 className="font-semibold text-amber-900 mb-2">Notes</h2>
          <p className="text-amber-800 whitespace-pre-wrap">{grant.notes}</p>
        </div>
      )}

      {/* Metadata */}
      <div className="text-sm text-gray-500 text-center">
        Last updated: {format(new Date(grant.updated_at), 'MMMM d, yyyy')}
        {grant.last_verified_at && (
          <span> • Verified: {format(new Date(grant.last_verified_at), 'MMMM d, yyyy')}</span>
        )}
      </div>
    </div>
  );
}
