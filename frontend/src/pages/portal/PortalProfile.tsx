import { useEffect, useState } from 'react';
import { portalApi, lookupsApi } from '../../services/api';
import type { Client, Cause, Province, ApplicantType, EligibilityFlag } from '../../types';
import {
  BuildingLibraryIcon,
  CheckIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function PortalProfile() {
  const [client, setClient] = useState<Client | null>(null);
  const [causes, setCauses] = useState<Cause[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [applicantTypes, setApplicantTypes] = useState<ApplicantType[]>([]);
  const [eligibilityFlags, setEligibilityFlags] = useState<EligibilityFlag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Selected IDs
  const [selectedCauses, setSelectedCauses] = useState<string[]>([]);
  const [selectedProvinces, setSelectedProvinces] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedFlags, setSelectedFlags] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [clientData, causesData, provincesData, typesData, flagsData] = await Promise.all([
        portalApi.getMyClient(),
        lookupsApi.getCauses(),
        lookupsApi.getProvinces(),
        lookupsApi.getApplicantTypes(),
        lookupsApi.getEligibilityFlags(),
      ]);
      
      setClient(clientData);
      setCauses(causesData);
      setProvinces(provincesData);
      setApplicantTypes(typesData);
      setEligibilityFlags(flagsData);
      
      // Set current selections
      setSelectedCauses(clientData.causes.map((c) => c.id));
      setSelectedProvinces(clientData.provinces.map((p) => p.id));
      setSelectedTypes(clientData.applicant_types.map((t) => t.id));
      setSelectedFlags(clientData.eligibility_flags.map((f) => f.id));
    } catch (error) {
      toast.error('Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updated = await portalApi.updateEligibility({
        cause_ids: selectedCauses,
        applicant_type_ids: selectedTypes,
        province_ids: selectedProvinces,
        eligibility_flag_ids: selectedFlags,
      });
      setClient(updated);
      toast.success('Profile updated! Your matches will be recalculated.');
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleItem = (id: string, selected: string[], setSelected: (ids: string[]) => void) => {
    if (selected.includes(id)) {
      setSelected(selected.filter((i) => i !== id));
    } else {
      setSelected([...selected, id]);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">Organization Profile</h1>
        <p className="mt-1 text-gray-600">
          Update your profile to get better grant matches.
        </p>
      </div>

      {/* Organization Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-primary-100 rounded-xl">
            <BuildingLibraryIcon className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">{client?.name}</h2>
            <p className="text-sm text-gray-500">{client?.entity_type || 'Organization'}</p>
          </div>
        </div>
      </div>

      {/* Eligibility Profile */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-6">
          <SparklesIcon className="w-5 h-5 text-amber-500" />
          <h2 className="font-semibold text-gray-900">Eligibility Profile</h2>
        </div>
        <p className="text-sm text-gray-600 mb-6">
          Select the criteria that apply to your organization. This helps us find grants that match your profile.
        </p>

        {/* Organization Type */}
        <div className="mb-8">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Organization Type</h3>
          <div className="flex flex-wrap gap-2">
            {applicantTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => toggleItem(type.id, selectedTypes, setSelectedTypes)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedTypes.includes(type.id)
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {selectedTypes.includes(type.id) && (
                  <CheckIcon className="w-4 h-4 inline mr-1" />
                )}
                {type.name}
              </button>
            ))}
          </div>
        </div>

        {/* Causes / Focus Areas */}
        <div className="mb-8">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Causes / Focus Areas</h3>
          <div className="flex flex-wrap gap-2">
            {causes.map((cause) => (
              <button
                key={cause.id}
                onClick={() => toggleItem(cause.id, selectedCauses, setSelectedCauses)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedCauses.includes(cause.id)
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {selectedCauses.includes(cause.id) && (
                  <CheckIcon className="w-4 h-4 inline mr-1" />
                )}
                {cause.name}
              </button>
            ))}
          </div>
        </div>

        {/* Provinces */}
        <div className="mb-8">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Operating Regions</h3>
          <div className="flex flex-wrap gap-2">
            {provinces.map((province) => (
              <button
                key={province.id}
                onClick={() => toggleItem(province.id, selectedProvinces, setSelectedProvinces)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedProvinces.includes(province.id)
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {selectedProvinces.includes(province.id) && (
                  <CheckIcon className="w-4 h-4 inline mr-1" />
                )}
                {province.name}
              </button>
            ))}
          </div>
        </div>

        {/* Special Eligibility */}
        {eligibilityFlags.length > 0 && (
          <div className="mb-8">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Special Eligibility</h3>
            <div className="flex flex-wrap gap-2">
              {eligibilityFlags.map((flag) => (
                <button
                  key={flag.id}
                  onClick={() => toggleItem(flag.id, selectedFlags, setSelectedFlags)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedFlags.includes(flag.id)
                      ? 'bg-amber-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {selectedFlags.includes(flag.id) && (
                    <CheckIcon className="w-4 h-4 inline mr-1" />
                  )}
                  {flag.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="pt-4 border-t border-gray-200">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </div>
    </div>
  );
}
