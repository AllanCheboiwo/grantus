import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { clientsApi, matchesApi, applicationsApi, invitesApi } from '../services/api';
import type { Client, Match, MatchGenerate, Application, ClientUser, ClientInvite } from '../types';
import {
  PencilIcon,
  TrashIcon,
  ArrowLeftIcon,
  SparklesIcon,
  PlusIcon,
  EnvelopeIcon,
  XMarkIcon,
  ClipboardDocumentIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { format, formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [generatedMatches, setGeneratedMatches] = useState<MatchGenerate[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [clientUsers, setClientUsers] = useState<ClientUser[]>([]);
  const [invites, setInvites] = useState<ClientInvite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showInviteLinkModal, setShowInviteLinkModal] = useState<ClientInvite | null>(null);

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [clientData, matchesData, appsData, usersData, invitesData] = await Promise.all([
        clientsApi.getById(id!),
        matchesApi.getAll({ client_id: id }),
        applicationsApi.getAll({ client_id: id }),
        clientsApi.getUsers(id!),
        invitesApi.getForClient(id!),
      ]);
      setClient(clientData);
      setMatches(matchesData);
      setApplications(appsData);
      setClientUsers(usersData);
      setInvites(invitesData);
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

  const handleResendInvite = async (inviteId: string) => {
    try {
      const updated = await invitesApi.resend(inviteId);
      toast.success('Invite resent');
      setInvites((prev) => prev.map((i) => (i.id === inviteId ? updated : i)));
    } catch (error) {
      toast.error('Failed to resend invite');
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    if (!confirm('Cancel this invite?')) return;
    try {
      await invitesApi.delete(inviteId);
      toast.success('Invite cancelled');
      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
    } catch (error) {
      toast.error('Failed to cancel invite');
    }
  };

  const copyInviteLink = (invite: ClientInvite) => {
    const link = `${window.location.origin}/accept-invite?token=${invite.token}`;
    navigator.clipboard.writeText(link);
    toast.success('Invite link copied!');
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
                onClick={() => setShowInviteModal(true)}
                className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1"
              >
                <EnvelopeIcon className="w-4 h-4" />
                Invite
              </button>
            </div>
            <div className="p-4 space-y-4">
              {/* Active Users */}
              {clientUsers.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase mb-2">Active Users</p>
                  <div className="space-y-2">
                    {clientUsers.map((cu) => (
                      <div
                        key={cu.user_id}
                        className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {cu.name || cu.email}
                          </p>
                          <p className="text-xs text-gray-500">{cu.email}</p>
                          {cu.client_role && (
                            <span className="text-xs text-green-600">{cu.client_role}</span>
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
                </div>
              )}

              {/* Pending Invites */}
              {invites.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase mb-2">Pending Invites</p>
                  <div className="space-y-2">
                    {invites.map((invite) => (
                      <div
                        key={invite.id}
                        className={`p-3 rounded-lg border ${
                          invite.is_expired
                            ? 'bg-red-50 border-red-100'
                            : 'bg-amber-50 border-amber-100'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {invite.name || invite.email}
                            </p>
                            <p className="text-xs text-gray-500">{invite.email}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              {invite.is_expired ? (
                                <span className="text-red-600">Expired</span>
                              ) : (
                                <>Invited {formatDistanceToNow(new Date(invite.created_at), { addSuffix: true })}</>
                              )}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => copyInviteLink(invite)}
                              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white rounded"
                              title="Copy invite link"
                            >
                              <ClipboardDocumentIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleResendInvite(invite.id)}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-white rounded"
                              title="Resend invite"
                            >
                              <ArrowPathIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleCancelInvite(invite.id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-white rounded"
                              title="Cancel invite"
                            >
                              <XMarkIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {clientUsers.length === 0 && invites.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  No portal users yet. Invite someone to give them access.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && client && (
        <InviteUserModal
          clientId={client.id}
          clientName={client.name}
          onClose={() => setShowInviteModal(false)}
          onSuccess={(newInvite) => {
            setShowInviteModal(false);
            setInvites((prev) => [newInvite, ...prev]);
            setShowInviteLinkModal(newInvite);
          }}
        />
      )}

      {/* Invite Link Modal */}
      {showInviteLinkModal && (
        <InviteLinkModal
          invite={showInviteLinkModal}
          onClose={() => setShowInviteLinkModal(null)}
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

function InviteUserModal({
  clientId,
  clientName,
  onClose,
  onSuccess,
}: {
  clientId: string;
  clientName: string;
  onClose: () => void;
  onSuccess: (invite: ClientInvite) => void;
}) {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    client_role: 'viewer',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email) {
      toast.error('Email is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const newInvite = await invitesApi.create(clientId, formData);
      toast.success('Invite sent!');
      onSuccess(newInvite);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to send invite');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Invite Portal User</h2>
        <p className="text-sm text-gray-500 mb-6">
          Send an invite to give someone access to <strong>{clientName}</strong>'s portal.
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
              placeholder="Contact name (optional)"
            />
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

          <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-700">
            <p>The user will receive an email with a link to set their password.</p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              <EnvelopeIcon className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Sending...' : 'Send Invite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function InviteLinkModal({
  invite,
  onClose,
}: {
  invite: ClientInvite;
  onClose: () => void;
}) {
  const inviteLink = `${window.location.origin}/accept-invite?token=${invite.token}`;
  
  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    toast.success('Link copied!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <EnvelopeIcon className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Invite Sent!</h2>
          <p className="text-sm text-gray-500 mt-2">
            An invitation has been sent to <strong>{invite.email}</strong>
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <p className="text-xs text-gray-500 mb-2">Or share this link directly:</p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inviteLink}
              readOnly
              className="input text-sm flex-1"
            />
            <button onClick={copyLink} className="btn-primary shrink-0">
              <ClipboardDocumentIcon className="w-4 h-4 mr-2" />
              Copy
            </button>
          </div>
        </div>

        <p className="text-xs text-gray-400 text-center mb-4">
          This invite expires in 7 days.
        </p>

        <div className="flex justify-center">
          <button onClick={onClose} className="btn-secondary">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
