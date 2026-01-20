import { create } from 'zustand';
import type { Cause, ApplicantType, Province, EligibilityFlag } from '../types';
import { lookupsApi } from '../services/api';

interface LookupsState {
  causes: Cause[];
  applicantTypes: ApplicantType[];
  provinces: Province[];
  eligibilityFlags: EligibilityFlag[];
  isLoaded: boolean;
  loadLookups: () => Promise<void>;
}

export const useLookupsStore = create<LookupsState>((set, get) => ({
  causes: [],
  applicantTypes: [],
  provinces: [],
  eligibilityFlags: [],
  isLoaded: false,

  loadLookups: async () => {
    if (get().isLoaded) return;
    
    try {
      const [causes, applicantTypes, provinces, eligibilityFlags] = await Promise.all([
        lookupsApi.getCauses(),
        lookupsApi.getApplicantTypes(),
        lookupsApi.getProvinces(),
        lookupsApi.getEligibilityFlags(),
      ]);
      
      set({
        causes,
        applicantTypes,
        provinces,
        eligibilityFlags,
        isLoaded: true,
      });
    } catch (error) {
      console.error('Failed to load lookups:', error);
    }
  },
}));
