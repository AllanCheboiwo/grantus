import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { clientsApi, matchesApi, applicationsApi } from '../services/api';
import type { Client, Match, MatchGenerate, Application, ClientUser } from '../types';
import {
  PencilIcon,
  TrashIcon,
  ArrowLeftIcon,
  SparklesIcon,
  PlusIcon,
  UserPlusIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [generatedMatches, setGeneratedMatches] = useState<MatchGenerate[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [clientUsers, setClientUsers] = useState<ClientUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [clientData, matchesData, appsData, usersData] = await Promise.all([
        clientsApi.getById(id!),
        matchesApi.getAll({ client_id: id }),
        applicationsApi.getAll({ client_id: id }),
        clientsApi.getUsers(id!),
      ]);
      setClient(clientData);
      setMatches(matchesData);
      setApplications(appsData);
      setClientUsers(usersData);
    } catch (error) {
      toast.error('Failed to load client');
      navigate('/clients');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (!client || !confirm('Remove this user from the client?')) return;
    try {
      await clientsApi.removeUser(client.id, userId);
      toast.success('User removed');
      setClientUsers((prev) => prev.filter((u) => u.user_id !== userId));
    } catch (error) {
      toast.error('Failed to remove user');
    }
  };

  const handleGenerateMatches = async () => {
    if (!client) return;
    setIsGenerating(true);
    try {
      const results = await matchesApi.generate(client.id);
      setGeneratedMatches(results);
      toast.success(`Found ${results.length} matching grants`);
    } catch (error) {
      toast.error('Failed to generate matches');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleQualifyMatch = async (match: MatchGenerate) => {
    if (!client) return;
    try {
      await matchesApi.create({
        client_id: client.id,
        grant_id: match.grant.id,
        fit_score: match.fit_score,
        fit_level: match.fit_level,
        reasons: match.reasons,
        status: 'qualified',
      });
      toast.success('Match qualified');
      // Refresh data
      const matchesData = await matchesApi.getAll({ client_id: client.id });
      setMatches(matchesData);
      setGeneratedMatches((prev) => prev.filter((m) => m.grant.id !== match.grant.id));
    } catch (error) {
      toast.error('Failed to qualify match');
    }
  };

  const handleCreateApplication = async (match: Match) => {
    if (!client) return;
    try {
      const app = await applicationsApi.create({
        client_id: client.id,
        grant_id: match.grant_id,
        match_id: match.id,
      });
      toast.success('Application created');
      navigate(`/applications/${app.id}`);
    } catch (error) {
      toast.error('Failed to create application');
    }
  };

  const handleDelete = async () => {
    if (!client || !confirm('Are you sure you want to delete this client?')) return;
    try {
      await clientsApi.delete(client.id);
      toast.success('Client deleted');
      navigate('/clients');
    } catch (error) {
      toast.error('Failed to delete client');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (!client) {
    return <div>Client not found</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Link
            to="/clients"
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors mt-1"
          >
            <ArrowLeftIcon className="w-5 h-5 text-gray-500" />
          </Link>
          <div>
            <h1 className="text-2xl font-display font-bold text-gray-900">{client.name}</h1>
            {client.entity_type && (
              <p className="text-gray-600 mt-1">{client.entity_type}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerateMatches}
            disabled={isGenerating}
            className="btn-primary"
          >
            <SparklesIcon className="w-5 h-5 mr-2" />
            {isGenerating ? 'Finding...' : 'Find Matches'}
          </button>
          <Link to={`/clients/${client.id}/edit`} className="btn-secondary">
            <PencilIcon className="w-5 h-5 mr-2" />
            Edit
          </Link>
          <button onClick={handleDelete} className="btn-danger">
            <TrashIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Generated Matches */}
          {generatedMatches.length > 0 && (
            <div className="card">
              <div className="p-6 border-b border-gray-100 bg-primary-50">
                <h2 className="text-lg font-semibold text-gray-900">
                  Recommended Matches ({generatedMatches.length})
                </h2>
                <p className="text-sm text-gray-600">Click "Qualify" to save a match</p>
              </div>
              <div className="divide-y divide-gray-100">
                {generatedMatches.map((match) => (
                  <div key={match.grant.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <Link
                          to={`/grants/${match.grant.id}`}
                          className="font-medium text-gray-900 hover:text-primary-600"
                        >
                          {match.grant.name}
                        </Link>
                        <p className="text-sm text-gray-500">{match.grant.funder}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <FitScoreBadge score={match.fit_score} level={match.fit_level} />
                          {match.grant.deadline_at && (
                            <span className="text-xs text-gray-500">
                              Due: {format(new Date(match.grant.deadline_at), 'MMM d, yyyy')}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleQualifyMatch(match)}
                        className="btn-success text-sm"
                      >
                        Qualify
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Saved Matches */}
          {matches.length > 0 && (
            <div className="card">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">
                  Qualified Matches ({matches.filter((m) => m.status === 'qualified').length})
                </h2>
              </div>
              <div className="divide-y divide-gray-100">
                {matches
                  .filter((m) => m.status === 'qualified')
                  .map((match) => (
                    <div key={match.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <Link
                            to={`/grants/${match.grant_id}`}
                            className="font-medium text-gray-900 hover:text-primary-600"
                          >
                            {match.grant?.name || 'Unknown Grant'}
                          </Link>
                          <div className="flex items-center gap-2 mt-2">
                            <FitScoreBadge
                              score={match.fit_score}
                              level={match.fit_level || ''}
                            />
                            <span className="badge-success">{match.status}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleCreateApplication(match)}
                          className="btn-primary text-sm"
                        >
                          <PlusIcon className="w-4 h-4 mr-1" />
                          Create Application
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Applications */}
          <div className="card">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
                Applications ({applications.length})
              </h2>
            </div>
            {applications.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No applications yet. Generate matches to get started.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {applications.map((app) => (
                  <Link
                    key={app.id}
                    to={`/applications/${app.id}`}
                    className="block p-4 hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          {app.grant?.name || 'Unknown Grant'}
                        </p>
                        <p className="text-sm text-gray-500">
                          Updated {format(new Date(app.updated_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <StageBadge stage={app.stage} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar - Profile */}
        <div className="space-y-6">
          <div className="card">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Eligibility Profile</h2>
            </div>
            <div className="p-6 space-y-4">
              {client.causes.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Causes</h3>
                  <div className="flex flex-wrap gap-1">
                    {client.causes.map((cause) => (
                      <span key={cause.id} className="badge-info text-xs">
                        {cause.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {client.applicant_types.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Type</h3>
                  <div className="flex flex-wrap gap-1">
                    {client.applicant_types.map((type) => (
                      <span key={type.id} className="badge-gray text-xs">
                        {type.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {client.provinces.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Provinces</h3>
                  <div className="flex flex-wrap gap-1">
                    {client.provinces.map((p) => (
                      <span key={p.id} className="badge-gray text-xs">
                        {p.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {client.eligibility_flags.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Special</h3>
                  <div className="flex flex-wrap gap-1">
                    {client.eligibility_flags.map((flag) => (
                      <span key={flag.id} className="badge-success text-xs">
                        {flag.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {client.causes.length === 0 &&
                client.applicant_types.length === 0 &&
                client.provinces.length === 0 && (
                  <p className="text-sm text-gray-500">
                    No eligibility profile set.{' '}
                    <Link
                      to={`/clients/${client.id}/edit`}
                      className="text-primary-600 hover:underline"
                    >
                      Edit client
                    </Link>{' '}
                    to add criteria.
                  </p>
                )}
            </div>
          </div>

          {client.notes && (
            <div className="card p-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Notes</h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{client.notes}</p>
            </div>
          )}

          {/* Client Portal Users */}
          <div className="card">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Portal Users</h2>
              <button
                onClick={() => setShowCreateUserModal(true)}
                className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1"
              >
                <UserPlusIcon className="w-4 h-4" />
                Add
              </button>
            </div>
            <div className="p-4">
              {clientUsers.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No portal users yet. Add a user to give them access.
                </p>
              ) : (
                <div className="space-y-3">
                  {clientUsers.map((cu) => (
                    <div
                      key={cu.user_id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {cu.name || cu.email}
                        </p>
                        <p className="text-xs text-gray-500">{cu.email}</p>
                        {cu.client_role && (
                          <span className="text-xs text-gray-400">{cu.client_role}</span>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveUser(cu.user_id)}
                        className="p-1 text-gray-400 hover:text-red-600"
                        title="Remove user"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create Client User Modal */}
      {showCreateUserModal && client && (
        <CreateClientUserModal
          clientId={client.id}
          onClose={() => setShowCreateUserModal(false)}
          onSuccess={(newUser) => {
            setShowCreateUserModal(false);
            setClientUsers((prev) => [...prev, newUser]);
          }}
        />
      )}
    </div>
  );
}

function FitScoreBadge({ score, level }: { score: number; level: string }) {
  const color =
    level === 'high' || score >= 80
      ? 'bg-secondary-100 text-secondary-700'
      : level === 'medium' || score >= 50
      ? 'bg-amber-100 text-amber-700'
      : 'bg-gray-100 text-gray-700';

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${color}`}>
      {score}% match
    </span>
  );
}

function StageBadge({ stage }: { stage: string }) {
  const styles: Record<string, string> = {
    draft: 'badge-gray',
    in_progress: 'badge-info',
    submitted: 'badge-warning',
    awarded: 'badge-success',
    declined: 'badge-danger',
    reporting: 'badge-info',
    closed: 'badge-gray',
  };

  return (
    <span className={styles[stage] || 'badge-gray'}>
      {stage.replace('_', ' ')}
    </span>
  );
}

function CreateClientUserModal({
  clientId,
  onClose,
  onSuccess,
}: {
  clientId: string;
  onClose: () => void;
  onSuccess: (user: ClientUser) => void;
}) {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    client_role: 'viewer',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      toast.error('Email and password are required');
      return;
    }

    setIsSubmitting(true);
    try {
      const newUser = await clientsApi.createUser(clientId, formData);
      toast.success('Client user created! Share these credentials with them.');
      onSuccess(newUser);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to create user');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Create Portal User</h2>
        <p className="text-sm text-gray-500 mb-6">
          Create login credentials for a client contact. You'll need to share these with them.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="input"
              placeholder="client@example.com"
              required
            />
          </div>

          <div>
            <label className="label">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input"
              placeholder="Contact name"
            />
          </div>

          <div>
            <label className="label">Password *</label>
            <input
              type="text"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="input"
              placeholder="Temporary password"
              required
              minLength={6}
            />
            <p className="text-xs text-gray-500 mt-1">
              This will be visible so you can share it with the client.
            </p>
          </div>

          <div>
            <label className="label">Role</label>
            <select
              value={formData.client_role}
              onChange={(e) => setFormData({ ...formData, client_role: e.target.value })}
              className="input"
            >
              <option value="viewer">Viewer (read-only)</option>
              <option value="owner">Owner (full access)</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
