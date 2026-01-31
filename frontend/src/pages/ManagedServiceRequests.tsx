import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { managedServiceRequestsApi } from '../services/api';
import type { ManagedServiceRequest } from '../types';
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  contacted: 'bg-blue-100 text-blue-800',
  converted: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800',
};

export default function ManagedServiceRequests() {
  const [requests, setRequests] = useState<ManagedServiceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState('');

  useEffect(() => {
    loadRequests();
  }, [statusFilter]);

  const loadRequests = async () => {
    try {
      const data = await managedServiceRequestsApi.list(statusFilter || undefined);
      setRequests(data);
    } catch (error) {
      toast.error('Failed to load requests');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await managedServiceRequestsApi.update(id, { status });
      setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
      toast.success('Status updated');
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleSaveNotes = async (id: string, notes: string) => {
    try {
      const updated = await managedServiceRequestsApi.update(id, { notes });
      setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, notes: updated.notes } : r)));
      toast.success('Notes saved');
    } catch (error) {
      toast.error('Failed to save notes');
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
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">Expert Help Requests</h1>
        <p className="mt-1 text-gray-600">
          Self-service users who requested managed service. Follow up and convert to clients.
        </p>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input w-auto"
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="contacted">Contacted</option>
          <option value="converted">Converted</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {requests.length === 0 ? (
          <div className="p-12 text-center">
            <ChatBubbleLeftRightIcon className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No requests yet</h3>
            <p className="text-gray-500">
              Requests from self-service users will appear here when they use &quot;Get Expert Help&quot; in the portal.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {requests.map((req) => (
              <div key={req.id} className="p-6 hover:bg-gray-50/50">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Link
                        to={`/clients/${req.client_id}`}
                        className="font-medium text-gray-900 hover:text-primary-600"
                      >
                        View client →
                      </Link>
                      <span className={`badge ${statusColors[req.status] || 'bg-gray-100 text-gray-800'}`}>
                        {req.status}
                      </span>
                    </div>
                    <p className="text-gray-700 whitespace-pre-wrap">{req.message}</p>
                    {req.contact_phone && (
                      <p className="text-sm text-gray-500 mt-2">Phone: {req.contact_phone}</p>
                    )}
                    <p className="text-sm text-gray-400 mt-2">
                      Submitted {format(new Date(req.created_at), 'MMM d, yyyy HH:mm')}
                    </p>
                    {editingNotesId === req.id ? (
                      <div className="mt-3">
                        <textarea
                          value={notesDraft}
                          onChange={(e) => setNotesDraft(e.target.value)}
                          className="input text-sm min-h-[80px]"
                          placeholder="Add staff notes..."
                        />
                        <div className="flex gap-2 mt-2">
                          <button
                            type="button"
                            onClick={() => handleSaveNotes(req.id, notesDraft)}
                            className="btn-primary text-sm"
                          >
                            Save notes
                          </button>
                          <button
                            type="button"
                            onClick={() => { setEditingNotesId(null); setNotesDraft(''); }}
                            className="btn-secondary text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3">
                        {req.notes ? (
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <p className="text-xs font-medium text-gray-500 mb-1">Staff notes</p>
                            <p className="text-sm text-gray-700">{req.notes}</p>
                          </div>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => { setEditingNotesId(req.id); setNotesDraft(req.notes || ''); }}
                          className="mt-1 text-sm text-primary-600 hover:text-primary-700"
                        >
                          {req.notes ? 'Edit notes' : 'Add notes'}
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="shrink-0">
                    <select
                      value={req.status}
                      onChange={(e) => handleStatusChange(req.id, e.target.value)}
                      className="input w-auto text-sm py-1.5"
                      aria-label="Update request status"
                    >
                      <option value="pending">Pending</option>
                      <option value="contacted">Contacted</option>
                      <option value="converted">Converted</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
