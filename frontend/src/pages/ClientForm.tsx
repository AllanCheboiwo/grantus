import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { clientsApi } from '../services/api';
import { useLookupsStore } from '../stores/lookupsStore';
import type { ClientCreate } from '../types';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function ClientForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const { causes, applicantTypes, provinces, eligibilityFlags } = useLookupsStore();

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState<ClientCreate>({
    name: '',
    entity_type: '',
    notes: '',
    cause_ids: [],
    applicant_type_ids: [],
    province_ids: [],
    eligibility_flag_ids: [],
  });

  useEffect(() => {
    if (id) loadClient();
  }, [id]);

  const loadClient = async () => {
    setIsLoading(true);
    try {
      const client = await clientsApi.getById(id!);
      setFormData({
        name: client.name,
        entity_type: client.entity_type || '',
        notes: client.notes || '',
        cause_ids: client.causes.map((c) => c.id),
        applicant_type_ids: client.applicant_types.map((t) => t.id),
        province_ids: client.provinces.map((p) => p.id),
        eligibility_flag_ids: client.eligibility_flags.map((f) => f.id),
      });
    } catch (error) {
      toast.error('Failed to load client');
      navigate('/clients');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Client name is required');
      return;
    }

    setIsSaving(true);
    try {
      if (isEdit) {
        // Update basic info
        await clientsApi.update(id!, {
          name: formData.name,
          entity_type: formData.entity_type,
          notes: formData.notes,
        });
        // Update eligibility
        await clientsApi.updateEligibility(id!, {
          cause_ids: formData.cause_ids || [],
          applicant_type_ids: formData.applicant_type_ids || [],
          province_ids: formData.province_ids || [],
          eligibility_flag_ids: formData.eligibility_flag_ids || [],
        });
        toast.success('Client updated');
        navigate(`/clients/${id}`);
      } else {
        const client = await clientsApi.create(formData);
        toast.success('Client created');
        navigate(`/clients/${client.id}`);
      }
    } catch (error) {
      toast.error(isEdit ? 'Failed to update client' : 'Failed to create client');
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
          to={isEdit ? `/clients/${id}` : '/clients'}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5 text-gray-500" />
        </Link>
        <h1 className="text-2xl font-display font-bold text-gray-900">
          {isEdit ? 'Edit Client' : 'Add Client'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="card">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Organization Info</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="label">Organization Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input"
                placeholder="e.g., Vancouver Community Foundation"
                required
              />
            </div>
            <div>
              <label className="label">Entity Type</label>
              <select
                value={formData.entity_type}
                onChange={(e) => setFormData({ ...formData, entity_type: e.target.value })}
                className="input"
              >
                <option value="">Select type...</option>
                <option value="Registered Charity">Registered Charity</option>
                <option value="Nonprofit Organization">Nonprofit Organization</option>
                <option value="Social Enterprise">Social Enterprise</option>
                <option value="First Nations Band">First Nations Band</option>
                <option value="Community Association">Community Association</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="label">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="input min-h-[100px]"
                placeholder="Internal notes about this client..."
              />
            </div>
          </div>
        </div>

        {/* Eligibility Profile */}
        <div className="card">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Eligibility Profile</h2>
            <p className="text-sm text-gray-500 mt-1">
              Set the client's profile to enable automatic grant matching
            </p>
          </div>
          <div className="p-6 space-y-6">
            {/* Causes */}
            <div>
              <label className="label">Causes (areas of focus)</label>
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
              <label className="label">Organization Type</label>
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
              <label className="label">Operating Provinces</label>
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
                    {province.name}
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

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Link to={isEdit ? `/clients/${id}` : '/clients'} className="btn-secondary">
            Cancel
          </Link>
          <button type="submit" disabled={isSaving} className="btn-primary">
            {isSaving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Client'}
          </button>
        </div>
      </form>
    </div>
  );
}
