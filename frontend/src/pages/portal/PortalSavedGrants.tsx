import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { portalApi } from '../../services/api';
import type { SavedGrant } from '../../types';
import {
  BookmarkIcon,
  TrashIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  PencilIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function PortalSavedGrants() {
  const [savedGrants, setSavedGrants] = useState<SavedGrant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState('');

  useEffect(() => {
    loadSavedGrants();
  }, []);

  const loadSavedGrants = async () => {
    try {
      const data = await portalApi.getSavedGrants();
      setSavedGrants(data);
    } catch (error) {
      toast.error('Failed to load saved grants');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = async (savedId: string) => {
    if (!confirm('Remove this grant from your saved list?')) return;
    
    try {
      await portalApi.removeSavedGrant(savedId);
      setSavedGrants((prev) => prev.filter((s) => s.id !== savedId));
      toast.success('Grant removed');
    } catch (error) {
      toast.error('Failed to remove grant');
    }
  };

  const handleUpdateNotes = async (savedId: string) => {
    try {
      const updated = await portalApi.updateSavedGrant(savedId, editNotes);
      setSavedGrants((prev) =>
        prev.map((s) => (s.id === savedId ? { ...s, notes: updated.notes } : s))
      );
      setEditingId(null);
      toast.success('Notes updated');
    } catch (error) {
      toast.error('Failed to update notes');
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">Saved Grants</h1>
        <p className="mt-1 text-gray-600">
          Your bookmarked grants for quick access.
        </p>
      </div>

      {/* List */}
      {savedGrants.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <BookmarkIcon className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No saved grants yet</h3>
          <p className="text-gray-500 mb-6">
            Browse the grant database and save grants you're interested in.
          </p>
          <Link
            to="/portal/grants"
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700"
          >
            Browse Grants
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {savedGrants.map((saved) => (
            <div
              key={saved.id}
              className="bg-white rounded-xl border border-gray-200 p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <Link
                    to={`/portal/grants/${saved.grant_id}`}
                    className="text-lg font-semibold text-gray-900 hover:text-primary-600"
                  >
                    {saved.grant?.name || 'Unknown Grant'}
                  </Link>
                  {saved.grant?.funder && (
                    <p className="text-gray-600 mt-1">{saved.grant.funder}</p>
                  )}
                  
                  <div className="flex flex-wrap gap-4 mt-3 text-sm">
                    {saved.grant?.amount_max && (
                      <div className="flex items-center gap-1 text-green-600">
                        <CurrencyDollarIcon className="w-4 h-4" />
                        <span>Up to ${saved.grant.amount_max.toLocaleString()}</span>
                      </div>
                    )}
                    {saved.grant?.deadline_at && (
                      <div className="flex items-center gap-1 text-gray-500">
                        <CalendarIcon className="w-4 h-4" />
                        <span>Due {format(new Date(saved.grant.deadline_at), 'MMM d, yyyy')}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-gray-400">
                      <BookmarkIcon className="w-4 h-4" />
                      <span>Saved {format(new Date(saved.created_at), 'MMM d, yyyy')}</span>
                    </div>
                  </div>

                  {/* Notes */}
                  {editingId === saved.id ? (
                    <div className="mt-4">
                      <textarea
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                        rows={2}
                        placeholder="Add your notes..."
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => handleUpdateNotes(saved.id)}
                          className="px-3 py-1 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : saved.notes ? (
                    <div className="mt-4 p-3 bg-amber-50 rounded-lg">
                      <div className="flex items-start justify-between">
                        <p className="text-sm text-amber-800">{saved.notes}</p>
                        <button
                          onClick={() => {
                            setEditingId(saved.id);
                            setEditNotes(saved.notes || '');
                          }}
                          className="p-1 text-amber-600 hover:text-amber-800"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingId(saved.id);
                        setEditNotes('');
                      }}
                      className="mt-4 text-sm text-gray-500 hover:text-gray-700"
                    >
                      + Add notes
                    </button>
                  )}
                </div>

                {/* Actions */}
                <button
                  onClick={() => handleRemove(saved.id)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  title="Remove from saved"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
