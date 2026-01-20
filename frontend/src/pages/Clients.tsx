import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { clientsApi } from '../services/api';
import type { Client } from '../types';
import { PlusIcon, MagnifyingGlassIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      const data = await clientsApi.getAll(params);
      setClients(data);
    } catch (error) {
      console.error('Failed to load clients:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadClients();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Clients</h1>
          <p className="text-gray-600 mt-1">Manage client organizations</p>
        </div>
        <Link to="/clients/new" className="btn-primary">
          <PlusIcon className="w-5 h-5 mr-2" />
          Add Client
        </Link>
      </div>

      {/* Search */}
      <div className="card p-4">
        <form onSubmit={handleSearch}>
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search clients..."
              className="input pl-10"
            />
          </div>
        </form>
      </div>

      {/* Clients Grid */}
      <div>
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
          </div>
        ) : clients.length === 0 ? (
          <div className="card text-center py-12">
            <UserGroupIcon className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No clients found</h3>
            <p className="text-gray-500 mb-4">Get started by adding your first client.</p>
            <Link to="/clients/new" className="btn-primary">
              <PlusIcon className="w-5 h-5 mr-2" />
              Add Client
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clients.map((client) => (
              <Link
                key={client.id}
                to={`/clients/${client.id}`}
                className="card p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-secondary-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-secondary-700 font-semibold text-lg">
                      {client.name[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{client.name}</h3>
                    {client.entity_type && (
                      <p className="text-sm text-gray-500">{client.entity_type}</p>
                    )}
                  </div>
                </div>

                {(client.causes.length > 0 || client.provinces.length > 0) && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    {client.causes.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {client.causes.slice(0, 3).map((cause) => (
                          <span key={cause.id} className="badge-info text-xs">
                            {cause.name}
                          </span>
                        ))}
                        {client.causes.length > 3 && (
                          <span className="badge-gray text-xs">+{client.causes.length - 3}</span>
                        )}
                      </div>
                    )}
                    {client.provinces.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {client.provinces.map((p) => (
                          <span key={p.id} className="badge-gray text-xs">
                            {p.code}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-4 text-xs text-gray-400">
                  Updated {format(new Date(client.updated_at), 'MMM d, yyyy')}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
