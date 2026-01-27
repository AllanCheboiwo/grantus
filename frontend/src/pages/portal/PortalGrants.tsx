import { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { portalApi, subscriptionApi, lookupsApi } from '../../services/api';
import type { Grant, SubscriptionStatus, Cause, Province, ApplicantType } from '../../types';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  SparklesIcon,
  LockClosedIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  BuildingLibraryIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function PortalGrants() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [grants, setGrants] = useState<Grant[]>([]);
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [causes, setCauses] = useState<Cause[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [applicantTypes, setApplicantTypes] = useState<ApplicantType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'all' | 'matches'>('all');

  // Filter state
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [causeId, setCauseId] = useState(searchParams.get('cause_id') || '');
  const [provinceId, setProvinceId] = useState(searchParams.get('province_id') || '');
  const [applicantTypeId, setApplicantTypeId] = useState(searchParams.get('applicant_type_id') || '');

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (status?.has_access) {
      loadGrants();
    }
  }, [viewMode, search, causeId, provinceId, applicantTypeId, status?.has_access]);

  const loadInitialData = async () => {
    try {
      const [statusData, causesData, provincesData, typesData] = await Promise.all([
        subscriptionApi.getStatus(),
        lookupsApi.getCauses(),
        lookupsApi.getProvinces(),
        lookupsApi.getApplicantTypes(),
      ]);
      setStatus(statusData);
      setCauses(causesData);
      setProvinces(provincesData);
      setApplicantTypes(typesData);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadGrants = async () => {
    try {
      let data: Grant[];
      if (viewMode === 'matches') {
        data = await portalApi.getMatchingGrants();
      } else {
        const params: Record<string, string> = {};
        if (search) params.search = search;
        if (causeId) params.cause_id = causeId;
        if (provinceId) params.province_id = provinceId;
        if (applicantTypeId) params.applicant_type_id = applicantTypeId;
        data = await portalApi.getGrants(params);
      }
      setGrants(data);
    } catch (error: any) {
      if (error.response?.status === 403) {
        // Subscription required
        setStatus((prev) => prev ? { ...prev, has_access: false } : null);
      } else {
        toast.error('Failed to load grants');
      }
    }
  };

  const clearFilters = () => {
    setSearch('');
    setCauseId('');
    setProvinceId('');
    setApplicantTypeId('');
    setSearchParams({});
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
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
            Upgrade your account to access the Grant Database. Browse grants, find matches, and apply on your own terms.
          </p>
          <Link
            to="/portal/subscription"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
          >
            <SparklesIcon className="w-5 h-5" />
            View Subscription Plans
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Grant Database</h1>
          <p className="mt-1 text-gray-600">
            Browse and search grants that match your organization.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'all'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Grants
          </button>
          <button
            onClick={() => setViewMode('matches')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              viewMode === 'matches'
                ? 'bg-blue-600 text-white'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            <SparklesIcon className="w-4 h-4" />
            My Matches
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      {viewMode === 'all' && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search grants..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg font-medium text-sm ${
                showFilters || causeId || provinceId || applicantTypeId
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <FunnelIcon className="w-4 h-4" />
              Filters
              {(causeId || provinceId || applicantTypeId) && (
                <span className="ml-1 px-1.5 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                  {[causeId, provinceId, applicantTypeId].filter(Boolean).length}
                </span>
              )}
            </button>
          </div>

          {/* Filter Dropdowns */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cause</label>
                <select
                  value={causeId}
                  onChange={(e) => setCauseId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Causes</option>
                  {causes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Province</label>
                <select
                  value={provinceId}
                  onChange={(e) => setProvinceId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Provinces</option>
                  {provinces.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Organization Type</label>
                <select
                  value={applicantTypeId}
                  onChange={(e) => setApplicantTypeId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Types</option>
                  {applicantTypes.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-3">
                <button
                  onClick={clearFilters}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Clear all filters
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Results */}
      <div className="text-sm text-gray-500 mb-2">
        {grants.length} {grants.length === 1 ? 'grant' : 'grants'} found
        {viewMode === 'matches' && ' matching your profile'}
      </div>

      {/* Grant List */}
      {grants.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <BuildingLibraryIcon className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {viewMode === 'matches' ? 'No matches found' : 'No grants found'}
          </h3>
          <p className="text-gray-500">
            {viewMode === 'matches'
              ? 'Update your organization profile to improve matching.'
              : 'Try adjusting your search or filters.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {grants.map((grant) => (
            <Link
              key={grant.id}
              to={`/portal/grants/${grant.id}`}
              className="bg-white rounded-xl border border-gray-200 p-6 hover:border-blue-300 hover:shadow-md transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 text-lg">{grant.name}</h3>
                  {grant.funder && (
                    <p className="text-gray-600 mt-1">{grant.funder}</p>
                  )}
                  {grant.description && (
                    <p className="text-gray-500 text-sm mt-2 line-clamp-2">
                      {grant.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {grant.causes.slice(0, 3).map((cause) => (
                      <span
                        key={cause.id}
                        className="px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded-full"
                      >
                        {cause.name}
                      </span>
                    ))}
                    {grant.causes.length > 3 && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                        +{grant.causes.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 text-sm">
                  {(grant.amount_min || grant.amount_max) && (
                    <div className="flex items-center gap-1 text-green-600">
                      <CurrencyDollarIcon className="w-4 h-4" />
                      <span>
                        {grant.amount_min && grant.amount_max
                          ? `$${grant.amount_min.toLocaleString()} - $${grant.amount_max.toLocaleString()}`
                          : grant.amount_max
                          ? `Up to $${grant.amount_max.toLocaleString()}`
                          : `From $${grant.amount_min?.toLocaleString()}`}
                      </span>
                    </div>
                  )}
                  {grant.deadline_at && (
                    <div className="flex items-center gap-1 text-gray-500">
                      <CalendarIcon className="w-4 h-4" />
                      <span>Due {format(new Date(grant.deadline_at), 'MMM d, yyyy')}</span>
                    </div>
                  )}
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    grant.status === 'open' ? 'bg-green-100 text-green-700' :
                    grant.status === 'closed' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {grant.status === 'open' ? 'Open' : grant.status === 'closed' ? 'Closed' : 'Unknown'}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
