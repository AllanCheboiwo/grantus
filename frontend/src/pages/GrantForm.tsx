import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { grantsApi } from '../services/api';
import { useLookupsStore } from '../stores/lookupsStore';
import type { Grant, GrantCreate, GrantStatus, DeadlineType } from '../types';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function GrantForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  
  const { causes, applicantTypes, provinces, eligibilityFlags } = useLookupsStore();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState<GrantCreate>({
    name: '',
    funder: '',
    description: '',
    source_url: '',
    notes: '',
    status: 'unknown',
    deadline_type: 'rolling',
    deadline_at: '',
    amount_min: undefined,
    amount_max: undefined,
    currency: 'CAD',
    cause_ids: [],
    applicant_type_ids: [],
    province_ids: [],
    eligibility_flag_ids: [],
  });

  useEffect(() => {
    if (id) loadGrant();
  }, [id]);

  const loadGrant = async () => {
    setIsLoading(true);
    try {
      const grant = await grantsApi.getById(id!);
      setFormData({
        name: grant.name,
        funder: grant.funder || '',
        description: grant.description || '',
        source_url: grant.source_url || '',
        notes: grant.notes || '',
        status: grant.status,
        deadline_type: grant.deadline_type,
        deadline_at: grant.deadline_at || '',
        amount_min: grant.amount_min || undefined,
        amount_max: grant.amount_max || undefined,
        currency: grant.currency,
        cause_ids: grant.causes.map((c) => c.id),
        applicant_type_ids: grant.applicant_types.map((t) => t.id),
        province_ids: grant.provinces.map((p) => p.id),
        eligibility_flag_ids: grant.eligibility_flags.map((f) => f.id),
      });
    } catch (error) {
      toast.error('Failed to load grant');
      navigate('/grants');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Grant name is required');
      return;
    }

    setIsSaving(true);
    try {
      if (isEdit) {
        await grantsApi.update(id!, formData);
        toast.success('Grant updated');
      } else {
        const grant = await grantsApi.create(formData);
        toast.success('Grant created');
        navigate(`/grants/${grant.id}`);
        return;
      }
      navigate(`/grants/${id}`);
    } catch (error) {
      toast.error(isEdit ? 'Failed to update grant' : 'Failed to create grant');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleArrayItem = (
    field: 'cause_ids' | 'applicant_type_ids' | 'province_ids' | 'eligibility_flag_ids',
    itemId: string
  ) => {
    setFormData((prev) => {
      const current = prev[field] || [];
      const updated = current.includes(itemId)
        ? current.filter((id) => id !== itemId)
        : [...current, itemId];
      return { ...prev, [field]: updated };
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to={isEdit ? `/grants/${id}` : '/grants'}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5 text-gray-500" />
        </Link>
        <h1 className="text-2xl font-display font-bold text-gray-900">
          {isEdit ? 'Edit Grant' : 'Add Grant'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="card">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="label">Grant Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  placeholder="e.g., Community Foundation Grant"
                  required
                />
              </div>
              <div>
                <label className="label">Funder</label>
                <input
                  type="text"
                  value={formData.funder}
                  onChange={(e) => setFormData({ ...formData, funder: e.target.value })}
                  className="input"
                  placeholder="e.g., Vancouver Foundation"
                />
              </div>
              <div>
                <label className="label">Source URL</label>
                <input
                  type="url"
                  value={formData.source_url}
                  onChange={(e) => setFormData({ ...formData, source_url: e.target.value })}
                  className="input"
                  placeholder="https://..."
                />
              </div>
            </div>
            <div>
              <label className="label">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input min-h-[100px]"
                placeholder="Brief description of the grant..."
              />
            </div>
          </div>
        </div>

        {/* Status & Deadline */}
        <div className="card">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Status & Deadline</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="label">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as GrantStatus })}
                  className="input"
                >
                  <option value="unknown">Unknown</option>
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div>
                <label className="label">Deadline Type</label>
                <select
                  value={formData.deadline_type}
                  onChange={(e) => setFormData({ ...formData, deadline_type: e.target.value as DeadlineType })}
                  className="input"
                >
                  <option value="rolling">Rolling</option>
                  <option value="fixed">Fixed</option>
                  <option value="multiple">Multiple Rounds</option>
                </select>
              </div>
              {formData.deadline_type !== 'rolling' && (
                <div>
                  <label className="label">Deadline Date</label>
                  <input
                    type="date"
                    value={formData.deadline_at}
                    onChange={(e) => setFormData({ ...formData, deadline_at: e.target.value })}
                    className="input"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Funding Amount */}
        <div className="card">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Funding Amount</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="label">Minimum Amount</label>
                <input
                  type="number"
                  value={formData.amount_min || ''}
                  onChange={(e) => setFormData({ ...formData, amount_min: e.target.value ? Number(e.target.value) : undefined })}
                  className="input"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="label">Maximum Amount</label>
                <input
                  type="number"
                  value={formData.amount_max || ''}
                  onChange={(e) => setFormData({ ...formData, amount_max: e.target.value ? Number(e.target.value) : undefined })}
                  className="input"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="label">Currency</label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="input"
                >
                  <option value="CAD">CAD</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Eligibility */}
        <div className="card">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Eligibility Criteria</h2>
          </div>
          <div className="p-6 space-y-6">
            {/* Causes */}
            <div>
              <label className="label">Causes</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {causes.map((cause) => (
                  <button
                    key={cause.id}
                    type="button"
                    onClick={() => toggleArrayItem('cause_ids', cause.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      formData.cause_ids?.includes(cause.id)
                        ? 'bg-primary-100 text-primary-700 ring-2 ring-primary-500'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {cause.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Applicant Types */}
            <div>
              <label className="label">Who Can Apply</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {applicantTypes.map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => toggleArrayItem('applicant_type_ids', type.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      formData.applicant_type_ids?.includes(type.id)
                        ? 'bg-primary-100 text-primary-700 ring-2 ring-primary-500'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {type.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Provinces */}
            <div>
              <label className="label">Provinces (leave empty for national)</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {provinces.map((province) => (
                  <button
                    key={province.id}
                    type="button"
                    onClick={() => toggleArrayItem('province_ids', province.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      formData.province_ids?.includes(province.id)
                        ? 'bg-primary-100 text-primary-700 ring-2 ring-primary-500'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {province.code}
                  </button>
                ))}
              </div>
            </div>

            {/* Eligibility Flags */}
            <div>
              <label className="label">Special Eligibility</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {eligibilityFlags.map((flag) => (
                  <button
                    key={flag.id}
                    type="button"
                    onClick={() => toggleArrayItem('eligibility_flag_ids', flag.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      formData.eligibility_flag_ids?.includes(flag.id)
                        ? 'bg-secondary-100 text-secondary-700 ring-2 ring-secondary-500'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {flag.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="card">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Internal Notes</h2>
          </div>
          <div className="p-6">
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="input min-h-[100px]"
              placeholder="Internal notes about this grant..."
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Link
            to={isEdit ? `/grants/${id}` : '/grants'}
            className="btn-secondary"
          >
            Cancel
          </Link>
          <button type="submit" disabled={isSaving} className="btn-primary">
            {isSaving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Grant'}
          </button>
        </div>
      </form>
    </div>
  );
}
