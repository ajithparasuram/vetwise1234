/**
 * PatientSearch — professional veterinary patient & client search.
 *
 * Searches by: Patient ID, Client ID, animal name, breed, species,
 * client name, phone, microchip.
 * Shows patient results in a table (desktop) / cards (mobile),
 * and client results with associated pets.
 * Privacy is enforced by the backend — doctor sees only authorized records.
 */

import { useState } from 'react';
import {
  Search, X, PawPrint, MapPin, Phone, ArrowUpRight, Loader2,
  AlertTriangle, RotateCw, Users, Hash, User, ScanLine,
} from 'lucide-react';
import { SPECIES_LIST } from '@/lib/demo-data';
import { searchPatientsAndClients, type SearchResult, type ClientSearchResult } from '@/lib/queries';

interface PatientSearchProps {
  role: 'doctor' | 'admin';
  onSelectPatient: (patientId: string) => void;
}

export function PatientSearch({ role, onSelectPatient }: PatientSearchProps) {
  const [query, setQuery] = useState('');
  const [speciesFilter, setSpeciesFilter] = useState('');
  const [patients, setPatients] = useState<SearchResult[] | null>(null);
  const [clients, setClients] = useState<ClientSearchResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const performSearch = async () => {
    if (loading) return;
    setLoading(true);
    setSearched(true);
    setError(null);
    setPatients(null);
    setClients(null);

    const { data, error: err } = await searchPatientsAndClients(query, speciesFilter);
    setLoading(false);
    if (err || !data) {
      setError(err ?? 'The server did not return results.');
      return;
    }
    setPatients(data.patients);
    setClients(data.clients);
  };

  const handleClear = () => {
    setQuery('');
    setSpeciesFilter('');
    setPatients(null);
    setClients(null);
    setSearched(false);
    setError(null);
  };

  const totalResults = (patients?.length ?? 0) + (clients?.length ?? 0);
  const showInitial = !searched && !loading;

  return (
    <div className="patient-search-container">
      <div className="search-page-header">
        <h1>Patient Search</h1>
        <p>Find patients, clients, breeds, and medical records.</p>
      </div>

      <div className="search-toolbar">
        <div className="searchbar">
          <Search size={18} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && performSearch()}
            placeholder="Search by patient ID, client ID, pet name, breed, microchip, or phone..."
          />
          {query && <button onClick={() => setQuery('')}><X size={15} /></button>}
        </div>
        <select value={speciesFilter} onChange={(e) => setSpeciesFilter(e.target.value)}>
          <option value="">All Species</option>
          {SPECIES_LIST.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button className="primary" onClick={performSearch} disabled={loading}>
          {loading ? <Loader2 size={16} className="spin" /> : <Search size={16} />}
          Search
        </button>
        <button className="clear-btn" onClick={handleClear} disabled={loading}>
          Clear
        </button>
      </div>

      <div className="search-meta">
        <small>
          {role === 'doctor'
            ? 'You will only see patients you are authorized to access.'
            : 'Admin access: all patient records are visible.'}
        </small>
      </div>

      {showInitial && (
        <div className="search-intro">
          <Search size={40} />
          <h3>Search Your Patient Records</h3>
          <p>Use the search bar above to find patients and clients across your veterinary practice. You can search by any of the following criteria:</p>
          <div className="search-criteria-grid">
            <div className="search-criteria-item"><Hash size={14} /> Patient ID</div>
            <div className="search-criteria-item"><Hash size={14} /> Client ID</div>
            <div className="search-criteria-item"><PawPrint size={14} /> Animal Name</div>
            <div className="search-criteria-item"><PawPrint size={14} /> Breed</div>
            <div className="search-criteria-item"><PawPrint size={14} /> Species</div>
            <div className="search-criteria-item"><User size={14} /> Client Name</div>
            <div className="search-criteria-item"><Phone size={14} /> Phone Number</div>
            <div className="search-criteria-item"><ScanLine size={14} /> Microchip</div>
          </div>
        </div>
      )}

      {searched && (
        <div className="search-results">
          {loading ? (
            <div className="search-loading"><Loader2 size={24} className="spin" /><p>Searching...</p></div>
          ) : error ? (
            <div className="empty-state">
              <AlertTriangle size={32} />
              <h3>Search failed</h3>
              <p>{error}</p>
              <button className="primary" onClick={performSearch}><RotateCw size={16} /> Retry</button>
            </div>
          ) : totalResults === 0 ? (
            <div className="empty-state">
              <PawPrint size={36} />
              <h3>No patients found</h3>
              <p>Try a different search term, check the spelling, or try searching by Patient ID or Client ID.</p>
            </div>
          ) : (
            <>
              {clients && clients.length > 0 && (
                <>
                  <div className="results-count">{clients.length} client{clients.length !== 1 ? 's' : ''} found</div>
                  {clients.map((c) => (
                    <ClientResultCard key={c.clientId} client={c} onSelectPatient={onSelectPatient} />
                  ))}
                </>
              )}
              {patients && patients.length > 0 && (
                <>
                  <div className="results-count">{patients.length} patient{patients.length !== 1 ? 's' : ''} found</div>
                  <div className="search-results-table">
                    <div className="table-head">
                      <span>PET NAME</span>
                      <span>SPECIES</span>
                      <span>BREED</span>
                      <span>SEX</span>
                      <span>CLIENT</span>
                      <span>PATIENT ID</span>
                      <span></span>
                    </div>
                    {patients.map((r) => (
                      <button
                        key={r.patientId}
                        className="table-row"
                        onClick={() => onSelectPatient(r.patientId)}
                        style={{ cursor: 'pointer', textAlign: 'left', width: '100%', border: '0', borderBottom: '1px solid #eef1f5', background: 'transparent' }}
                      >
                        <div><strong>{r.name}</strong></div>
                        <div><em className={`tag ${r.species.toLowerCase()}`}>{r.species === 'Other' ? r.customSpecies ?? 'Other' : r.species}</em></div>
                        <div><span>{r.breed ?? '—'}</span></div>
                        <div><span>{r.sex ?? '—'}</span></div>
                        <div>
                          <strong style={{ fontSize: '12px' }}>{r.clientName || '—'}</strong>
                          {r.phone && <small style={{ display: 'block', fontSize: '10px', color: '#8290a5' }}><Phone size={9} /> {r.phone}</small>}
                        </div>
                        <div><span className="pid-small">{r.patientId}</span></div>
                        <div><span className="open-link">Open <ArrowUpRight size={11} /></span></div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ClientResultCard({
  client,
  onSelectPatient,
}: {
  client: ClientSearchResult;
  onSelectPatient: (patientId: string) => void;
}) {
  return (
    <div className="client-result-card">
      <div className="client-result-header">
        <div className="pet-icon large" style={{ background: '#eef2ff', color: '#1c438b' }}>
          <Users size={20} />
        </div>
        <div className="client-result-info">
          <strong>{client.clientName || 'Unknown Client'}</strong>
          <small>
            <span className="cid-small" style={{ marginRight: '8px' }}>{client.clientId}</span>
            {client.phone && <><Phone size={10} /> {client.phone}{' · '}</>}
            {client.city && <><MapPin size={10} /> {client.city}{client.state ? `, ${client.state}` : ''}</>}
          </small>
        </div>
        <span className={`status ${client.status.toLowerCase()}`}>{client.status.toUpperCase()}</span>
      </div>
      <p className="client-pets-label">ASSOCIATED PETS ({client.pets.length})</p>
      <div className="client-pet-list">
        {client.pets.map((pet) => (
          <button
            key={pet.patientId}
            className="table-row"
            onClick={() => onSelectPatient(pet.patientId)}
            style={{ cursor: 'pointer', textAlign: 'left', width: '100%', border: '1px solid #eef1f5', borderRadius: '6px', background: '#fafffe' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="pet-icon" style={{ width: '28px', height: '28px' }}><PawPrint size={14} /></div>
              <div style={{ flex: '1' }}>
                <strong style={{ fontSize: '13px' }}>{pet.name}</strong>
                <small style={{ marginLeft: '6px', fontSize: '11px', color: '#8290a5' }}>
                  <em className={`tag ${pet.species.toLowerCase()}`}>{pet.species === 'Other' ? pet.customSpecies ?? 'Other' : pet.species}</em>
                  {pet.breed && ` · ${pet.breed}`}
                  {pet.sex && ` · ${pet.sex}`}
                </small>
              </div>
              <span className="pid-small">{pet.patientId}</span>
              <span className="open-link">Open <ArrowUpRight size={11} /></span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
