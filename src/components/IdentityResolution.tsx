/**
 * IdentityResolution — Animal Identity Resolution & Clinical History
 * Reconciliation module.
 *
 * Views:
 * 1. Identity Overview — pending reviews, conflicts, resolved cases
 * 2. Potential Matches — review queue of candidate pairs
 * 3. Identity Comparison — side-by-side evidence comparison
 * 4. Clinical History Reconciliation — source-aware event timeline
 * 5. Merge Review — controlled merge workflow
 * 6. Resolution History — past decisions and reversal
 *
 * The system NEVER automatically merges animal identities.
 * All resolutions require human review and explicit confirmation.
 */

import { useState } from 'react';
import {
  Activity, AlertCircle, AlertTriangle, ArrowLeft, ArrowRight, Check, ChevronRight,
  Clock, Copy, Eye, FileText, GitBranch, GitMerge, History, Info,
  Minus, PawPrint, Search, Shield, ShieldCheck, Stethoscope, User, X,
} from 'lucide-react';
import type { Role } from '@/lib/api';
import {
  type IdentityCandidate, type EvidenceItem, type ClinicalHistoryEvent,
  type ResolutionDecision, type MergeProposal, type IdentityStatus,
  type ReviewPriority, type FieldAgreement, type EventRelationType,
  MOCK_CANDIDATES, MOCK_EVIDENCE, MOCK_CLINICAL_EVENTS,
  MOCK_RESOLUTIONS, MOCK_MERGE_PROPOSALS,
  canAccessIdentityResolution, canReviewIdentityCases, canApproveMerges, canEscalateCases,
  IDENTITY_STATUS_LABELS, IDENTITY_STATUS_COLORS,
  REVIEW_PRIORITY_LABELS, MATCH_CONFIDENCE_LABELS,
  EVIDENCE_CATEGORY_LABELS, EVENT_TYPE_LABELS, EVENT_RELATION_LABELS,
  DECISION_TYPE_LABELS,
} from '@/lib/identity-resolution';

type View = 'overview' | 'matches' | 'comparison' | 'reconciliation' | 'merge' | 'history';

interface IdentityResolutionProps {
  role: Role;
}

export function IdentityResolution({ role }: IdentityResolutionProps) {
  const [view, setView] = useState<View>('overview');
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<IdentityCandidate[]>(MOCK_CANDIDATES);
  const [resolutions, setResolutions] = useState<ResolutionDecision[]>(MOCK_RESOLUTIONS);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | IdentityStatus>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | ReviewPriority>('all');

  if (!canAccessIdentityResolution(role)) {
    return <PermissionDenied />;
  }

  const selectedCandidate = candidates.find((c) => c.candidateId === selectedCandidateId) ?? null;
  const selectedEvidence = selectedCandidateId ? MOCK_EVIDENCE[selectedCandidateId] ?? [] : [];
  const selectedEvents = selectedCandidateId ? MOCK_CLINICAL_EVENTS[selectedCandidateId] ?? [] : [];
  const selectedMergeProposal = selectedCandidateId ? MOCK_MERGE_PROPOSALS[selectedCandidateId] ?? null : null;

  const handleDecision = (candidateId: string, decisionType: ResolutionDecision['decisionType'], reason: string) => {
    const newResolution: ResolutionDecision = {
      resolutionId: `RES-${resolutions.length + 1}`,
      candidateId,
      decisionType,
      reviewerId: role === 'admin' ? 'admin@vetwise.com' : 'dr.anita@vetwise.com',
      reviewerRole: role,
      timestamp: new Date().toISOString(),
      reason,
      evidenceReviewed: (MOCK_EVIDENCE[candidateId] ?? []).map((e) => e.evidenceId),
      affectedProfiles: candidates.find((c) => c.candidateId === candidateId)
        ? [candidates.find((c) => c.candidateId === candidateId)!.profileA.profileId,
           candidates.find((c) => c.candidateId === candidateId)!.profileB.profileId]
        : [],
      backendOperationId: null,
      status: 'prototype',
      notes: 'Frontend prototype — backend merge/reversal support required.',
    };
    setResolutions([...resolutions, newResolution]);
    setCandidates(candidates.map((c) =>
      c.candidateId === candidateId
        ? { ...c, reviewStatus: 'resolved', matchStatus: decisionType === 'confirm_different_animals' ? 'confirmed_different' : c.matchStatus }
        : c,
    ));
  };

  const navigateToComparison = (candidateId: string) => {
    setSelectedCandidateId(candidateId);
    setView('comparison');
  };

  return (
    <div className="ir-module">
      <div className="ir-tabs">
        <button className={view === 'overview' ? 'active' : ''} onClick={() => setView('overview')}>
          <Activity size={15} /> Overview
        </button>
        <button className={view === 'matches' ? 'active' : ''} onClick={() => setView('matches')}>
          <Copy size={15} /> Potential Matches
          {candidates.filter((c) => c.reviewStatus === 'unreviewed').length > 0 && (
            <b className="nav-badge">{candidates.filter((c) => c.reviewStatus === 'unreviewed').length}</b>
          )}
        </button>
        {selectedCandidate && (
          <>
            <button className={view === 'comparison' ? 'active' : ''} onClick={() => setView('comparison')}>
              <Eye size={15} /> Comparison
            </button>
            <button className={view === 'reconciliation' ? 'active' : ''} onClick={() => setView('reconciliation')}>
              <GitBranch size={15} /> Clinical Reconciliation
            </button>
            <button className={view === 'merge' ? 'active' : ''} onClick={() => setView('merge')}>
              <GitMerge size={15} /> Merge Review
            </button>
          </>
        )}
        <button className={view === 'history' ? 'active' : ''} onClick={() => setView('history')}>
          <History size={15} /> Resolution History
        </button>
      </div>

      <div className="ir-prototype-notice">
        <Info size={14} />
        <span>Prototype module — uses isolated mock fixtures. Backend identity-match, merge, and audit endpoints are required for production use.</span>
      </div>

      {view === 'overview' && (
        <IdentityOverview
          candidates={candidates}
          resolutions={resolutions}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          priorityFilter={priorityFilter}
          setPriorityFilter={setPriorityFilter}
          onSelectCandidate={navigateToComparison}
        />
      )}

      {view === 'matches' && (
        <PotentialMatches
          candidates={candidates}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          priorityFilter={priorityFilter}
          setPriorityFilter={setPriorityFilter}
          onSelectCandidate={navigateToComparison}
        />
      )}

      {view === 'comparison' && selectedCandidate && (
        <>
          <button className="ir-back-btn" onClick={() => setView('matches')}>
            <ArrowLeft size={15} /> Back to matches
          </button>
          <IdentityComparison candidate={selectedCandidate} evidence={selectedEvidence} />
          <ResolutionActions
            candidate={selectedCandidate}
            role={role}
            onDecision={handleDecision}
          />
          <button className="ir-next-view-btn" onClick={() => setView('reconciliation')}>
            View Clinical History Reconciliation <ArrowRight size={15} />
          </button>
        </>
      )}

      {view === 'reconciliation' && selectedCandidate && (
        <>
          <button className="ir-back-btn" onClick={() => setView('comparison')}>
            <ArrowLeft size={15} /> Back to comparison
          </button>
          <ClinicalHistoryReconciliation candidate={selectedCandidate} events={selectedEvents} />
          <button className="ir-next-view-btn" onClick={() => setView('merge')}>
            Proceed to Merge Review <ArrowRight size={15} />
          </button>
        </>
      )}

      {view === 'merge' && selectedCandidate && (
        <>
          <button className="ir-back-btn" onClick={() => setView('reconciliation')}>
            <ArrowLeft size={15} /> Back to reconciliation
          </button>
          <MergeReview
            candidate={selectedCandidate}
            mergeProposal={selectedMergeProposal}
            role={role}
            onDecision={handleDecision}
          />
        </>
      )}

      {view === 'history' && (
        <ResolutionHistoryView resolutions={resolutions} candidates={candidates} />
      )}
    </div>
  );
}

// ─── Permission Denied ───────────────────────────────────────────

function PermissionDenied() {
  return (
    <div className="empty-state">
      <Shield size={36} />
      <h3>Access restricted</h3>
      <p>Animal Identity Integrity is available to administrators and veterinarians only.</p>
    </div>
  );
}

// ─── View 1: Identity Overview ───────────────────────────────────

function IdentityOverview({
  candidates, resolutions, searchQuery, setSearchQuery, statusFilter, setStatusFilter,
  priorityFilter, setPriorityFilter, onSelectCandidate,
}: {
  candidates: IdentityCandidate[];
  resolutions: ResolutionDecision[];
  searchQuery: string;
  setSearchQuery: (s: string) => void;
  statusFilter: 'all' | IdentityStatus;
  setStatusFilter: (s: 'all' | IdentityStatus) => void;
  priorityFilter: 'all' | ReviewPriority;
  setPriorityFilter: (p: 'all' | ReviewPriority) => void;
  onSelectCandidate: (id: string) => void;
}) {
  const pending = candidates.filter((c) => c.reviewStatus === 'unreviewed');
  const highPriority = candidates.filter((c) => c.reviewPriority === 'high' && c.reviewStatus !== 'resolved');
  const conflicts = candidates.filter((c) => c.hasConflicts && c.reviewStatus !== 'resolved');
  const approvedMerges = candidates.filter((c) => c.matchStatus === 'approved_merge');
  const recentlyResolved = resolutions.slice(-3).reverse();

  const filtered = candidates.filter((c) => {
    const q = searchQuery.toLowerCase();
    const matchesQuery = !q ||
      c.profileA.animalName.toLowerCase().includes(q) ||
      c.profileB.animalName.toLowerCase().includes(q) ||
      c.profileA.profileId.toLowerCase().includes(q) ||
      c.profileB.profileId.toLowerCase().includes(q) ||
      c.profileA.ownerName.toLowerCase().includes(q) ||
      c.profileB.ownerName.toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'all' || c.matchStatus === statusFilter;
    const matchesPriority = priorityFilter === 'all' || c.reviewPriority === priorityFilter;
    return matchesQuery && matchesStatus && matchesPriority;
  });

  return (
    <>
      <div className="stats-row four">
        <div className="stat"><strong>{pending.length}</strong><span>Pending Reviews</span></div>
        <div className="stat red"><strong>{highPriority.length}</strong><span>High Priority</span></div>
        <div className="stat orange"><strong>{conflicts.length}</strong><span>Conflicts</span></div>
        <div className="stat green"><strong>{approvedMerges.length}</strong><span>Approved Merges</span></div>
      </div>

      <div className="panel">
        <div className="panel-title">
          <h3>Recently Resolved</h3>
        </div>
        {recentlyResolved.length === 0 ? (
          <p className="ir-empty-text">No resolutions recorded yet.</p>
        ) : (
          recentlyResolved.map((r) => {
            const cand = candidates.find((c) => c.candidateId === r.candidateId);
            return (
              <div key={r.resolutionId} className="ir-resolution-row">
                <div className="ir-resolution-icon">
                  {r.decisionType === 'merge_approved' ? <GitMerge size={16} /> :
                   r.decisionType === 'escalate_conflict' ? <AlertTriangle size={16} /> :
                   <Check size={16} />}
                </div>
                <div className="ir-resolution-info">
                  <strong>{DECISION_TYPE_LABELS[r.decisionType]}</strong>
                  <small>{cand ? `${cand.profileA.animalName} / ${cand.profileB.animalName}` : r.candidateId}</small>
                  <small>{new Date(r.timestamp).toLocaleString()} — {r.reviewerRole}</small>
                </div>
                <span className={`status ${r.status === 'backend_confirmed' ? 'paid' : r.status === 'prototype' ? 'pending' : 'overdue'}`}>
                  {r.status === 'backend_confirmed' ? 'CONFIRMED' : r.status === 'prototype' ? 'PROTOTYPE' : r.status.toUpperCase()}
                </span>
              </div>
            );
          })
        )}
      </div>

      <div className="panel">
        <div className="panel-title">
          <h3>All Identity Cases</h3>
        </div>
        <div className="filter-row">
          <div className="searchbar" style={{ flex: 1 }}>
            <Search size={17} />
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by animal name, profile ID, or owner..." />
            {searchQuery && <button onClick={() => setSearchQuery('')}><X size={14} /></button>}
          </div>
          <select className="ir-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | IdentityStatus)}>
            <option value="all">All Statuses</option>
            <option value="possible_duplicate">Possible Duplicate</option>
            <option value="conflicting_evidence">Conflicting Evidence</option>
            <option value="pending_review">Pending Review</option>
            <option value="approved_merge">Approved Merge</option>
            <option value="confirmed_different">Confirmed Different</option>
          </select>
          <select className="ir-select" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as 'all' | ReviewPriority)}>
            <option value="all">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="ir-empty">
            <Search size={24} />
            <p>No identity cases match your search.</p>
          </div>
        ) : (
          <div className="ir-candidate-list">
            {filtered.map((c) => (
              <CandidateCard key={c.candidateId} candidate={c} onClick={() => onSelectCandidate(c.candidateId)} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ─── View 2: Potential Matches ───────────────────────────────────

function PotentialMatches({
  candidates, searchQuery, setSearchQuery, priorityFilter, setPriorityFilter, onSelectCandidate,
}: {
  candidates: IdentityCandidate[];
  searchQuery: string;
  setSearchQuery: (s: string) => void;
  priorityFilter: 'all' | ReviewPriority;
  setPriorityFilter: (p: 'all' | ReviewPriority) => void;
  onSelectCandidate: (id: string) => void;
}) {
  const filtered = candidates.filter((c) => {
    const q = searchQuery.toLowerCase();
    const matchesQuery = !q ||
      c.profileA.animalName.toLowerCase().includes(q) ||
      c.profileB.animalName.toLowerCase().includes(q) ||
      c.profileA.ownerName.toLowerCase().includes(q) ||
      c.profileB.ownerName.toLowerCase().includes(q);
    const matchesPriority = priorityFilter === 'all' || c.reviewPriority === priorityFilter;
    return matchesQuery && matchesPriority;
  });

  return (
    <div className="panel">
      <div className="panel-title">
        <h3>Potential Identity Matches</h3>
        <small>{filtered.length} candidates</small>
      </div>
      <div className="filter-row">
        <div className="searchbar" style={{ flex: 1 }}>
          <Search size={17} />
          <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by animal name or owner..." />
          {searchQuery && <button onClick={() => setSearchQuery('')}><X size={14} /></button>}
        </div>
        <select className="ir-select" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as 'all' | ReviewPriority)}>
          <option value="all">All Priorities</option>
          <option value="high">High Priority</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="ir-empty">
          <Check size={24} />
          <p>No pending identity matches. The review queue is empty.</p>
        </div>
      ) : (
        <div className="ir-candidate-list">
          {filtered.map((c) => (
            <CandidateCard key={c.candidateId} candidate={c} onClick={() => onSelectCandidate(c.candidateId)} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Candidate Card (shared) ─────────────────────────────────────

function CandidateCard({ candidate, onClick }: { candidate: IdentityCandidate; onClick: () => void }) {
  return (
    <button className="ir-candidate-card" onClick={onClick}>
      <div className="ir-candidate-pair">
        <div className="ir-profile-mini">
          <div className="pet-icon"><PawPrint size={16} /></div>
          <div>
            <strong>{candidate.profileA.animalName}</strong>
            <small>{candidate.profileA.species} · {candidate.profileA.breed ?? 'Unknown'}</small>
            <span className="pid-small">{candidate.profileA.profileId}</span>
          </div>
        </div>
        <div className="ir-vs">vs</div>
        <div className="ir-profile-mini">
          <div className="pet-icon"><PawPrint size={16} /></div>
          <div>
            <strong>{candidate.profileB.animalName}</strong>
            <small>{candidate.profileB.species} · {candidate.profileB.breed ?? 'Unknown'}</small>
            <span className="pid-small">{candidate.profileB.profileId}</span>
          </div>
        </div>
      </div>
      <div className="ir-candidate-meta">
        <span className={`status ${IDENTITY_STATUS_COLORS[candidate.matchStatus]}`}>
          {IDENTITY_STATUS_LABELS[candidate.matchStatus].toUpperCase()}
        </span>
        <span className={`ir-priority ir-priority-${candidate.reviewPriority}`}>
          {REVIEW_PRIORITY_LABELS[candidate.reviewPriority]} Priority
        </span>
        {candidate.hasConflicts && (
          <span className="ir-conflict-badge"><AlertCircle size={11} /> Conflicts</span>
        )}
        <span className="ir-confidence">
          Confidence: <strong>{MATCH_CONFIDENCE_LABELS[candidate.matchConfidence]}</strong>
        </span>
        <small className="ir-last-updated">Updated: {candidate.lastUpdated}</small>
      </div>
      <ChevronRight size={18} className="ir-chevron" />
    </button>
  );
}

// ─── View 3: Identity Comparison ─────────────────────────────────

function IdentityComparison({ candidate, evidence }: { candidate: IdentityCandidate; evidence: EvidenceItem[] }) {
  const agreeCount = evidence.filter((e) => e.agreement === 'agree').length;
  const conflictCount = evidence.filter((e) => e.agreement === 'conflict').length;
  const missingCount = evidence.filter((e) => e.agreement.startsWith('missing')).length;

  return (
    <div className="ir-comparison">
      <div className="ir-comparison-header">
        <h3><Eye size={16} /> Identity Comparison</h3>
        <div className="ir-comparison-summary">
          <span className="ir-agree"><Check size={13} /> {agreeCount} agree</span>
          <span className="ir-conflict"><X size={13} /> {conflictCount} conflict</span>
          <span className="ir-missing"><Minus size={13} /> {missingCount} missing</span>
        </div>
      </div>

      <div className="ir-profile-headers">
        <div className="ir-profile-header">
          <div className="pet-icon"><PawPrint size={18} /></div>
          <div>
            <strong>{candidate.profileA.animalName}</strong>
            <small>{candidate.profileA.profileId}</small>
            <small>{candidate.profileA.facilityName}</small>
            <span className={`ir-verification ${candidate.profileA.verificationStatus}`}>
              {candidate.profileA.verificationStatus}
            </span>
          </div>
        </div>
        <div className="ir-profile-header">
          <div className="pet-icon"><PawPrint size={18} /></div>
          <div>
            <strong>{candidate.profileB.animalName}</strong>
            <small>{candidate.profileB.profileId}</small>
            <small>{candidate.profileB.facilityName}</small>
            <span className={`ir-verification ${candidate.profileB.verificationStatus}`}>
              {candidate.profileB.verificationStatus}
            </span>
          </div>
        </div>
      </div>

      <div className="ir-evidence-section">
        <div className="ir-section-title"><Shield size={14} /> Identity Evidence</div>

        {candidate.matchConfidence !== 'unknown' && (
          <div className="ir-confidence-note">
            <Info size={14} />
            <div>
              <strong>Match Confidence: {MATCH_CONFIDENCE_LABELS[candidate.matchConfidence]}</strong>
              <p>{candidate.matchConfidenceNote}</p>
            </div>
          </div>
        )}

        <div className="ir-evidence-table">
          <div className="ir-evidence-head">
            <span>Field</span>
            <span>Profile A</span>
            <span>Profile B</span>
            <span>Status</span>
            <span>Verification</span>
          </div>
          {evidence.map((ev) => (
            <div key={ev.evidenceId} className="ir-evidence-row">
              <div className="ir-evidence-field">
                <strong>{ev.fieldLabel}</strong>
                <small>{EVIDENCE_CATEGORY_LABELS[ev.category]}</small>
              </div>
              <div className={`ir-evidence-value ${ev.agreement === 'missing_a' ? 'missing' : ''}`}>
                {ev.valueA ?? <em>Not provided</em>}
                {ev.timestampA && <small>{ev.timestampA}</small>}
              </div>
              <div className={`ir-evidence-value ${ev.agreement === 'missing_b' ? 'missing' : ''}`}>
                {ev.valueB ?? <em>Not provided</em>}
                {ev.timestampB && <small>{ev.timestampB}</small>}
              </div>
              <div className="ir-evidence-agreement">
                <AgreementBadge agreement={ev.agreement} />
              </div>
              <div className="ir-evidence-verification">
                <span className={`ir-verification-mini ${ev.verificationStatusA}`}>A: {ev.verificationStatusA}</span>
                <span className={`ir-verification-mini ${ev.verificationStatusB}`}>B: {ev.verificationStatusB}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="ir-evidence-significance">
          <Info size={14} />
          <p>Missing evidence is labelled "Not provided" and is NOT treated as a match. A matching owner or phone number does NOT independently establish that two animal records belong to the same animal.</p>
        </div>
      </div>
    </div>
  );
}

function AgreementBadge({ agreement }: { agreement: FieldAgreement }) {
  if (agreement === 'agree') return <span className="ir-agree-badge"><Check size={11} /> Agree</span>;
  if (agreement === 'conflict') return <span className="ir-conflict-badge"><X size={11} /> Conflict</span>;
  if (agreement === 'missing_both') return <span className="ir-missing-badge"><Minus size={11} /> Both Missing</span>;
  return <span className="ir-missing-badge"><Minus size={11} /> Missing</span>;
}

// ─── View 4: Clinical History Reconciliation ─────────────────────

function ClinicalHistoryReconciliation({ candidate, events }: { candidate: IdentityCandidate; events: ClinicalHistoryEvent[] }) {
  const sorted = [...events].sort((a, b) => b.eventDate.localeCompare(a.eventDate));
  const uniqueEvents = sorted.filter((e) => e.relationType === 'unique_event');
  const possibleDupes = sorted.filter((e) => e.relationType === 'possible_duplicate');
  const conflicting = sorted.filter((e) => e.relationType === 'conflicting_event');
  const uncertain = sorted.filter((e) => e.relationType === 'uncertain_attribution');

  return (
    <div className="ir-reconciliation">
      <div className="ir-recon-header">
        <h3><GitBranch size={16} /> Clinical History Reconciliation</h3>
        <small>{events.length} events from both profiles</small>
      </div>

      <div className="ir-recon-summary">
        <span className="ir-recon-stat"><Check size={13} /> {uniqueEvents.length} unique</span>
        <span className="ir-recon-stat"><Copy size={13} /> {possibleDupes.length} possible duplicates</span>
        <span className="ir-recon-stat"><X size={13} /> {conflicting.length} conflicting</span>
        <span className="ir-recon-stat"><AlertCircle size={13} /> {uncertain.length} uncertain</span>
      </div>

      <div className="ir-recon-notice">
        <AlertTriangle size={14} />
        <p>Events are NOT automatically deduplicated. Conflicting prescriptions, diagnoses, or treatment instructions are preserved as separate records. Each event retains its original source and record reference.</p>
      </div>

      {sorted.length === 0 ? (
        <div className="ir-empty"><FileText size={24} /><p>No clinical events available for comparison.</p></div>
      ) : (
        <div className="ir-recon-timeline">
          {sorted.map((event) => (
            <div key={event.eventId} className={`ir-recon-event ir-relation-${event.relationType}`}>
              <div className="ir-recon-event-dot">
                <EventIcon eventType={event.eventType} />
              </div>
              <div className="ir-recon-event-content">
                <div className="ir-recon-event-head">
                  <strong>{event.title}</strong>
                  <small>{event.eventDate}</small>
                </div>
                <p>{event.description}</p>
                <div className="ir-recon-event-meta">
                  <span><FileText size={11} /> {EVENT_TYPE_LABELS[event.eventType]}</span>
                  <span className={`ir-profile-tag ${event.profileId === candidate.profileA.profileId ? 'a' : 'b'}`}>
                    {event.profileId === candidate.profileA.profileId ? 'Profile A' : 'Profile B'}
                  </span>
                  <span>{event.sourceFacility}</span>
                  {event.authorOrClinician && <span><Stethoscope size={11} /> {event.authorOrClinician}</span>}
                  <span>Ref: {event.sourceRecordRef}</span>
                  {event.revisionId && <span>Rev: {event.revisionId}</span>}
                  <span className={`ir-verification-mini ${event.verificationStatus}`}>{event.verificationStatus}</span>
                </div>
                <div className="ir-relation-badge">
                  <RelationBadge relationType={event.relationType} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="ir-relationship-section">
        <div className="ir-section-title"><GitBranch size={14} /> Relationship View</div>
        <div className="ir-relationship-diagram">
          <div className="ir-rel-row">
            <div className="ir-rel-node animal"><PawPrint size={14} /> <span>Animal Profile</span></div>
            <div className="ir-rel-edge">→</div>
            <div className="ir-rel-node owner"><User size={14} /> <span>Owner</span></div>
            <div className="ir-rel-edge">→</div>
            <div className="ir-rel-node event"><FileText size={14} /> <span>Clinical Event</span></div>
          </div>
          <div className="ir-rel-row">
            <div className="ir-rel-node facility"><Activity size={14} /> <span>Source Facility</span></div>
            <div className="ir-rel-edge">→</div>
            <div className="ir-rel-node record"><FileText size={14} /> <span>Source Record</span></div>
            <div className="ir-rel-edge">→</div>
            <div className="ir-rel-node revision"><History size={14} /> <span>Revision</span></div>
          </div>
          <p className="ir-rel-hint">Each clinical event traces back to a source facility, source record, and revision. This provenance chain helps reviewers determine if two events are duplicates or legitimately separate.</p>
        </div>
      </div>
    </div>
  );
}

function EventIcon({ eventType }: { eventType: ClinicalHistoryEvent['eventType'] }) {
  switch (eventType) {
    case 'vaccination': return <ShieldCheck size={14} />;
    case 'prescription': return <FileText size={14} />;
    case 'diagnosis': return <AlertCircle size={14} />;
    case 'examination': return <Stethoscope size={14} />;
    case 'appointment': return <Clock size={14} />;
    case 'weight_record': return <Activity size={14} />;
    case 'lab_result': return <FileText size={14} />;
    case 'clinical_document': return <FileText size={14} />;
  }
}

function RelationBadge({ relationType }: { relationType: EventRelationType }) {
  const labels = EVENT_RELATION_LABELS;
  const classes: Record<EventRelationType, string> = {
    unique_event: 'unique',
    possible_duplicate: 'duplicate',
    corrected_version: 'corrected',
    conflicting_event: 'conflict',
    uncertain_attribution: 'uncertain',
  };
  return <span className={`ir-relation-tag ${classes[relationType]}`}>{labels[relationType]}</span>;
}

// ─── View 5: Merge Review ────────────────────────────────────────

function MergeReview({
  candidate, mergeProposal, role, onDecision,
}: {
  candidate: IdentityCandidate;
  mergeProposal: MergeProposal | null;
  role: Role;
  onDecision: (candidateId: string, decisionType: ResolutionDecision['decisionType'], reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const canMerge = canApproveMerges(role);

  if (!mergeProposal) {
    return (
      <div className="ir-merge-panel">
        <div className="ir-section-title"><GitMerge size={16} /> Merge Review</div>
        <div className="ir-empty">
          <Info size={24} />
          <p>No merge proposal available for this candidate. This may be because the evidence does not support a merge, or because the backend merge engine has not generated a proposal.</p>
        </div>
        <div className="ir-merge-actions">
          <button className="primary" onClick={() => onDecision(candidate.candidateId, 'confirm_different_animals', 'No merge proposal — records kept separate.')}>
            <Check size={15} /> Keep Profiles Separate
          </button>
          <button className="secondary" onClick={() => onDecision(candidate.candidateId, 'insufficient_evidence', 'Insufficient evidence for merge — requesting further verification.')}>
            Request Further Verification
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ir-merge-panel">
      <div className="ir-merge-header">
        <h3><GitMerge size={16} /> Merge Review</h3>
        <span className={`status ${candidate.matchStatus === 'approved_merge' ? 'paid' : 'pending'}`}>
          {IDENTITY_STATUS_LABELS[candidate.matchStatus].toUpperCase()}
        </span>
      </div>

      <div className="ir-merge-warning">
        <AlertTriangle size={16} />
        <div>
          <strong>Merge requires backend support</strong>
          <p>This is a controlled merge workflow. The final commit requires an authorized, validated backend merge operation. The frontend does NOT silently rewrite clinical data.</p>
        </div>
      </div>

      <div className="ir-merge-canonical">
        <div className="ir-section-title"><PawPrint size={14} /> Proposed Canonical Profile</div>
        <div className="ir-canonical-card">
          <div className="pet-icon"><PawPrint size={18} /></div>
          <div>
            <strong>{mergeProposal.canonicalProfileId}</strong>
            <small>Merged profile: {mergeProposal.mergedProfileId}</small>
          </div>
        </div>
      </div>

      <div className="ir-merge-fields">
        <div className="ir-section-title"><FileText size={14} /> Field Proposals</div>
        <div className="ir-merge-field-table">
          <div className="ir-merge-field-head">
            <span>Field</span>
            <span>Profile A</span>
            <span>Profile B</span>
            <span>Canonical</span>
            <span>Source</span>
          </div>
          {mergeProposal.fieldProposals.map((fp) => (
            <div key={fp.fieldName} className={`ir-merge-field-row ${fp.hasConflict ? 'conflict' : ''}`}>
              <div><strong>{fp.fieldLabel}</strong></div>
              <div>{fp.valueA ?? <em>—</em>}</div>
              <div>{fp.valueB ?? <em>—</em>}</div>
              <div className="ir-canonical-value">{fp.proposedCanonicalValue}</div>
              <div><span className="ir-source-tag">{fp.source}</span></div>
            </div>
          ))}
        </div>
      </div>

      <div className="ir-merge-impact">
        <div className="ir-section-title"><Activity size={14} /> Impact Summary</div>
        <div className="ir-impact-stats">
          <div className="ir-impact-stat">
            <strong>{mergeProposal.affectedEventCount}</strong>
            <span>Affected Clinical Events</span>
          </div>
          <div className="ir-impact-stat">
            <strong>{mergeProposal.unresolvedItems.length}</strong>
            <span>Unresolved Items</span>
          </div>
        </div>
        {mergeProposal.unresolvedItems.length > 0 && (
          <div className="ir-unresolved">
            <AlertCircle size={14} />
            <ul>
              {mergeProposal.unresolvedItems.map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          </div>
        )}
      </div>

      <div className="ir-merge-confirmation">
        <label className="toggle-row">
          <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
          <span>I have reviewed all evidence, conflicting fields, and affected clinical events. I understand this merge will combine two animal identity records.</span>
        </label>
      </div>

      <div className="ir-merge-reason">
        <label>Reason for merge decision <span className="req">*</span></label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Explain the clinical and evidence-based reason for this merge decision..."
          rows={3}
        />
      </div>

      <div className="ir-merge-actions">
        <button
          className="primary"
          disabled={!canMerge || !confirmed || !reason.trim()}
          onClick={() => onDecision(candidate.candidateId, 'merge_approved', reason)}
        >
          <GitMerge size={15} /> Approve Merge
        </button>
        <button className="secondary" onClick={() => onDecision(candidate.candidateId, 'confirm_different_animals', reason || 'Records confirmed as different animals.')}>
          <X size={15} /> Confirm Different
        </button>
        <button className="secondary" onClick={() => onDecision(candidate.candidateId, 'escalate_conflict', reason || 'Escalating to senior reviewer.')}>
          <AlertTriangle size={15} /> Escalate
        </button>
      </div>

      {!canMerge && (
        <p className="ir-permission-note">
          <Shield size={13} /> Only administrators can approve merges. You can review the evidence and escalate.
        </p>
      )}
    </div>
  );
}

// ─── View 6: Resolution History ──────────────────────────────────

function ResolutionHistoryView({
  resolutions, candidates,
}: {
  resolutions: ResolutionDecision[];
  candidates: IdentityCandidate[];
}) {
  if (resolutions.length === 0) {
    return (
      <div className="panel">
        <div className="panel-title"><h3>Resolution History</h3></div>
        <div className="ir-empty"><History size={24} /><p>No resolution decisions recorded yet.</p></div>
      </div>
    );
  }

  return (
    <div className="ir-history">
      <div className="ir-history-header">
        <h3><History size={16} /> Resolution History</h3>
        <small>{resolutions.length} decisions</small>
      </div>

      <div className="ir-history-list">
        {resolutions.map((r) => {
          const cand = candidates.find((c) => c.candidateId === r.candidateId);
          return (
            <div key={r.resolutionId} className="ir-history-card">
              <div className="ir-history-card-head">
                <div className="ir-resolution-icon">
                  {r.decisionType === 'merge_approved' ? <GitMerge size={16} /> :
                   r.decisionType === 'escalate_conflict' ? <AlertTriangle size={16} /> :
                   r.decisionType === 'confirm_different_animals' ? <X size={16} /> :
                   <Check size={16} />}
                </div>
                <div className="ir-history-card-info">
                  <strong>{DECISION_TYPE_LABELS[r.decisionType]}</strong>
                  <small>Resolution ID: {r.resolutionId}</small>
                  {cand && <small>{cand.profileA.animalName} / {cand.profileB.animalName}</small>}
                </div>
                <span className={`status ${r.status === 'backend_confirmed' ? 'paid' : r.status === 'prototype' ? 'pending' : 'overdue'}`}>
                  {r.status === 'backend_confirmed' ? 'CONFIRMED' : r.status === 'prototype' ? 'PROTOTYPE' : r.status.toUpperCase()}
                </span>
              </div>

              <div className="ir-history-detail">
                <div><label>REVIEWER</label><strong>{r.reviewerId}</strong><small>{r.reviewerRole}</small></div>
                <div><label>TIMESTAMP</label><strong>{new Date(r.timestamp).toLocaleString()}</strong></div>
                <div><label>AFFECTED PROFILES</label><strong>{r.affectedProfiles.join(', ')}</strong></div>
                {r.backendOperationId && <div><label>BACKEND OP</label><strong className="pid-text">{r.backendOperationId}</strong></div>}
              </div>

              <div className="ir-history-reason">
                <label>REASON</label>
                <p>{r.reason}</p>
              </div>

              {r.evidenceReviewed.length > 0 && (
                <div className="ir-history-evidence">
                  <label>EVIDENCE REVIEWED</label>
                  <div className="ir-evidence-tags">
                    {r.evidenceReviewed.map((eid) => <span key={eid} className="ir-evidence-tag">{eid}</span>)}
                  </div>
                </div>
              )}

              {r.notes && <div className="ir-history-notes"><Info size={13} /> {r.notes}</div>}

              {r.status === 'backend_confirmed' && (
                <div className="ir-history-reversal">
                  <div className="ir-reversal-notice">
                    <AlertTriangle size={14} />
                    <p>Reversal of this merge requires backend support. Reversal does NOT erase shared data from external systems. It preserves audit history and identifies downstream records requiring correction.</p>
                  </div>
                  <button className="danger-btn" disabled>
                    <History size={14} /> Request Reversal (requires backend)
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Resolution Actions (on comparison page) ─────────────────────

function ResolutionActions({
  candidate, role, onDecision,
}: {
  candidate: IdentityCandidate;
  role: Role;
  onDecision: (candidateId: string, decisionType: ResolutionDecision['decisionType'], reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  const canReview = canReviewIdentityCases(role, true);
  const canMerge = canApproveMerges(role);
  const canEscalate = canEscalateCases(role);

  if (candidate.reviewStatus === 'resolved') {
    return (
      <div className="ir-resolution-actions resolved">
        <div className="ir-resolved-notice">
          <Check size={16} />
          <span>This case has been resolved. View the decision in Resolution History.</span>
        </div>
      </div>
    );
  }

  if (!canReview) {
    return (
      <div className="ir-resolution-actions">
        <div className="ir-permission-note">
          <Shield size={14} />
          <span>You do not have permission to review identity cases. Only approved veterinarians and administrators can submit resolution decisions.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="ir-resolution-actions">
      <div className="ir-section-title"><Shield size={14} /> Resolution Decision</div>
      <div className="ir-merge-reason">
        <label>Reason for decision</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Explain your decision based on the evidence reviewed..."
          rows={2}
        />
      </div>
      <div className="ir-action-buttons">
        <button className="primary" onClick={() => onDecision(candidate.candidateId, 'confirm_same_animal', reason || 'Evidence supports same animal identity.')}>
          <Check size={15} /> Confirm Same
        </button>
        <button className="secondary" onClick={() => onDecision(candidate.candidateId, 'confirm_different_animals', reason || 'Evidence indicates different animals.')}>
          <X size={15} /> Confirm Different
        </button>
        <button className="secondary" onClick={() => onDecision(candidate.candidateId, 'insufficient_evidence', reason || 'Insufficient evidence to determine identity.')}>
          <AlertCircle size={15} /> Insufficient Evidence
        </button>
        {canEscalate && (
          <button className="secondary" onClick={() => onDecision(candidate.candidateId, 'escalate_conflict', reason || 'Escalating conflict to senior reviewer.')}>
            <AlertTriangle size={15} /> Escalate
          </button>
        )}
        {canMerge && (
          <button className="primary" onClick={() => onDecision(candidate.candidateId, 'merge_approved', reason || 'Merge approved after evidence review.')}>
            <GitMerge size={15} /> Approve Merge
          </button>
        )}
      </div>
      <p className="ir-action-note">
        <Info size={13} /> Merge operations require backend validation. Frontend submissions are prototype decisions and do NOT modify clinical data.
      </p>
    </div>
  );
}
