/**
 * PractitionerOnboarding — Doctor Registration, KYC & E-Signature System
 *
 * Practitioner views:
 * 1. Registration form
 * 2. Document upload
 * 3. Verification status dashboard
 * 4. KYC launch & progress
 * 5. Agreement review & signing
 * 6. Activation confirmation
 *
 * Admin views:
 * 7. Onboarding dashboard (pending queue, stats)
 * 8. Practitioner detail (documents, KYC, agreement, audit)
 * 9. Approve / reject / request-documents / suspend controls
 * 10. Audit log
 *
 * The system NEVER auto-activates. All transitions require server validation.
 * KYC and e-signature use sandbox mode with clearly labelled warnings.
 */

import { useState } from 'react';
import {
  AlertCircle, AlertTriangle, ArrowLeft, ArrowRight, BadgeCheck, Ban,
  Check, ChevronRight, Clock, Download, Eye, FileCheck, FileText,
  GraduationCap, Info, Loader2, Mail, Search, Shield,
  ShieldCheck, Stethoscope, Upload, User, X,
} from 'lucide-react';
import type { Role } from '@/lib/api';
import {
  type Practitioner, type OnboardingAuditLog, type OnboardingStatus,
  type OnboardingStage,
  MOCK_PRACTITIONERS, MOCK_DOCUMENTS, MOCK_KYC, MOCK_AGREEMENTS,
  MOCK_AUDIT_LOGS,
  ONBOARDING_STATUS_LABELS, ONBOARDING_STATUS_COLORS,
  STAGE_LABELS, STATUS_TO_STAGE, KYC_STATUS_LABELS, KYC_STATUS_COLORS,
  AGREEMENT_STATUS_LABELS, AGREEMENT_STATUS_COLORS,
  DOCUMENT_TYPE_LABELS, AUDIT_EVENT_LABELS,
  INDIAN_STATES, VETERINARY_COUNCILS, PRACTITIONER_AGREEMENT_TEXT,
  canApproveProfessionalVerification, canSuspendPractitioner,
  canViewAllPractitioners,
  getActivationRequirements,
} from '@/lib/practitioner-onboarding';

type View = 'dashboard' | 'register' | 'documents' | 'status' | 'kyc' | 'agreement' | 'activation'
  | 'admin_queue' | 'admin_detail' | 'admin_audit';

interface PractitionerOnboardingProps {
  role: Role;
}

export function PractitionerOnboarding({ role }: PractitionerOnboardingProps) {
  const [view, setView] = useState<View>('dashboard');
  const [practitioners, setPractitioners] = useState<Practitioner[]>(MOCK_PRACTITIONERS);
  const [selectedPracId, setSelectedPracId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | OnboardingStatus>('all');

  // Current practitioner (for doctor self-service)
  const currentPrac = practitioners[0] ?? null;

  const adminAccess = canViewAllPractitioners(role);

  const handleRegistration = (data: Partial<Practitioner>) => {
    const newPrac: Practitioner = {
      practitionerId: `PRAC-${practitioners.length + 1}`,
      userId: `usr-${practitioners.length + 1}`,
      legalName: data.legalName ?? '',
      email: data.email ?? '',
      phone: data.phone ?? '',
      country: 'India',
      state: data.state ?? '',
      veterinaryCouncil: data.veterinaryCouncil ?? '',
      registrationNumber: data.registrationNumber ?? '',
      qualification: data.qualification ?? '',
      yearOfQualification: data.yearOfQualification ?? null,
      professionalStatus: 'professional_verification_pending',
      onboardingStatus: 'professional_verification_pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      activatedAt: null,
      duplicateRegistrationWarning: practitioners.some((p) => p.registrationNumber === data.registrationNumber),
      privacyNoticeAcknowledged: true,
    };
    setPractitioners([newPrac, ...practitioners]);
    setView('status');
  };

  const handleAdminAction = (pracId: string, newStatus: OnboardingStatus) => {
    setPractitioners(practitioners.map((p) =>
      p.practitionerId === pracId
        ? { ...p, onboardingStatus: newStatus, professionalStatus: newStatus, updatedAt: new Date().toISOString() }
        : p,
    ));
  };

  const handleAdminActionWithReason = (pracId: string, newStatus: OnboardingStatus) => handleAdminAction(pracId, newStatus);

  const navigateToDetail = (pracId: string) => {
    setSelectedPracId(pracId);
    setView('admin_detail');
  };

  return (
    <div className="po-module">
      <div className="po-prototype-notice">
        <Info size={14} />
        <span>Prototype module — uses isolated mock fixtures. KYC and e-signature are in sandbox mode. Backend verification, KYC provider, and signing provider credentials are required for production.</span>
      </div>

      {!adminAccess && currentPrac && (
        <PractitionerNav view={view} setView={setView} currentPrac={currentPrac} />
      )}

      {adminAccess && (
        <AdminNav view={view} setView={setView} practitioners={practitioners} />
      )}

      {!adminAccess && view === 'dashboard' && currentPrac && (
        <PractitionerDashboard prac={currentPrac} setView={setView} />
      )}
      {!adminAccess && view === 'register' && (
        <RegistrationForm onSubmit={handleRegistration} />
      )}
      {!adminAccess && view === 'documents' && currentPrac && (
        <DocumentUpload prac={currentPrac} />
      )}
      {!adminAccess && view === 'status' && currentPrac && (
        <VerificationStatus prac={currentPrac} setView={setView} />
      )}
      {!adminAccess && view === 'kyc' && currentPrac && (
        <KycVerificationView prac={currentPrac} />
      )}
      {!adminAccess && view === 'agreement' && currentPrac && (
        <AgreementSigningView prac={currentPrac} />
      )}
      {!adminAccess && view === 'activation' && currentPrac && (
        <ActivationView prac={currentPrac} />
      )}

      {adminAccess && view === 'dashboard' && (
        <AdminDashboard
          practitioners={practitioners}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          onSelectPrac={navigateToDetail}
        />
      )}
      {adminAccess && view === 'admin_queue' && (
        <AdminQueue
          practitioners={practitioners}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onSelectPrac={navigateToDetail}
        />
      )}
      {adminAccess && view === 'admin_detail' && selectedPracId && (
        <>
          <button className="po-back-btn" onClick={() => setView('admin_queue')}>
            <ArrowLeft size={15} /> Back to queue
          </button>
          <AdminPractitionerDetail
            prac={practitioners.find((p) => p.practitionerId === selectedPracId)!}
            role={role}
            onAction={handleAdminActionWithReason}
          />
        </>
      )}
      {adminAccess && view === 'admin_audit' && (
        <AdminAuditView logs={MOCK_AUDIT_LOGS} practitioners={practitioners} />
      )}
    </div>
  );
}

// ─── Practitioner Navigation ─────────────────────────────────────

function PractitionerNav({ view, setView, currentPrac }: { view: View; setView: (v: View) => void; currentPrac: Practitioner }) {
  const tabs: { v: View; label: string; show: boolean }[] = [
    { v: 'dashboard', label: 'Dashboard', show: true },
    { v: 'status', label: 'Verification Status', show: true },
    { v: 'documents', label: 'Documents', show: true },
    { v: 'kyc', label: 'KYC', show: currentPrac.onboardingStatus !== 'professional_verification_pending' && currentPrac.onboardingStatus !== 'registered' },
    { v: 'agreement', label: 'Agreement', show: ['agreement_pending', 'signature_in_progress', 'activation_pending', 'active'].includes(currentPrac.onboardingStatus) },
    { v: 'activation', label: 'Activation', show: currentPrac.onboardingStatus === 'active' },
  ];

  return (
    <div className="po-tabs">
      {tabs.filter((t) => t.show).map((t) => (
        <button key={t.v} className={view === t.v ? 'active' : ''} onClick={() => setView(t.v)}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ─── Admin Navigation ────────────────────────────────────────────

function AdminNav({ view, setView, practitioners }: { view: View; setView: (v: View) => void; practitioners: Practitioner[] }) {
  const pending = practitioners.filter((p) => p.onboardingStatus === 'professional_verification_pending').length;
  const kycReview = practitioners.filter((p) => p.onboardingStatus === 'kyc_manual_review').length;

  return (
    <div className="po-tabs">
      <button className={view === 'dashboard' ? 'active' : ''} onClick={() => setView('dashboard')}>Dashboard</button>
      <button className={view === 'admin_queue' ? 'active' : ''} onClick={() => setView('admin_queue')}>
        Pending Queue {pending > 0 && <b className="nav-badge">{pending}</b>}
      </button>
      {kycReview > 0 && (
        <button className={view === 'admin_detail' ? 'active' : ''} onClick={() => setView('admin_queue')}>
          KYC Review {kycReview > 0 && <b className="nav-badge">{kycReview}</b>}
        </button>
      )}
      <button className={view === 'admin_audit' ? 'active' : ''} onClick={() => setView('admin_audit')}>Audit Log</button>
    </div>
  );
}

// ─── Practitioner Dashboard ──────────────────────────────────────

function PractitionerDashboard({ prac, setView }: { prac: Practitioner; setView: (v: View) => void }) {
  const stage = STATUS_TO_STAGE[prac.onboardingStatus];
  const stages: OnboardingStage[] = ['registration', 'professional_verification', 'kyc_invitation', 'kyc_verification', 'agreement_signing', 'activation', 'complete'];
  const currentIdx = stages.indexOf(stage);

  return (
    <>
      <div className="po-welcome">
        <div className="pet-icon"><Stethoscope size={20} /></div>
        <div>
          <h3>Welcome, {prac.legalName}</h3>
          <p>Your onboarding status: <strong>{ONBOARDING_STATUS_LABELS[prac.onboardingStatus]}</strong></p>
        </div>
      </div>

      <div className="po-progress-section">
        <div className="po-progress-steps">
          {stages.map((s, i) => (
            <div key={s} className={`po-progress-step ${i < currentIdx ? 'done' : i === currentIdx ? 'current' : 'pending'}`}>
              <div className="po-step-dot">
                {i < currentIdx ? <Check size={14} /> : i === currentIdx ? <Loader2 size={14} className="spin" /> : i + 1}
              </div>
              <span>{STAGE_LABELS[s]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="po-action-cards">
        {prac.onboardingStatus === 'professional_verification_pending' && (
          <div className="po-action-card pending">
            <Clock size={20} />
            <h4>Professional Verification Pending</h4>
            <p>Your veterinary registration is under review by the VetWise team. You will receive an email once approved.</p>
          </div>
        )}
        {prac.onboardingStatus === 'additional_documents_required' && (
          <div className="po-action-card overdue">
            <AlertCircle size={20} />
            <h4>Additional Documents Required</h4>
            <p>The reviewer has requested additional documents. Please upload them to continue.</p>
            <button className="primary" onClick={() => setView('documents')}>
              <Upload size={15} /> Upload Documents
            </button>
          </div>
        )}
        {prac.onboardingStatus === 'kyc_invited' && (
          <div className="po-action-card">
            <Mail size={20} />
            <h4>KYC Invitation Sent</h4>
            <p>Complete your identity verification to proceed.</p>
            <button className="primary" onClick={() => setView('kyc')}>
              <Shield size={15} /> Start KYC
            </button>
          </div>
        )}
        {prac.onboardingStatus === 'kyc_in_progress' && (
          <div className="po-action-card pending">
            <Loader2 size={20} className="spin" />
            <h4>KYC In Progress</h4>
            <p>Your identity verification is being processed by the KYC provider.</p>
            <button className="secondary" onClick={() => setView('kyc')}>
              <Eye size={15} /> View Status
            </button>
          </div>
        )}
        {prac.onboardingStatus === 'kyc_manual_review' && (
          <div className="po-action-card overdue">
            <AlertTriangle size={20} />
            <h4>KYC Manual Review Required</h4>
            <p>Your identity verification requires manual review by the VetWise team. Please wait for further communication.</p>
          </div>
        )}
        {prac.onboardingStatus === 'agreement_pending' && (
          <div className="po-action-card">
            <FileText size={20} />
            <h4>Agreement Pending Signature</h4>
            <p>Please review and sign the VetWise Practitioner Agreement to complete your onboarding.</p>
            <button className="primary" onClick={() => setView('agreement')}>
              <FileCheck size={15} /> Review & Sign
            </button>
          </div>
        )}
        {prac.onboardingStatus === 'active' && (
          <div className="po-action-card paid">
            <BadgeCheck size={20} />
            <h4>Onboarding Complete</h4>
            <p>Your account is active. You can now access the VetWise practitioner workspace.</p>
            <button className="primary" onClick={() => setView('activation')}>
              <Check size={15} /> View Activation
            </button>
          </div>
        )}
        {prac.onboardingStatus === 'suspended' && (
          <div className="po-action-card overdue">
            <Ban size={20} />
            <h4>Account Suspended</h4>
            <p>Your account has been suspended. Please contact VetWise support for more information.</p>
          </div>
        )}
        {prac.onboardingStatus === 'professional_verification_rejected' && (
          <div className="po-action-card overdue">
            <X size={20} />
            <h4>Professional Verification Rejected</h4>
            <p>Your veterinary registration verification was not approved. Please contact VetWise support.</p>
          </div>
        )}
      </div>

      <div className="po-info-section">
        <div className="po-section-title"><Info size={14} /> Activation Requirements</div>
        <div className="po-req-list">
          {getActivationRequirements().map((req, i) => {
            const met = i < currentIdx;
            return (
              <div key={i} className={`po-req-item ${met ? 'met' : 'unmet'}`}>
                {met ? <Check size={15} /> : <Clock size={15} />}
                <div>
                  <strong>{req.requirement}</strong>
                  <p>{req.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ─── Registration Form ───────────────────────────────────────────

function RegistrationForm({ onSubmit }: { onSubmit: (data: Partial<Practitioner>) => void }) {
  const [form, setForm] = useState({
    legalName: '', email: '', phone: '', state: '', veterinaryCouncil: '',
    registrationNumber: '', qualification: '', yearOfQualification: '',
    privacyAcknowledged: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.legalName.trim()) e.legalName = 'Full legal name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Valid email is required';
    if (!form.phone.trim()) e.phone = 'Mobile number is required';
    if (!form.state) e.state = 'State is required';
    if (!form.veterinaryCouncil) e.veterinaryCouncil = 'Veterinary council is required';
    if (!form.registrationNumber.trim()) e.registrationNumber = 'Registration number is required';
    if (!form.qualification.trim()) e.qualification = 'Qualification is required';
    if (!form.privacyAcknowledged) e.privacyAcknowledged = 'You must acknowledge the privacy notice';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) onSubmit(form);
  };

  return (
    <div className="po-form-panel">
      <div className="po-form-header">
        <h3><GraduationCap size={16} /> Practitioner Registration</h3>
        <p>Complete the form below to begin the VetWise onboarding process. Your account will be created with restricted permissions until all verification steps are complete.</p>
      </div>

      <div className="po-form-grid">
        <div className="po-field">
          <label>Full Legal Name <span className="req">*</span></label>
          <input value={form.legalName} onChange={(e) => setForm({ ...form, legalName: e.target.value })} placeholder="Dr. Your Full Name" />
          {errors.legalName && <small className="po-error">{errors.legalName}</small>}
        </div>
        <div className="po-field">
          <label>Email Address <span className="req">*</span></label>
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" />
          {errors.email && <small className="po-error">{errors.email}</small>}
        </div>
        <div className="po-field">
          <label>Mobile Number <span className="req">*</span></label>
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 98765 43210" />
          {errors.phone && <small className="po-error">{errors.phone}</small>}
        </div>
        <div className="po-field">
          <label>State <span className="req">*</span></label>
          <select value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })}>
            <option value="">Select state</option>
            {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          {errors.state && <small className="po-error">{errors.state}</small>}
        </div>
        <div className="po-field">
          <label>Veterinary Council / Registration Authority <span className="req">*</span></label>
          <select value={form.veterinaryCouncil} onChange={(e) => setForm({ ...form, veterinaryCouncil: e.target.value })}>
            <option value="">Select council</option>
            {VETERINARY_COUNCILS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          {errors.veterinaryCouncil && <small className="po-error">{errors.veterinaryCouncil}</small>}
        </div>
        <div className="po-field">
          <label>Veterinary Registration Number <span className="req">*</span></label>
          <input value={form.registrationNumber} onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })} placeholder="e.g. MAH-VC-2018-1234" />
          {errors.registrationNumber && <small className="po-error">{errors.registrationNumber}</small>}
        </div>
        <div className="po-field">
          <label>Qualification <span className="req">*</span></label>
          <input value={form.qualification} onChange={(e) => setForm({ ...form, qualification: e.target.value })} placeholder="e.g. BVSc & AH" />
          {errors.qualification && <small className="po-error">{errors.qualification}</small>}
        </div>
        <div className="po-field">
          <label>Year of Qualification</label>
          <input value={form.yearOfQualification} onChange={(e) => setForm({ ...form, yearOfQualification: e.target.value })} placeholder="e.g. 2018" />
        </div>
      </div>

      <div className="po-upload-section">
        <div className="po-section-title"><Upload size={14} /> Registration Certificate</div>
        <div className="po-upload-area">
          <Upload size={24} />
          <p>Drag and drop your veterinary registration certificate here, or click to browse</p>
          <small>PDF, JPG, PNG up to 10 MB. File will be stored in private encrypted storage.</small>
        </div>
      </div>

      <label className="po-checkbox-row">
        <input type="checkbox" checked={form.privacyAcknowledged} onChange={(e) => setForm({ ...form, privacyAcknowledged: e.target.checked })} />
        <span>I acknowledge that my personal and professional information will be processed in accordance with the VetWise Privacy Notice. I consent to identity verification and professional registration checks.</span>
      </label>
      {errors.privacyAcknowledged && <small className="po-error">{errors.privacyAcknowledged}</small>}

      <div className="po-form-actions">
        <button className="primary" onClick={handleSubmit}>
          <Check size={15} /> Submit Registration
        </button>
      </div>

      <div className="po-form-notice">
        <Info size={13} />
        <p>After registration, your account will have restricted permissions. You will not be able to access clinical, prescription, patient-record, or hospital-management features until onboarding is complete.</p>
      </div>
    </div>
  );
}

// ─── Document Upload ─────────────────────────────────────────────

function DocumentUpload({ prac }: { prac: Practitioner }) {
  const docs = MOCK_DOCUMENTS[prac.practitionerId] ?? [];

  return (
    <div className="po-docs-panel">
      <div className="po-section-title"><Upload size={16} /> Document Upload</div>

      <div className="po-upload-area large">
        <Upload size={28} />
        <p>Upload your veterinary registration certificate and supporting documents</p>
        <small>PDF, JPG, PNG up to 10 MB. Files are stored in private encrypted storage with access logging.</small>
      </div>

      <div className="po-doc-types">
        <div className="po-section-title"><FileText size={14} /> Document Types</div>
        {Object.entries(DOCUMENT_TYPE_LABELS).map(([key, label]) => (
          <div key={key} className="po-doc-type-row">
            <FileText size={14} />
            <span>{label}</span>
          </div>
        ))}
      </div>

      {docs.length > 0 && (
        <div className="po-doc-list">
          <div className="po-section-title"><FileCheck size={14} /> Uploaded Documents</div>
          {docs.map((doc) => (
            <div key={doc.documentId} className="po-doc-row">
              <div className="po-doc-icon"><FileText size={16} /></div>
              <div className="po-doc-info">
                <strong>{doc.fileName}</strong>
                <small>{DOCUMENT_TYPE_LABELS[doc.documentType]} · {(doc.fileSize / 1024).toFixed(0)} KB · Uploaded {doc.uploadedAt.split('T')[0]}</small>
              </div>
              <span className={`status ${doc.reviewStatus === 'approved' ? 'paid' : doc.reviewStatus === 'rejected' ? 'overdue' : doc.reviewStatus === 'additional_requested' ? 'overdue' : 'pending'}`}>
                {doc.reviewStatus.replace(/_/g, ' ').toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      )}

      {prac.onboardingStatus === 'additional_documents_required' && (
        <div className="po-additional-request">
          <AlertCircle size={16} />
          <div>
            <strong>Additional documents requested</strong>
            <p>The reviewer has requested additional or corrected documents. Please upload them above. The reviewer's notes:</p>
            <em>{docs.find((d) => d.reviewStatus === 'additional_requested')?.reviewNotes ?? 'Please re-upload a clear copy of your registration certificate.'}</em>
          </div>
        </div>
      )}

      <div className="po-doc-security">
        <ShieldCheck size={14} />
        <p>Documents are stored in private, encrypted storage. No public access. Short-lived signed URLs are used for reviewer access. Access is logged and audited.</p>
      </div>
    </div>
  );
}

// ─── Verification Status ─────────────────────────────────────────

function VerificationStatus({ prac, setView }: { prac: Practitioner; setView: (v: View) => void }) {
  return (
    <div className="po-status-panel">
      <div className="po-status-header">
        <h3><Shield size={16} /> Verification Status</h3>
        <span className={`status ${ONBOARDING_STATUS_COLORS[prac.onboardingStatus]}`}>
          {ONBOARDING_STATUS_LABELS[prac.onboardingStatus].toUpperCase()}
        </span>
      </div>

      <div className="po-status-detail">
        <div className="po-status-row">
          <label>Practitioner ID</label>
          <strong>{prac.practitionerId}</strong>
        </div>
        <div className="po-status-row">
          <label>Legal Name</label>
          <strong>{prac.legalName}</strong>
        </div>
        <div className="po-status-row">
          <label>Email</label>
          <strong>{prac.email}</strong>
        </div>
        <div className="po-status-row">
          <label>Phone</label>
          <strong>{prac.phone}</strong>
        </div>
        <div className="po-status-row">
          <label>State</label>
          <strong>{prac.state}</strong>
        </div>
        <div className="po-status-row">
          <label>Veterinary Council</label>
          <strong>{prac.veterinaryCouncil}</strong>
        </div>
        <div className="po-status-row">
          <label>Registration Number</label>
          <strong>{prac.registrationNumber}</strong>
        </div>
        <div className="po-status-row">
          <label>Qualification</label>
          <strong>{prac.qualification}{prac.yearOfQualification ? ` (${prac.yearOfQualification})` : ''}</strong>
        </div>
        {prac.duplicateRegistrationWarning && (
          <div className="po-duplicate-warning">
            <AlertTriangle size={14} />
            <p>A duplicate registration number has been detected. The VetWise team will manually verify your registration before proceeding.</p>
          </div>
        )}
      </div>

      <div className="po-status-stages">
        <div className="po-section-title"><Clock size={14} /> Onboarding Progress</div>
        <div className="po-stage-list">
          {(['registration', 'professional_verification', 'kyc_invitation', 'kyc_verification', 'agreement_signing', 'activation', 'complete'] as OnboardingStage[]).map((s, i) => {
            const stage = STATUS_TO_STAGE[prac.onboardingStatus];
            const stages: OnboardingStage[] = ['registration', 'professional_verification', 'kyc_invitation', 'kyc_verification', 'agreement_signing', 'activation', 'complete'];
            const idx = stages.indexOf(stage);
            const state = i < idx ? 'done' : i === idx ? 'current' : 'pending';
            return (
              <div key={s} className={`po-stage-item ${state}`}>
                <div className="po-stage-dot">
                  {state === 'done' ? <Check size={14} /> : state === 'current' ? <Loader2 size={14} className="spin" /> : <span>{i + 1}</span>}
                </div>
                <div>
                  <strong>{STAGE_LABELS[s]}</strong>
                  {state === 'done' && <small>Completed</small>}
                  {state === 'current' && <small>In progress</small>}
                  {state === 'pending' && <small>Awaiting previous step</small>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {prac.onboardingStatus === 'professional_verification_pending' && (
        <div className="po-status-actions">
          <button className="secondary" onClick={() => setView('documents')}>
            <Upload size={15} /> Upload Documents
          </button>
        </div>
      )}
    </div>
  );
}

// ─── KYC Verification View ───────────────────────────────────────

function KycVerificationView({ prac }: { prac: Practitioner }) {
  const kyc = MOCK_KYC[prac.practitionerId];

  if (!kyc && prac.onboardingStatus === 'kyc_invited') {
    return (
      <div className="po-kyc-panel">
        <div className="po-section-title"><Shield size={16} /> Identity Verification (KYC)</div>
        <div className="po-kyc-launch">
          <Shield size={32} />
          <h4>Ready to Begin Identity Verification</h4>
          <p>You have been invited to complete KYC. Click below to start the identity verification process through our approved KYC provider.</p>
          <div className="po-kyc-sandbox-warning">
            <AlertTriangle size={14} />
            <span>Sandbox mode — no real KYC provider is configured. This is a prototype flow.</span>
          </div>
          <button className="primary">
            <Shield size={15} /> Start KYC Verification
          </button>
        </div>
      </div>
    );
  }

  if (!kyc) {
    return (
      <div className="po-kyc-panel">
        <div className="po-section-title"><Shield size={16} /> Identity Verification (KYC)</div>
        <div className="po-empty">
          <Shield size={24} />
          <p>KYC has not been initiated yet. You will receive an email invitation after your professional verification is approved.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="po-kyc-panel">
      <div className="po-kyc-header">
        <h3><Shield size={16} /> Identity Verification (KYC)</h3>
        <span className={`status ${KYC_STATUS_COLORS[kyc.status]}`}>
          {KYC_STATUS_LABELS[kyc.status].toUpperCase()}
        </span>
      </div>

      <div className="po-kyc-detail">
        <div className="po-status-row">
          <label>Verification ID</label>
          <strong>{kyc.verificationId}</strong>
        </div>
        <div className="po-status-row">
          <label>Provider</label>
          <strong>{kyc.provider ?? 'Not configured'}</strong>
        </div>
        <div className="po-status-row">
          <label>Verification Type</label>
          <strong>{kyc.verificationType}</strong>
        </div>
        <div className="po-status-row">
          <label>Provider Reference</label>
          <strong>{kyc.providerReference ?? 'Pending'}</strong>
        </div>
        {kyc.maskedIdentifier && (
          <div className="po-status-row">
            <label>Masked Identifier</label>
            <strong>{kyc.maskedIdentifier}</strong>
          </div>
        )}
        <div className="po-status-row">
          <label>Created</label>
          <strong>{kyc.createdAt.split('T')[0]}</strong>
        </div>
        {kyc.completedAt && (
          <div className="po-status-row">
            <label>Completed</label>
            <strong>{kyc.completedAt.split('T')[0]}</strong>
          </div>
        )}
      </div>

      <div className="po-kyc-checks">
        <div className="po-section-title"><FileCheck size={14} /> Checks Performed</div>
        {kyc.checksPerformed.map((check) => (
          <div key={check} className="po-check-row">
            <Check size={14} />
            <span>{check.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</span>
          </div>
        ))}
      </div>

      {kyc.resultSummary && (
        <div className="po-kyc-result">
          <label>Result Summary</label>
          <p>{kyc.resultSummary}</p>
        </div>
      )}

      {kyc.failureCode && (
        <div className="po-kyc-failure">
          <AlertCircle size={14} />
          <div>
            <strong>Failure Code: {kyc.failureCode}</strong>
            <p>{kyc.resultSummary}</p>
          </div>
        </div>
      )}

      {kyc.status === 'failed' && (
        <div className="po-kyc-actions">
          <button className="primary">
            <Shield size={15} /> Retry KYC
          </button>
        </div>
      )}

      {kyc.status === 'manual_review_required' && (
        <div className="po-kyc-manual-review">
          <AlertTriangle size={16} />
          <p>Your KYC requires manual review by the VetWise team. You will be contacted with further instructions. A failed check does not delete your account.</p>
        </div>
      )}

      <div className="po-kyc-privacy">
        <ShieldCheck size={14} />
        <p>Sensitive identifiers are masked in admin screens. Provider reference IDs and verification status are stored instead of full identity numbers. Aadhaar OTPs and authentication secrets are never stored.</p>
      </div>
    </div>
  );
}

// ─── Agreement Signing View ──────────────────────────────────────

function AgreementSigningView({ prac }: { prac: Practitioner }) {
  const agreement = MOCK_AGREEMENTS[prac.practitionerId];
  const [consentChecked, setConsentChecked] = useState(false);
  const [signingInitiated, setSigningInitiated] = useState(false);

  if (!agreement) {
    return (
      <div className="po-agreement-panel">
        <div className="po-section-title"><FileText size={16} /> Practitioner Agreement</div>
        <div className="po-empty">
          <FileText size={24} />
          <p>The agreement is not yet available. You will be able to review and sign it after KYC verification is complete.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="po-agreement-panel">
      <div className="po-agreement-header">
        <h3><FileText size={16} /> Practitioner Agreement</h3>
        <span className={`status ${AGREEMENT_STATUS_COLORS[agreement.status]}`}>
          {AGREEMENT_STATUS_LABELS[agreement.status].toUpperCase()}
        </span>
      </div>

      <div className="po-agreement-meta">
        <div><label>AGREEMENT TITLE</label><strong>{agreement.agreementType}</strong></div>
        <div><label>VERSION</label><strong>{agreement.agreementVersion}</strong></div>
        <div><label>HASH</label><strong className="pid-text">{agreement.agreementHash}</strong></div>
        <div><label>SIGNER</label><strong>{agreement.signerLegalName}</strong></div>
        {agreement.signedAt && <div><label>SIGNED AT</label><strong>{agreement.signedAt.split('T')[0]}</strong></div>}
        {agreement.effectiveAt && <div><label>EFFECTIVE FROM</label><strong>{agreement.effectiveAt.split('T')[0]}</strong></div>}
      </div>

      <div className="po-agreement-text">
        <pre>{PRACTITIONER_AGREEMENT_TEXT}</pre>
      </div>

      <div className="po-agreement-download">
        <button className="secondary">
          <Download size={15} /> Download Unsigned Agreement (PDF)
        </button>
      </div>

      {agreement.status === 'signed' ? (
        <div className="po-agreement-signed">
          <BadgeCheck size={20} />
          <div>
            <strong>Agreement Signed</strong>
            <p>This agreement was signed on {agreement.signedAt?.split('T')[0]} through {agreement.signingProvider ?? 'the configured signing provider'}.</p>
            {agreement.signingReference && <small>Reference: {agreement.signingReference}</small>}
          </div>
          <button className="secondary">
            <Download size={15} /> Download Signed Copy
          </button>
        </div>
      ) : (
        <>
          <div className="po-signing-sandbox-warning">
            <AlertTriangle size={14} />
            <span>Sandbox mode — no real e-signature provider is configured. This is a prototype flow. A typed name or uploaded image is NOT a verified digital signature.</span>
          </div>

          <label className="po-checkbox-row">
            <input type="checkbox" checked={consentChecked} onChange={(e) => setConsentChecked(e.target.checked)} />
            <span>I consent to use the selected electronic-signature method. I have read and understood the complete agreement text above. I understand this is a legally binding agreement under the Information Technology Act, 2000.</span>
          </label>

          <div className="po-agreement-actions">
            <button
              className="primary"
              disabled={!consentChecked || signingInitiated}
              onClick={() => setSigningInitiated(true)}
            >
              {signingInitiated ? <Loader2 size={15} className="spin" /> : <FileCheck size={15} />}
              {signingInitiated ? 'Initiating Signing Session...' : 'Initiate E-Signature'}
            </button>
          </div>

          {signingInitiated && (
            <div className="po-signing-status">
              <Info size={14} />
              <p>Signing session initiated. In production, you would be redirected to the signing provider's secure page. The signed PDF and audit certificate will be retrieved after completion.</p>
            </div>
          )}

          <div className="po-agreement-note">
            <Info size={13} />
            <p>Account creation, an email click, or a generic checkbox does NOT substitute for a properly implemented signing process. The final signing process and agreement should be reviewed by an Indian advocate.</p>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Activation View ─────────────────────────────────────────────

function ActivationView({ prac }: { prac: Practitioner }) {
  const reqs = getActivationRequirements();

  return (
    <div className="po-activation-panel">
      <div className="po-activation-header">
        <div className="po-activation-badge">
          <BadgeCheck size={32} />
        </div>
        <h3>Account Activated</h3>
        <p>Your VetWise practitioner account is now active.</p>
      </div>

      <div className="po-activation-detail">
        <div className="po-status-row">
          <label>Practitioner</label>
          <strong>{prac.legalName}</strong>
        </div>
        <div className="po-status-row">
          <label>Activated At</label>
          <strong>{prac.activatedAt?.split('T')[0] ?? 'N/A'}</strong>
        </div>
        <div className="po-status-row">
          <label>Status</label>
          <span className="status paid">ACTIVE</span>
        </div>
      </div>

      <div className="po-activation-reqs">
        <div className="po-section-title"><Check size={14} /> Completed Requirements</div>
        {reqs.map((req, i) => (
          <div key={i} className="po-req-item met">
            <Check size={15} />
            <div>
              <strong>{req.requirement}</strong>
              <p>{req.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="po-activation-next">
        <h4>What's Next?</h4>
        <p>You can now access the VetWise practitioner workspace, including clinical records, prescriptions, patient management, and appointment scheduling.</p>
        <button className="primary">
          <ArrowRight size={15} /> Continue to Workspace
        </button>
      </div>
    </div>
  );
}

// ─── Admin Dashboard ─────────────────────────────────────────────

function AdminDashboard({
  practitioners, searchQuery, setSearchQuery, statusFilter, setStatusFilter, onSelectPrac,
}: {
  practitioners: Practitioner[];
  searchQuery: string;
  setSearchQuery: (s: string) => void;
  statusFilter: 'all' | OnboardingStatus;
  setStatusFilter: (s: 'all' | OnboardingStatus) => void;
  onSelectPrac: (id: string) => void;
}) {
  const pending = practitioners.filter((p) => p.onboardingStatus === 'professional_verification_pending').length;
  const kycReview = practitioners.filter((p) => p.onboardingStatus === 'kyc_manual_review').length;
  const active = practitioners.filter((p) => p.onboardingStatus === 'active').length;
  const suspended = practitioners.filter((p) => p.onboardingStatus === 'suspended').length;
  const duplicates = practitioners.filter((p) => p.duplicateRegistrationWarning).length;

  const filtered = practitioners.filter((p) => {
    const q = searchQuery.toLowerCase();
    const matchesQuery = !q || p.legalName.toLowerCase().includes(q) || p.email.toLowerCase().includes(q) || p.registrationNumber.toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'all' || p.onboardingStatus === statusFilter;
    return matchesQuery && matchesStatus;
  });

  return (
    <>
      <div className="stats-row four">
        <div className="stat orange"><strong>{pending}</strong><span>Pending Verification</span></div>
        <div className="stat red"><strong>{kycReview}</strong><span>KYC Manual Review</span></div>
        <div className="stat green"><strong>{active}</strong><span>Active Practitioners</span></div>
        <div className="stat"><strong>{suspended}</strong><span>Suspended</span></div>
      </div>

      {duplicates > 0 && (
        <div className="po-duplicate-banner">
          <AlertTriangle size={15} />
          <span>{duplicates} practitioner(s) have duplicate registration number warnings — manual verification required.</span>
        </div>
      )}

      <div className="panel">
        <div className="panel-title">
          <h3>Practitioner Onboarding</h3>
          <small>{filtered.length} practitioners</small>
        </div>
        <div className="filter-row">
          <div className="searchbar" style={{ flex: 1 }}>
            <Search size={17} />
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by name, email, or registration number..." />
            {searchQuery && <button onClick={() => setSearchQuery('')}><X size={14} /></button>}
          </div>
          <select className="ir-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | OnboardingStatus)}>
            <option value="all">All Statuses</option>
            <option value="professional_verification_pending">Verification Pending</option>
            <option value="additional_documents_required">Documents Requested</option>
            <option value="kyc_invited">KYC Invited</option>
            <option value="kyc_in_progress">KYC In Progress</option>
            <option value="kyc_manual_review">KYC Manual Review</option>
            <option value="agreement_pending">Agreement Pending</option>
            <option value="activation_pending">Activation Pending</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="ir-empty"><Search size={24} /><p>No practitioners match your search.</p></div>
        ) : (
          <div className="po-prac-list">
            {filtered.map((p) => (
              <PractitionerRow key={p.practitionerId} prac={p} onClick={() => onSelectPrac(p.practitionerId)} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ─── Admin Queue (Pending Professional Verification) ─────────────

function AdminQueue({
  practitioners, searchQuery, setSearchQuery, onSelectPrac,
}: {
  practitioners: Practitioner[];
  searchQuery: string;
  setSearchQuery: (s: string) => void;
  onSelectPrac: (id: string) => void;
}) {
  const pending = practitioners.filter((p) =>
    p.onboardingStatus === 'professional_verification_pending' || p.onboardingStatus === 'additional_documents_required'
  );
  const kycQueue = practitioners.filter((p) => p.onboardingStatus === 'kyc_manual_review');

  const filtered = pending.filter((p) => {
    const q = searchQuery.toLowerCase();
    return !q || p.legalName.toLowerCase().includes(q) || p.email.toLowerCase().includes(q) || p.registrationNumber.toLowerCase().includes(q);
  });

  return (
    <>
      <div className="panel">
        <div className="panel-title">
          <h3>Professional Verification Queue</h3>
          <small>{filtered.length} pending</small>
        </div>
        <div className="filter-row">
          <div className="searchbar" style={{ flex: 1 }}>
            <Search size={17} />
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search pending practitioners..." />
            {searchQuery && <button onClick={() => setSearchQuery('')}><X size={14} /></button>}
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="ir-empty"><Check size={24} /><p>No pending professional verifications.</p></div>
        ) : (
          <div className="po-prac-list">
            {filtered.map((p) => (
              <PractitionerRow key={p.practitionerId} prac={p} onClick={() => onSelectPrac(p.practitionerId)} />
            ))}
          </div>
        )}
      </div>

      {kycQueue.length > 0 && (
        <div className="panel">
          <div className="panel-title">
            <h3>KYC Manual Review Queue</h3>
            <small>{kycQueue.length} requiring review</small>
          </div>
          <div className="po-prac-list">
            {kycQueue.map((p) => (
              <PractitionerRow key={p.practitionerId} prac={p} onClick={() => onSelectPrac(p.practitionerId)} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}

// ─── Practitioner Row (shared) ───────────────────────────────────

function PractitionerRow({ prac, onClick }: { prac: Practitioner; onClick: () => void }) {
  return (
    <button className="po-prac-row" onClick={onClick}>
      <div className="po-prac-avatar">
        <Stethoscope size={16} />
      </div>
      <div className="po-prac-info">
        <strong>{prac.legalName}</strong>
        <small>{prac.email} · {prac.veterinaryCouncil}</small>
        <small>Reg: {prac.registrationNumber}</small>
      </div>
      <div className="po-prac-meta">
        <span className={`status ${ONBOARDING_STATUS_COLORS[prac.onboardingStatus]}`}>
          {ONBOARDING_STATUS_LABELS[prac.onboardingStatus].toUpperCase()}
        </span>
        {prac.duplicateRegistrationWarning && (
          <span className="po-dup-badge"><AlertTriangle size={11} /> Duplicate Reg</span>
        )}
        <small>Updated: {prac.updatedAt.split('T')[0]}</small>
      </div>
      <ChevronRight size={18} className="ir-chevron" />
    </button>
  );
}

// ─── Admin Practitioner Detail ───────────────────────────────────

function AdminPractitionerDetail({
  prac, role, onAction,
}: {
  prac: Practitioner;
  role: Role;
  onAction: (pracId: string, newStatus: OnboardingStatus) => void;
}) {
  const [reason, setReason] = useState('');
  const [showDocViewer, setShowDocViewer] = useState(false);
  const docs = MOCK_DOCUMENTS[prac.practitionerId] ?? [];
  const kyc = MOCK_KYC[prac.practitionerId];
  const agreement = MOCK_AGREEMENTS[prac.practitionerId];
  const logs = MOCK_AUDIT_LOGS.filter((l) => l.practitionerId === prac.practitionerId);
  const canApprove = canApproveProfessionalVerification(role);
  const canSuspend = canSuspendPractitioner(role);

  return (
    <div className="po-detail-panel">
      <div className="po-detail-header">
        <div className="po-detail-avatar"><Stethoscope size={20} /></div>
        <div>
          <h3>{prac.legalName}</h3>
          <small>{prac.practitionerId} · {prac.email} · {prac.phone}</small>
        </div>
        <span className={`status ${ONBOARDING_STATUS_COLORS[prac.onboardingStatus]}`}>
          {ONBOARDING_STATUS_LABELS[prac.onboardingStatus].toUpperCase()}
        </span>
      </div>

      {prac.duplicateRegistrationWarning && (
        <div className="po-duplicate-banner">
          <AlertTriangle size={15} />
          <span>Duplicate registration number detected — another practitioner has the same registration number: {prac.registrationNumber}. Manual verification is required before approval.</span>
        </div>
      )}

      <div className="po-detail-section">
        <div className="po-section-title"><User size={14} /> Practitioner Details</div>
        <div className="po-detail-grid">
          <div><label>LEGAL NAME</label><strong>{prac.legalName}</strong></div>
          <div><label>EMAIL</label><strong>{prac.email}</strong></div>
          <div><label>PHONE</label><strong>{prac.phone}</strong></div>
          <div><label>STATE</label><strong>{prac.state}</strong></div>
          <div><label>VETERINARY COUNCIL</label><strong>{prac.veterinaryCouncil}</strong></div>
          <div><label>REGISTRATION NO</label><strong>{prac.registrationNumber}</strong></div>
          <div><label>QUALIFICATION</label><strong>{prac.qualification}{prac.yearOfQualification ? ` (${prac.yearOfQualification})` : ''}</strong></div>
          <div><label>SUBMITTED</label><strong>{prac.createdAt.split('T')[0]}</strong></div>
        </div>
      </div>

      <div className="po-detail-section">
        <div className="po-section-title"><FileText size={14} /> Documents ({docs.length})</div>
        {docs.length === 0 ? (
          <p className="ir-empty-text">No documents uploaded.</p>
        ) : (
          <div className="po-doc-list">
            {docs.map((doc) => (
              <div key={doc.documentId} className="po-doc-row">
                <div className="po-doc-icon"><FileText size={16} /></div>
                <div className="po-doc-info">
                  <strong>{doc.fileName}</strong>
                  <small>{DOCUMENT_TYPE_LABELS[doc.documentType]} · {(doc.fileSize / 1024).toFixed(0)} KB</small>
                </div>
                <span className={`status ${doc.reviewStatus === 'approved' ? 'paid' : doc.reviewStatus === 'rejected' ? 'overdue' : doc.reviewStatus === 'additional_requested' ? 'overdue' : 'pending'}`}>
                  {doc.reviewStatus.replace(/_/g, ' ').toUpperCase()}
                </span>
                <button className="po-view-doc-btn" onClick={() => setShowDocViewer(!showDocViewer)}>
                  <Eye size={14} /> View
                </button>
              </div>
            ))}
          </div>
        )}
        {showDocViewer && (
          <div className="po-doc-viewer-placeholder">
            <FileText size={32} />
            <p>Document viewer — in production, this would display the document via a short-lived signed URL from private encrypted storage.</p>
            <small>Storage key: {docs[0]?.privateStorageKey ?? 'N/A'}</small>
          </div>
        )}
        <div className="po-doc-security">
          <ShieldCheck size={13} />
          <p>Documents are accessed via short-lived signed URLs. No permanent storage credentials are exposed in the frontend. Access is logged.</p>
        </div>
      </div>

      {kyc && (
        <div className="po-detail-section">
          <div className="po-section-title"><Shield size={14} /> KYC Verification</div>
          <div className="po-detail-grid">
            <div><label>STATUS</label><span className={`status ${KYC_STATUS_COLORS[kyc.status]}`}>{KYC_STATUS_LABELS[kyc.status].toUpperCase()}</span></div>
            <div><label>PROVIDER</label><strong>{kyc.provider ?? 'N/A'}</strong></div>
            <div><label>TYPE</label><strong>{kyc.verificationType}</strong></div>
            <div><label>MASKED ID</label><strong>{kyc.maskedIdentifier ?? 'N/A'}</strong></div>
            {kyc.resultSummary && <div className="po-full-width"><label>RESULT</label><p>{kyc.resultSummary}</p></div>}
            {kyc.failureCode && <div><label>FAILURE CODE</label><strong>{kyc.failureCode}</strong></div>}
          </div>
        </div>
      )}

      {agreement && (
        <div className="po-detail-section">
          <div className="po-section-title"><FileText size={14} /> Agreement Status</div>
          <div className="po-detail-grid">
            <div><label>STATUS</label><span className={`status ${AGREEMENT_STATUS_COLORS[agreement.status]}`}>{AGREEMENT_STATUS_LABELS[agreement.status].toUpperCase()}</span></div>
            <div><label>VERSION</label><strong>{agreement.agreementVersion}</strong></div>
            <div><label>SIGNING PROVIDER</label><strong>{agreement.signingProvider ?? 'Not configured'}</strong></div>
            {agreement.signedAt && <div><label>SIGNED AT</label><strong>{agreement.signedAt.split('T')[0]}</strong></div>}
            {agreement.signingReference && <div><label>REFERENCE</label><strong className="pid-text">{agreement.signingReference}</strong></div>}
          </div>
        </div>
      )}

      <div className="po-detail-section">
        <div className="po-section-title"><Clock size={14} /> Audit History ({logs.length})</div>
        <div className="po-audit-list">
          {logs.map((log) => (
            <div key={log.logId} className="po-audit-row">
              <div className="po-audit-dot" />
              <div className="po-audit-content">
                <strong>{AUDIT_EVENT_LABELS[log.eventType]}</strong>
                <small>{log.createdAt.split('T')[0]} · {log.actorRole} · {log.actorId}</small>
                {log.reason && <p>{log.reason}</p>}
                <span className="po-audit-transition">
                  {log.previousStatus ? ONBOARDING_STATUS_LABELS[log.previousStatus] : '—'} → {ONBOARDING_STATUS_LABELS[log.newStatus]}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {prac.onboardingStatus !== 'active' && prac.onboardingStatus !== 'suspended' && prac.onboardingStatus !== 'rejected' && prac.onboardingStatus !== 'withdrawn' && (
        <div className="po-admin-actions">
          <div className="po-section-title"><Shield size={14} /> Admin Actions</div>
          <div className="po-merge-reason">
            <label>Reason for decision <span className="req">*</span></label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Explain the reason for this decision..." rows={3} />
          </div>
          <div className="po-action-buttons">
            {canApprove && prac.onboardingStatus === 'professional_verification_pending' && (
              <button className="primary" disabled={!reason.trim()} onClick={() => onAction(prac.practitionerId, 'kyc_invited')}>
                <Check size={15} /> Approve Professional Verification
              </button>
            )}
            {canApprove && prac.onboardingStatus === 'professional_verification_pending' && (
              <button className="danger-btn" disabled={!reason.trim()} onClick={() => onAction(prac.practitionerId, 'professional_verification_rejected')}>
                <X size={15} /> Reject
              </button>
            )}
            {canApprove && prac.onboardingStatus === 'professional_verification_pending' && (
              <button className="secondary" disabled={!reason.trim()} onClick={() => onAction(prac.practitionerId, 'additional_documents_required')}>
                <Upload size={15} /> Request Documents
              </button>
            )}
            {canApprove && prac.onboardingStatus === 'kyc_manual_review' && (
              <button className="primary" disabled={!reason.trim()} onClick={() => onAction(prac.practitionerId, 'agreement_pending')}>
                <Check size={15} /> Approve KYC (Manual)
              </button>
            )}
            {canApprove && prac.onboardingStatus === 'kyc_manual_review' && (
              <button className="danger-btn" disabled={!reason.trim()} onClick={() => onAction(prac.practitionerId, 'rejected')}>
                <X size={15} /> Reject KYC
              </button>
            )}
          </div>
          {!canApprove && (
            <p className="po-permission-note">
              <Shield size={13} /> Only VetWise Super Administrators can approve or reject professional verification. Hospital administrators cannot approve practitioner credentials.
            </p>
          )}
        </div>
      )}

      {prac.onboardingStatus === 'active' && canSuspend && (
        <div className="po-admin-actions">
          <div className="po-section-title"><Shield size={14} /> Admin Actions</div>
          <div className="po-merge-reason">
            <label>Reason for suspension <span className="req">*</span></label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Explain the reason for suspension..." rows={3} />
          </div>
          <div className="po-action-buttons">
            <button className="danger-btn" disabled={!reason.trim()} onClick={() => onAction(prac.practitionerId, 'suspended')}>
              <Ban size={15} /> Suspend Practitioner
            </button>
          </div>
        </div>
      )}

      {prac.onboardingStatus === 'suspended' && canSuspend && (
        <div className="po-admin-actions">
          <div className="po-action-buttons">
            <button className="primary" onClick={() => onAction(prac.practitionerId, 'active')}>
              <Check size={15} /> Reinstate
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Admin Audit View ────────────────────────────────────────────

function AdminAuditView({ logs, practitioners }: { logs: OnboardingAuditLog[]; practitioners: Practitioner[] }) {
  const sorted = [...logs].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="po-audit-panel">
      <div className="po-audit-header">
        <h3><Clock size={16} /> Onboarding Audit Log</h3>
        <small>{sorted.length} events</small>
      </div>

      <div className="po-audit-list full">
        {sorted.map((log) => {
          const prac = practitioners.find((p) => p.practitionerId === log.practitionerId);
          return (
            <div key={log.logId} className="po-audit-row">
              <div className="po-audit-dot" />
              <div className="po-audit-content">
                <strong>{AUDIT_EVENT_LABELS[log.eventType]}</strong>
                <small>{log.createdAt.split('T')[0]} · {log.actorRole} · {log.actorId}</small>
                {prac && <small>Practitioner: {prac.legalName} ({prac.practitionerId})</small>}
                {log.reason && <p>{log.reason}</p>}
                <span className="po-audit-transition">
                  {log.previousStatus ? ONBOARDING_STATUS_LABELS[log.previousStatus] : '—'} → {ONBOARDING_STATUS_LABELS[log.newStatus]}
                </span>
                <small className="po-correlation">Correlation: {log.correlationId}</small>
              </div>
            </div>
          );
        })}
      </div>

      <div className="po-audit-note">
        <ShieldCheck size={14} />
        <p>Audit logs are append-only. Raw secrets, OTPs, and complete sensitive identity payloads are never stored in logs. All state transitions are recorded with actor identity, timestamp, and reason.</p>
      </div>
    </div>
  );
}
