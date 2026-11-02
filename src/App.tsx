import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  Activity, Bell, CalendarDays, ChevronDown, CircleDollarSign, ClipboardList, CreditCard,
  FileText, LayoutDashboard, Menu, PawPrint, Plus, Search, Settings, ShieldCheck,
  Stethoscope, UserRound, Users, X, LogOut, ArrowUpRight, Clock3, MoreHorizontal, Check,
  Shield, Ban, Download, AlertTriangle, DollarSign, Loader2, MapPin, Heart,
  ShoppingCart, Package, Pill, Star, Cloud, UserCheck, GraduationCap, RotateCw, Pencil, Lock,
  Truck, Syringe, Send, Filter, Siren, Upload, Video, Image as ImageIcon, Paperclip,
} from 'lucide-react';
import {
  type Role, type AuthUser,
  signUp as authSignUp, signInWithPassword, sendOtp as authSendOtp, verifyOtp as authVerifyOtp,
  sendWhatsappOtp as authSendWhatsappOtp, verifyWhatsappOtp as authVerifyWhatsappOtp,
  signOut as authSignOut, getCurrentUser, onAuthStateChange,
} from '@/lib/auth';
import {
  fetchClients, fetchPatients, fetchAppointments, fetchClinicalRecords,
  fetchPrescriptions, fetchPayments, fetchSubscriptions, fetchSubscriptionPlans,
  fetchDoctors, fetchPendingDoctors, fetchClientsByUser, fetchPatientsByClient, fetchPatientsByUser,
  fetchAppointmentsByClient, fetchPaymentsByClient, fetchPrescriptionsByClient,
  fetchClinicalRecordsByPatient,
  approveDoctor as dbApproveDoctor, rejectDoctor as dbRejectDoctor,
  insertAppointment, insertPatient, insertClient, insertClinicalRecord,
  insertPrescription, updateAppointment, updatePatient, fetchPrescriptionPdf, finalizePrescription,
  fetchNotifications, markNotificationRead, markAllNotificationsRead,
  checkServiceability, fetchSettings, createPaymentOrder, verifyPayment,
  sendAppointmentReminder, fetchAppointmentReminders,
  fetchAllInvoices, refundInvoice, downloadInvoicePdf, sendPaymentReceipt,
  fetchAppointmentMedia, uploadAppointmentMedia,
  type AppointmentMedia,
} from '@/lib/queries';
import { isRazorpayTestModeAvailable, createRazorpayTestOrder, openRazorpayTestCheckout, verifyRazorpayTestPayment } from '@/lib/razorpay-test';
import { SPECIES_LIST } from '@/lib/demo-data';
import { AddPetModal as AddPetModalNew } from '@/components/AddPetModal';
import { BreedingPanel } from '@/components/BreedingPanel';
import { GpsLocationPicker } from '@/components/GpsLocationPicker';
import { PatientSearch } from '@/components/PatientSearch';
import { PatientDetailPanel } from '@/components/PatientDetailPanel';
import {
  ShopHome, ShopCatalog, ProductDetail, Cart, Checkout,
  MyOrders, OrderDetail, DoctorShop,
  type CartItem,
} from '@/components/Shop';
import {
  AdminShopDashboard, AdminProducts, AdminOrders,
  AdminOrderDetail, AdminInventory, AddProductModal,
} from '@/components/AdminShop';
import { type ShopProduct } from '@/lib/shop-data';
import { CareStateMachine } from '@/components/CareStateMachine';
import { ClinicalContextBuilder } from '@/components/ClinicalContextBuilder';
import { AssignmentEngine } from '@/components/AssignmentEngine';
import { AuditTimeline } from '@/components/AuditTimeline';
import { OfflineSyncPanel } from '@/components/OfflineSyncPanel';
import { IdentityResolution } from '@/components/IdentityResolution';
import { PractitionerOnboarding } from '@/components/PractitionerOnboarding';
import { SupplierPanel } from '@/components/SupplierPanel';
import {
  type AppointmentState, type CareState, type AuditEvent,
  type ClinicalContext, type AssignmentDecision, type UrgencyLevel,
  CARE_STATE_LABELS, CARE_STATE_COLORS,
  URGENCY_LABELS, URGENCY_COLORS, isCritical, isStalled,
} from '@/lib/orchestration';
import { offlineSync } from '@/lib/offline-sync';

type Page =
  | 'Dashboard' | 'Appointments' | 'Clients' | 'Patients' | 'Clinical Records'
  | 'Prescriptions' | 'Payments' | 'Follow-ups' | 'Notifications' | 'Schedule'
  | 'Settings' | 'My Pets' | 'Visits' | 'Medical Records' | 'Subscription'
  | 'Profile' | 'Doctor Approval' | 'Doctors' | 'Subscriptions' | 'Breeding' | 'Search'
  | 'Shop' | 'Shop Catalog' | 'Product Detail' | 'Cart' | 'Checkout'
  | 'My Orders' | 'Order Detail' | 'About'
  | 'Shop Dashboard' | 'Shop Products' | 'Shop Orders' | 'Shop Inventory' | 'Shop Suppliers'
  | 'Admin Order Detail' | 'Add Product'
  | 'Appointment Reminders'
  | 'Care Orchestration' | 'Clinical Context' | 'Audit Timeline' | 'Offline Sync'
  | 'Identity Integrity'
  | 'Practitioner Onboarding' | 'Onboarding Queue' | 'Onboarding Audit';

type Icon = typeof LayoutDashboard;

const adminNav: { label: Page; icon: Icon }[] = [
  { label: 'Dashboard', icon: LayoutDashboard },
  { label: 'Doctor Approval', icon: Shield },
  { label: 'Doctors', icon: Stethoscope },
  { label: 'Clients', icon: Users },
  { label: 'Patients', icon: PawPrint },
  { label: 'Search', icon: Search },
  { label: 'Breeding', icon: Heart },
  { label: 'Shop', icon: ShoppingCart },
  { label: 'Shop Orders', icon: Package },
  { label: 'Shop Suppliers', icon: Truck },
  { label: 'Appointments', icon: CalendarDays },
  { label: 'Care Orchestration', icon: Activity },
  { label: 'Appointment Reminders', icon: Send },
  { label: 'Audit Timeline', icon: Clock3 },
  { label: 'Identity Integrity', icon: Shield },
  { label: 'Onboarding Queue', icon: UserCheck },
  { label: 'Onboarding Audit', icon: Clock3 },
  { label: 'Payments', icon: DollarSign },
  { label: 'Subscriptions', icon: ShieldCheck },
  { label: 'Notifications', icon: Bell },
  { label: 'Settings', icon: Settings },
];

const doctorNav: { label: Page; icon: Icon }[] = [
  { label: 'Dashboard', icon: LayoutDashboard }, { label: 'Appointments', icon: CalendarDays },
  { label: 'Clients', icon: Users }, { label: 'Patients', icon: PawPrint }, { label: 'Search', icon: Search }, { label: 'Breeding', icon: Heart },
  { label: 'Clinical Records', icon: FileText },
  { label: 'Prescriptions', icon: ClipboardList }, { label: 'Payments', icon: CircleDollarSign },
  { label: 'Follow-ups', icon: Clock3 }, { label: 'Care Orchestration', icon: Activity },
  { label: 'Clinical Context', icon: Stethoscope },
  { label: 'Identity Integrity', icon: Shield },
  { label: 'Practitioner Onboarding', icon: GraduationCap },
  { label: 'Offline Sync', icon: Cloud },
  { label: 'Shop', icon: ShoppingCart },
  { label: 'Notifications', icon: Bell }, { label: 'Schedule', icon: CalendarDays },
  { label: 'Settings', icon: Settings },
];

const clientNav: { label: Page; icon: Icon }[] = [
  { label: 'Dashboard', icon: LayoutDashboard }, { label: 'My Pets', icon: PawPrint }, { label: 'Visits', icon: CalendarDays },
  { label: 'Medical Records', icon: FileText }, { label: 'Prescriptions', icon: ClipboardList }, { label: 'Breeding', icon: Heart },
  { label: 'Shop', icon: ShoppingCart }, { label: 'My Orders', icon: Package },
  { label: 'Payments', icon: CreditCard },
  { label: 'Subscription', icon: ShieldCheck }, { label: 'Profile', icon: UserRound },
];

const frontdeskNav: { label: Page; icon: Icon }[] = [
  { label: 'Dashboard', icon: LayoutDashboard }, { label: 'Clients', icon: Users },
  { label: 'Patients', icon: PawPrint }, { label: 'Appointments', icon: CalendarDays },
  { label: 'Settings', icon: Settings },
];


export type AppVariant = 'client' | 'staff';

const VARIANT_ROLES: Record<AppVariant, Role[]> = {
  client: ['client'],
  staff: ['doctor', 'client', 'admin', 'frontdesk'],
};

const VARIANT_DEFAULT_ROLE: Record<AppVariant, Role> = {
  client: 'client',
  staff: 'doctor',
};

const VARIANT_LABEL: Record<AppVariant, string> = {
  client: 'Pet Care',
  staff: 'Vet Teams',
};

const VARIANT_THEME: Record<AppVariant, { primary: string; label: string }> = {
  client: { primary: '#0d9b6a', label: 'VetWise Pet Care' },
  staff: { primary: '#112b73', label: 'VetWise' },
};

function App({ variant = 'staff' }: { variant?: AppVariant }) {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [role, setRole] = useState<Role>(VARIANT_DEFAULT_ROLE[variant]);
  const [page, setPage] = useState<Page>('Dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState(0);
  const [modal, setModal] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [paymentTab, setPaymentTab] = useState<'all' | 'paid' | 'upcoming' | 'live'>('all');
  const [myPets, setMyPets] = useState<any[]>([]);
  const [profile, setProfile] = useState({ name: '', phone: '', email: '', address: '' });
  const [pendingDocs, setPendingDocs] = useState<any[]>([]);
  const [activeDocs, setActiveDocs] = useState<any[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [shopProduct, setShopProduct] = useState<ShopProduct | null>(null);
  const [shopOrderId, setShopOrderId] = useState<string | null>(null);
  const [adminOrderId, setAdminOrderId] = useState<string | null>(null);
  const [shopPet, setShopPet] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const triggerRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    const user = getCurrentUser();
    if (user && !VARIANT_ROLES[variant].includes(user.role)) {
      authSignOut();
      setAuthUser(null);
      setAuthLoading(false);
      return;
    }
    setAuthUser(user);
    if (user) { setRole(user.role); setPage(user.role === 'client' ? 'Dashboard' : user.role === 'admin' ? 'Dashboard' : 'Clients'); }
    setAuthLoading(false);
    const unsub = onAuthStateChange((user) => {
      if (user && !VARIANT_ROLES[variant].includes(user.role)) {
        authSignOut();
        setAuthUser(null);
        setAuthLoading(false);
        return;
      }
      setAuthUser(user);
      if (user) { setRole(user.role); setPage(user.role === 'client' ? 'Dashboard' : user.role === 'admin' ? 'Dashboard' : 'Clients'); }
      else { setRole(VARIANT_DEFAULT_ROLE[variant]); }
      setAuthLoading(false);
    });
    return unsub;
  }, [variant]);

  useEffect(() => {
    if (!authUser) return;
    if (authUser.role === 'admin') {
      fetchPendingDoctors().then(({ data }) => { if (data) setPendingDocs(data as any[]); });
      fetchDoctors().then(({ data }) => { if (data) setActiveDocs(data as any[]); });
    }
    if (authUser.role === 'client') {
      fetchPatientsByUser(authUser.sub).then(({ data, error: petErr }) => {
        if (petErr) console.warn('[VetWise] Failed to load pets:', petErr);
        else if (data) setMyPets(data as any[]);
      });
      fetchClientsByUser(authUser.sub).then(({ data: clientData, error: clientErr }) => {
        if (clientErr) console.warn('[VetWise] Failed to load profile:', clientErr);
        else if (clientData && clientData.length > 0) {
          const c = clientData[0];
          setProfile({ name: c.name ?? authUser.name ?? '', phone: c.phone ?? authUser.phone ?? '', email: c.email ?? authUser.email ?? '', address: c.address ?? '' });
        } else {
          setProfile({ name: authUser.name, phone: authUser.phone, email: authUser.email, address: '' });
        }
      });
    }
  }, [authUser]);

  const nav = role === 'admin' ? adminNav : role === 'doctor' ? doctorNav : role === 'client' ? clientNav : frontdeskNav;

  const handleSignIn = useCallback((nextRole: Role, user?: AuthUser) => {
    if (user) {
      if (!VARIANT_ROLES[variant].includes(user.role)) {
        authSignOut();
        return;
      }
      setAuthUser(user); setRole(user.role);
    }

    setAuthLoading(false);
    setPage(nextRole === 'client' ? 'Dashboard' : nextRole === 'admin' ? 'Dashboard' : 'Clients');
  }, [variant]);

  const handleSignOut = useCallback(() => { authSignOut(); setAuthUser(null); setRole('client'); }, []);

  if (authLoading) return <SplashScreen variant={variant} />;
  if (!authUser) return <Login onSignIn={handleSignIn} variant={variant} />;

  const navigate = (next: Page) => { setPage(next); setMobileOpen(false); setMoreMenuOpen(false); setQuery(''); };
  const roleInitial = role === 'client' ? (authUser.name?.[0] ?? 'C') : role === 'doctor' ? 'D' : role === 'admin' ? 'A' : 'F';
  const roleLabel = role === 'client' ? (authUser.name || 'Client') : role === 'doctor' ? 'Veterinarian' : role === 'admin' ? 'Administrator' : 'Front Desk';

  const primaryTabs = role === 'client'
    ? ['Dashboard', 'My Pets', 'Visits', 'Shop', 'Payments']
    : role === 'doctor'
      ? ['Dashboard', 'Appointments', 'Patients', 'Clinical Records', 'Prescriptions']
      : role === 'admin'
        ? ['Dashboard', 'Clients', 'Patients', 'Appointments', 'Doctor Approval']
        : ['Dashboard', 'Clients', 'Patients', 'Appointments', 'Settings'];
  const primaryTabItems = nav.filter(({ label }) => primaryTabs.includes(label));
  const moreItems = nav.filter(({ label }) => !primaryTabs.includes(label));

  return (
    <div className={`app-shell variant-${variant}`}>
<aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="brand"><div className="brand-mark"><Stethoscope size={18} /></div><span>{VARIANT_THEME[variant].label}</span></div>
        <div className="portal-label">{role === 'doctor' ? 'DOCTOR PORTAL' : role === 'client' ? 'CLIENT PORTAL' : role === 'admin' ? 'ADMIN PORTAL' : 'FRONT DESK PORTAL'}</div>
        <nav>
          {nav.map(({ label, icon: NavIcon }) => (
            <button key={label} className={page === label ? 'nav-item active' : 'nav-item'} onClick={() => navigate(label)}>
              <NavIcon size={17} /><span>{label}</span>
              {label === 'Doctor Approval' && pendingDocs.length > 0 && <b className="nav-badge">{pendingDocs.length}</b>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="user-mini"><div className="avatar small">{roleInitial}</div><span>{roleLabel}</span></div>
          <button className="signout" onClick={handleSignOut}><LogOut size={15} /> Sign out</button>
        </div>
      </aside>
      {mobileOpen && <button className="scrim" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />}      <main className="main-area">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Open navigation menu"><Menu size={20} /></button>
          <span className="date">{new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
          <div className="top-actions">
            <button className="icon-btn" onClick={() => navigate('Notifications')}><Bell size={18} /><b>1</b></button>
            <button className="profile-btn" onClick={() => navigate(role === 'client' ? 'Profile' : 'Settings')}>
              <span>{roleInitial}</span><ChevronDown size={14} />
            </button>
          </div>
        </header>
        <div className="page-wrap">
          <div className="page-heading">
            <div><h1>{page}</h1><p>{subtitle(page, role, authUser.name)}</p></div>
            <div className="heading-actions">
              {role === 'client' && page === 'My Pets' && <button className="primary" onClick={() => setModal('Add Pet')}><Plus size={16} /> Add a pet</button>}
              {role === 'client' && page === 'Visits' && <button className="primary" onClick={() => setModal('Book a Visit')}><Plus size={16} /> Book a visit</button>}
              {role === 'doctor' && ['Clients', 'Patients', 'Appointments', 'Prescriptions', 'Clinical Records'].includes(page) && (
                <button className="primary" onClick={() => setModal(`Add ${page === 'Appointments' ? 'Appointment' : page === 'Clinical Records' ? 'Clinical Record' : page.slice(0, -1)}`)}>
                  <Plus size={16} /> Add {page === 'Appointments' ? 'Appointment' : page === 'Clinical Records' ? 'Clinical Record' : page.slice(0, -1)}
                </button>
              )}
              {role === 'admin' && page === 'Shop Products' && <button className="primary" onClick={() => setModal('Add Product')}><Plus size={16} /> Add Product</button>}
              {role === 'client' && page === 'Shop Catalog' && cart.length > 0 && <button className="primary" onClick={() => navigate('Cart')}><ShoppingCart size={16} /> Cart ({cart.length})</button>}
              {role === 'client' && page === 'Shop' && <button className="primary" onClick={() => navigate('Shop Catalog')}><ShoppingCart size={16} /> Shop Now</button>}
            </div>
          </div>
          {renderPage(page, role, {
            query, setQuery, selectedClient, setSelectedClient,
            navigate, setModal, setEditTarget, modal, paymentTab, setPaymentTab, myPets, setMyPets,
            profile, setProfile, pendingDocs, setPendingDocs, activeDocs, setActiveDocs,
            cart, setCart, shopProduct, setShopProduct, shopOrderId, setShopOrderId,
            adminOrderId, setAdminOrderId, shopPet, setShopPet,
            authUserId: authUser.sub, refreshKey,
          })}
        </div>
      </main>
      <nav className="bottom-nav">
        {primaryTabItems.map(({ label, icon: NavIcon }) => (
          <button key={label} className={page === label ? 'bottom-nav-item active' : 'bottom-nav-item'} onClick={() => navigate(label)}>
            <NavIcon size={22} /><span>{label}</span>
            {label === 'Doctor Approval' && pendingDocs.length > 0 && <b className="bottom-nav-badge">{pendingDocs.length}</b>}
          </button>
        ))}
        <button className={moreMenuOpen ? 'bottom-nav-item active' : 'bottom-nav-item'} onClick={() => setMoreMenuOpen(!moreMenuOpen)}>
          <MoreHorizontal size={22} /><span>More</span>
        </button>
      </nav>
      {moreMenuOpen && <>
        <button className="scrim bottom-nav-scrim" onClick={() => setMoreMenuOpen(false)} aria-label="Close menu" />
        <div className="more-menu">
          <div className="more-menu-head">
            <div className="user-mini"><div className="avatar small">{roleInitial}</div><span>{roleLabel}</span></div>
            <button className="signout" onClick={handleSignOut}><LogOut size={15} /> Sign out</button>
          </div>
          <div className="more-menu-grid">
            {moreItems.map(({ label, icon: NavIcon }) => (
              <button key={label} className={page === label ? 'more-menu-item active' : 'more-menu-item'} onClick={() => navigate(label)}>
                <NavIcon size={18} /><span>{label}</span>
                {label === 'Doctor Approval' && pendingDocs.length > 0 && <b className="nav-badge">{pendingDocs.length}</b>}
              </button>
            ))}
          </div>
        </div>
      </>}
      {modal && <ModalRouter modal={modal} setModal={setModal} role={role} myPets={myPets} setMyPets={setMyPets} authUserId={authUser.sub} editTarget={editTarget} onSaved={triggerRefresh} />}
    </div>
  );
}

function SplashScreen({ variant }: { variant: AppVariant }) {
  const primary = variant === 'client' ? '#0d9b6a' : '#112b73';
  const label = variant === 'client' ? 'VetWise Pet Care' : 'VetWise';
  return (
    <div className="splash-screen">
      <div className="splash-logo">
        <div className="splash-ring" style={{ borderColor: primary }}>
          <div className="splash-icon" style={{ background: primary }}>
            <Stethoscope size={36} color="#fff" />
          </div>
        </div>
        <div className="splash-wordmark" style={{ color: primary }}>{label}</div>
        <div className="splash-dots">
          <span style={{ background: primary }} /><span style={{ background: primary }} /><span style={{ background: primary }} />
        </div>
      </div>
    </div>
  );
}

function LoadingLogo({ variant }: { variant: AppVariant }) {
  const primary = variant === 'client' ? '#0d9b6a' : '#112b73';
  return (
    <span className="btn-loading-logo" style={{ '--ll-primary': primary } as React.CSSProperties}>
      <span className="btn-loading-ring" style={{ borderColor: `${primary}40`, borderTopColor: primary }} />
    </span>
  );
}

function subtitle(page: Page, role: Role, userName?: string) {
  const map: Partial<Record<Page, string>> = {
    Dashboard: role === 'client' ? `Welcome back${userName ? ', ' + userName.split(' ')[0] : ''}` : role === 'admin' ? 'Practice overview and system health' : 'Your practice at a glance',
    Clients: 'Registered clients', Patients: 'Patients across all clients',
    Payments: role === 'client' ? 'Your payments — paid, upcoming, and live' : 'Payment records for your services',
    'Follow-ups': 'Track patients requiring follow-up visits', Appointments: 'Manage upcoming appointments',
    'Clinical Records': 'Patient history and consultation notes', Prescriptions: role === 'client' ? 'Medicines prescribed to your pets (read-only)' : 'Manage medicines and digital prescriptions',
    Notifications: 'Stay updated with your practice', Schedule: 'Your working calendar',
    'My Pets': 'Your registered pets', Visits: 'Your upcoming and past visits',
    'Medical Records': 'Health history for your pets', Subscription: 'Your VetWise subscription plan',
    Profile: 'Manage your account and service locations', 'Doctor Approval': 'Review and approve pending doctor applications',
    Doctors: 'Active veterinarian accounts', Subscriptions: 'Subscription plans and renewals',
    Settings: 'System configuration',
    Search: role === 'doctor' ? 'Search patients by breed, species, ID, or owner' : 'Search all patients and clients',
    Breeding: role === 'client' ? 'Breeding records for your animals' : role === 'doctor' ? 'Search and view breeding animals' : 'All breeding records across clients',
    Shop: role === 'admin' ? 'Shop dashboard and management' : role === 'doctor' ? 'Browse veterinary products' : 'Veterinary medicines, food, supplements and healthcare products',
    'Shop Catalog': 'Browse products for all animals',
    'Product Detail': 'Product information and pricing',
    Cart: 'Your shopping cart',
    Checkout: 'Complete your order',
    'My Orders': 'Your shop order history',
    'Order Detail': 'Order details and tracking',
    'Shop Dashboard': 'Shop overview and metrics',
    'Shop Products': 'Manage product catalog',
    'Shop Orders': 'Manage customer orders',
    'Shop Inventory': 'Stock levels and inventory',
    'Shop Suppliers': 'Manage inventory suppliers',
    'Appointment Reminders': 'Send and track appointment email reminders',
    'Admin Order Detail': 'Order details and fulfilment',
    'Care Orchestration': 'Veterinary care workflow with controlled state machine and doctor assignment',
    'Clinical Context': 'Assembled clinical context for patient care',
    'Audit Timeline': 'Event and audit trail for care workflows',
    'Offline Sync': 'Offline clinical data synchronization status',
    'Identity Integrity': 'Animal identity resolution and clinical history reconciliation',
    'Practitioner Onboarding': 'Doctor registration, KYC verification, and agreement signing',
    'Onboarding Queue': 'Pending practitioner verification and KYC review queue',
    'Onboarding Audit': 'Practitioner onboarding audit trail and state transitions',
  };
  return map[page] ?? 'Manage your VetWise account';
}

const emptyAuditEvents: AuditEvent[] = [];

const emptyAppointmentStates: AppointmentState[] = [];



function renderPage(page: Page, role: Role, props: any) {
  if (page === 'Dashboard') return <Dashboard role={role} navigate={props.navigate} pendingDocs={props.pendingDocs} activeDocs={props.activeDocs} authUserId={props.authUserId} myPets={props.myPets} refreshKey={props.refreshKey} />;
  if (page === 'Clients') return <ClientsPage role={role} query={props.query} setQuery={props.setQuery} selectedClient={props.selectedClient} setSelectedClient={props.setSelectedClient} refreshKey={props.refreshKey} />;
  if (page === 'Patients' || page === 'My Pets') return <PatientsPage role={role} myPets={props.myPets} setMyPets={props.setMyPets} authUserId={props.authUserId} setModal={props.setModal} setEditTarget={props.setEditTarget} refreshKey={props.refreshKey} />;
  if (page === 'Payments') return role === 'client' ? <ClientPaymentsPage paymentTab={props.paymentTab} setPaymentTab={props.setPaymentTab} authUserId={props.authUserId} /> : <AdminPaymentsPage />;
  if (page === 'Follow-ups') return <Followups />;
  if (page === 'Appointments' || page === 'Visits' || page === 'Schedule') return <AppointmentsPage role={role} setModal={props.setModal} setEditTarget={props.setEditTarget} authUserId={props.authUserId ?? ''} refreshKey={props.refreshKey} />;
  if (page === 'Clinical Records') return <DoctorClinicalRecordsPage setModal={props.setModal} authUserId={props.authUserId ?? ''} refreshKey={props.refreshKey} />;
  if (page === 'Medical Records') return <ClientMedicalRecords authUserId={props.authUserId} />;
  if (page === 'Prescriptions') return role === 'client' ? <ClientPrescriptions authUserId={props.authUserId} refreshKey={props.refreshKey} /> : <DoctorPrescriptions setModal={props.setModal} refreshKey={props.refreshKey} />;
  if (page === 'Subscription') return <ClientSubscription authUserId={props.authUserId} />;
  if (page === 'Profile') return <ClientProfile profile={props.profile} setProfile={props.setProfile} authUser={props.authUserId ? { sub: props.authUserId, name: props.profile.name, phone: props.profile.phone, email: props.profile.email } : null} />;
  if (page === 'Doctor Approval') return <DoctorApproval pendingDocs={props.pendingDocs} setPendingDocs={props.setPendingDocs} activeDocs={props.activeDocs} setActiveDocs={props.setActiveDocs} setModal={props.setModal} />;
  if (page === 'Doctors') return <DoctorsList activeDocs={props.activeDocs} />;
  if (page === 'Subscriptions') return <AdminSubscriptions />;
  if (page === 'Notifications') return <NotificationsPage role={role} authUserId={props.authUserId ?? ''} navigate={props.navigate} />;
  if (page === 'Search') return <SearchPage role={role as 'doctor' | 'admin'} />;
  if (page === 'Breeding') return role === 'client' ? <BreedingPage myPets={props.myPets} /> : <DoctorBreedingSearch role={role as 'doctor' | 'admin'} />;
  // Shop routes
  if (page === 'Shop') return role === 'admin' ? <AdminShopDashboard /> : role === 'doctor' ? <DoctorShop isSubscriber={false} /> : <ShopHome isSubscriber={true} navigate={props.navigate} />;
  if (page === 'Shop Catalog') return <ShopCatalog isSubscriber={true} cart={props.cart} setCart={props.setCart} myPets={props.myPets} selectedPet={props.shopPet} setSelectedPet={props.setShopPet} navigate={props.navigate} />;
  if (page === 'Product Detail') return props.shopProduct ? <ProductDetail product={props.shopProduct} isSubscriber={true} onAdd={() => {}} onBack={() => props.navigate('Shop Catalog')} /> : <ShopCatalog isSubscriber={true} cart={props.cart} setCart={props.setCart} myPets={props.myPets} selectedPet={props.shopPet} setSelectedPet={props.setShopPet} navigate={props.navigate} />;
  if (page === 'Cart') return <Cart cart={props.cart} setCart={props.setCart} isSubscriber={true} navigate={props.navigate} />;
  if (page === 'Checkout') return <Checkout cart={props.cart} isSubscriber={true} navigate={props.navigate} onOrderPlaced={() => props.setCart([])} />;
  if (page === 'My Orders') return <MyOrders navigate={(p: string) => { const id = p.split(':')[1]; props.setShopOrderId(id); props.navigate('Order Detail' as Page); }} />;
  if (page === 'Order Detail') return props.shopOrderId ? <OrderDetail orderId={props.shopOrderId} onBack={() => props.navigate('My Orders')} /> : <MyOrders navigate={(p: string) => { const id = p.split(':')[1]; props.setShopOrderId(id); props.navigate('Order Detail' as Page); }} />;
  if (page === 'Shop Dashboard') return <AdminShopDashboard />;
  if (page === 'Shop Products') return <AdminProducts onAddProduct={() => props.setModal('Add Product')} />;
  if (page === 'Shop Orders') return <AdminOrders onOrderClick={(id: string) => { props.setAdminOrderId(id); props.navigate('Admin Order Detail' as Page); }} />;
  if (page === 'Shop Inventory') return <AdminInventory />;
  if (page === 'Shop Suppliers') return <SupplierPanel role={role as 'admin' | 'doctor' | 'frontdesk'} />;
  if (page === 'Appointment Reminders') return <AppointmentRemindersPage role={role} />;
  if (page === 'Admin Order Detail') return props.adminOrderId ? <AdminOrderDetail orderId={props.adminOrderId} onBack={() => props.navigate('Shop Orders')} /> : <AdminOrders onOrderClick={(id: string) => { props.setAdminOrderId(id); props.navigate('Admin Order Detail' as Page); }} />;
  // Orchestration routes
  if (page === 'Care Orchestration') return <CareOrchestrationPage role={role} appointmentStates={emptyAppointmentStates} />;
  if (page === 'Clinical Context') return <ClinicalContextPage />;
  if (page === 'Audit Timeline') return <AuditTimelinePage role={role} />;
  if (page === 'Offline Sync') return <OfflineSyncPanel />;
  if (page === 'Identity Integrity') return <IdentityResolution role={role} />;
  if (page === 'Practitioner Onboarding') return <PractitionerOnboarding role={role} />;
  if (page === 'Onboarding Queue') return <PractitionerOnboarding role={role} />;
  if (page === 'Onboarding Audit') return <PractitionerOnboarding role={role} />;
  if (page === 'Settings') return <SettingsPage role={role} authUser={props.authUserId ? { name: props.profile.name, phone: props.profile.phone, email: props.profile.email } : null} />;
  return <GenericPage page={page} role={role} />;
}

function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return <div className="searchbar"><Search size={17} /><input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />{value && <button onClick={() => onChange('')}><X size={14} /></button>}</div>;
}

function Stat({ number, label, accent = '' }: { number: string; label: string; accent?: string }) {
  return <div className={`stat ${accent}`}><strong>{number}</strong><span>{label}</span></div>;
}

function ClientsPage({ role, query, setQuery, selectedClient, setSelectedClient, refreshKey }: { role: Role; query: string; setQuery: (s: string) => void; selectedClient: number; setSelectedClient: (n: number) => void; refreshKey: number }) {
  const [clientsData, setClientsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true); setError(null);
    fetchClients().then(({ data, error: err }) => {
      if (err) setError(err);
      else if (data) setClientsData(data as any[]);
      setLoading(false);
    });
  }, [refreshKey]);

  const adapted = clientsData.map((c: any) => ({
    ...c,
    clientId: c.clientId ?? c.ownerId,
    initials: (c.name ?? '?')[0]?.toUpperCase() ?? '?',
    city: c.city ?? '',
    pets: c.pets ?? '',
    last: c.last ?? '—',
    joined: c.joined ?? c.joinedDate ?? '',
  }));
  const filteredClients = useMemo(() => adapted.filter((c) => `${c.name ?? ''} ${c.city ?? ''} ${c.pets ?? ''}`.toLowerCase().includes(query.toLowerCase())), [adapted, query]);

  if (loading) return <div className="empty-state"><Loader2 size={28} className="spin" /><p>Loading clients...</p></div>;
  if (error) return <div className="empty-state"><AlertTriangle size={32} /><h3>Could not load clients</h3><p>{error}</p><button className="primary" onClick={() => { setLoading(true); setError(null); fetchClients().then(({ data, error: e }) => { if (e) setError(e); else if (data) setClientsData(data as any[]); setLoading(false); }); }}><RotateCw size={16} /> Retry</button></div>;

  const selected = filteredClients[selectedClient] ?? filteredClients[0];

  return <div className="clients-layout">
    <div className="list-column"><SearchBar value={query} onChange={setQuery} placeholder="Search by name, phone, email, pet name, species..." />
      <div className="client-list">{filteredClients.map((client: any, i: number) => (
        <button key={client.clientId ?? i} className={`client-card ${selectedClient === i ? 'selected' : ''}`} onClick={() => setSelectedClient(i)}>
          <div className="avatar">{client.initials}</div>
          <div className="card-main"><strong>{client.name}</strong><span className="cid-small">{client.clientId}</span><span>{client.city}</span><small>{client.pets}</small></div>
          <div className="last-visit"><small>Last visit</small><span>{client.last}</span></div>
        </button>
      ))}</div>
    </div>
    {selected ? <ClientDetail client={selected} /> : <div className="empty-detail"><Users size={34} /><p>Select a client to view details</p></div>}
  </div>;
}

function ClientDetail({ client }: { client: any }) {
  return <section className="detail-card">
    <div className="detail-head"><div className="avatar large">{client.initials ?? (client.name ?? '?')[0]?.toUpperCase()}</div><div><h2>{client.name}</h2><p><span className="cid-badge-large">{client.clientId}</span> {client.city} {client.joined ? `· Joined ${client.joined}` : ''}</p></div></div>
    <div className="tabs"><button className="active">Profile</button><button>Pets (2)</button><button>Visits (5)</button><button>Rx (3)</button><button>Payments (3)</button></div>
    <div className="detail-content">
      <div className="info-grid">
        <div><label>CLIENT ID</label><strong className="cid-text">{client.clientId}</strong></div>
        <div><label>PHONE</label><strong>{client.phone ?? '—'}</strong></div>
        <div><label>EMAIL</label><strong>{client.email ?? '—'}</strong></div>
        <div className="wide"><label>ADDRESS</label><strong>{client.address ?? '—'}</strong></div>
      </div>
      <div className="mini-stats"><Stat number="2" label="Pets" /><Stat number="3" label="Visits" /><Stat number="—" label="Next Visit" /></div>
    </div>
  </section>;
}

function PatientsPage({ role, myPets, setMyPets, authUserId, setModal, setEditTarget, refreshKey }: { role: Role; myPets: any[]; setMyPets: (p: any) => void; authUserId: string; setModal: (s: string | null) => void; setEditTarget: (t: any) => void; refreshKey: number }) {
  const [selectedPatientIdx, setSelectedPatientIdx] = useState(0);
  const [patientQuery, setPatientQuery] = useState('');
  const [speciesPill, setSpeciesPill] = useState('All Species');
  const [allPatients, setAllPatients] = useState<any[]>([]);
  const [allClients, setAllClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true); setError(null);
    Promise.all([fetchPatients(), fetchClients()]).then(([patRes, cliRes]) => {
      if (patRes.error) setError(patRes.error);
      else if (patRes.data) setAllPatients(patRes.data as any[]);
      if (cliRes.data) setAllClients(cliRes.data as any[]);
      setLoading(false);
    });
  }, [refreshKey]);

  if (role === 'client') {
    return <div className="patients-layout">
      <div className="patient-list">
        <div className="filter-row"><SearchBar value={patientQuery} onChange={setPatientQuery} placeholder="Search by name, species, breed..." /></div>
        {myPets.map((p: any, i: number) => (
          <button className="patient-card" key={p.name ?? i}>
            <div className="pet-icon"><PawPrint size={19} /></div>
            <div className="card-main"><strong>{p.name} <em className={`tag ${(p.species ?? '').toLowerCase()}`}>{p.species}</em><span className="muted"> {p.sex}</span></strong><span>{p.breed} · {p.color}</span><small>{p.age} · {p.weight}</small></div>
            <div className="owner"><small>{p.visits ?? 0} {p.visits === 1 ? 'visit' : 'visits'}</small><small>Last: {p.lastVisit ?? 'No visits yet'}</small></div>
          </button>
        ))}
      </div>
      <div className="empty-detail"><PawPrint size={34} /><p>Select a pet to view details</p></div>
    </div>;
  }

  if (loading) return <div className="empty-state"><Loader2 size={28} className="spin" /><p>Loading patients...</p></div>;
  if (error) return <div className="empty-state"><AlertTriangle size={32} /><h3>Could not load patients</h3><p>{error}</p><button className="primary" onClick={() => { setLoading(true); setError(null); fetchPatients().then(({ data, error: e }) => { if (e) setError(e); else if (data) setAllPatients(data as any[]); setLoading(false); }); }}><RotateCw size={16} /> Retry</button></div>;

  const adapted = allPatients.map((p: any) => {
    if (Array.isArray(p)) return p;
    const owner = allClients.find((c: any) => c.ownerId === p.ownerId);
    return [p.name ?? 'Unknown', p.species ?? 'Unknown', `${p.breed ?? ''} · ${p.color ?? ''}`, `${p.age ?? ''} · ${p.weight ?? ''}`, owner?.name ?? 'Unknown', `${p.visits ?? 0} visits`, p.petId ?? ''];
  });

  const filteredPatients = adapted.filter((p) => {
    const q = patientQuery.toLowerCase();
    const matchesQuery = !q || `${p[0]} ${p[1]} ${p[2]} ${p[4]}`.toLowerCase().includes(q);
    const matchesSpecies = speciesPill === 'All Species' || p[1] === speciesPill;
    return matchesQuery && matchesSpecies;
  });
  const selectedPatient = filteredPatients[selectedPatientIdx] ?? filteredPatients[0];

  return <div className="patients-layout">
    <div className="patient-list">
      <div className="filter-row"><SearchBar value={patientQuery} onChange={(v) => { setPatientQuery(v); setSelectedPatientIdx(0); }} placeholder="Search by name, species, breed, owner..." />
        <div className="species-pills">{['All Species', 'Dog', 'Cat', 'Cattle', 'Horse', 'Goat', 'Rabbit', 'Elephant'].map((s) => <button className={speciesPill === s ? 'active' : ''} key={s} onClick={() => { setSpeciesPill(s); setSelectedPatientIdx(0); }}>{s}</button>)}</div>
      </div>
      {filteredPatients.map((p, i) => (
        <button className={`patient-card ${selectedPatientIdx === i ? 'selected' : ''}`} key={p[0] + i} onClick={() => setSelectedPatientIdx(i)}>
          <div className="pet-icon"><PawPrint size={19} /></div>
          <div className="card-main"><strong>{p[0]} <em className={`tag ${p[1].toLowerCase()}`}>{p[1]}</em><span className="muted"> {p[1] === 'Dog' ? 'Male' : 'Female'}</span></strong><span>{p[2]}</span><small>{p[3]}</small><span className="pid-small">{p[6] ?? ''}</span></div>
          <div className="owner"><strong>{p[4]}</strong><small>{p[5]}</small></div>
        </button>
      ))}
    </div>
    {selectedPatient ? <DoctorPatientDetail patient={selectedPatient} allClients={allClients} setModal={setModal} setEditTarget={setEditTarget} /> : <div className="empty-detail"><PawPrint size={34} /><p>Select a patient to view details</p></div>}
  </div>;
}

function ClientPaymentsPage({ paymentTab, setPaymentTab, authUserId }: { paymentTab: 'all' | 'paid' | 'upcoming' | 'live'; setPaymentTab: (t: 'all' | 'paid' | 'upcoming' | 'live') => void; authUserId: string }) {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);

  useEffect(() => {
    if (!authUserId) return;
    setLoading(true); setError(null);
    fetchClientsByUser(authUserId).then(({ data: clientsData }) => {
      if (clientsData && clientsData.length > 0) {
        fetchPaymentsByClient(clientsData[0].ownerId).then(({ data, error: e }) => {
          if (e) setError(e);
          else if (data) setPayments(data as any[]);
          setLoading(false);
        });
      } else { setLoading(false); }
    });
  }, [authUserId]);

  if (loading) return <div className="empty-state"><Loader2 size={28} className="spin" /><p>Loading payments...</p></div>;
  if (error) return <div className="empty-state"><AlertTriangle size={32} /><h3>Could not load payments</h3><p>{error}</p></div>;

  const paid = payments.filter((p) => (p.status ?? '').toLowerCase() === 'paid');
  const upcoming = payments.filter((p) => (p.status ?? '').toLowerCase() === 'upcoming' || (p.status ?? '').toLowerCase() === 'pending');
  const live = payments.filter((p) => (p.status ?? '').toLowerCase() === 'live');
  const totalPaid = paid.reduce((s, p) => s + parseInt(String(p.amount ?? '0').replace(/[^0-9]/g, '')), 0);
  const totalUpcoming = upcoming.reduce((s, p) => s + parseInt(String(p.amount ?? '0').replace(/[^0-9]/g, '')), 0);

  return <>
    <div className="stats-row">
      <Stat number={`₹${totalPaid.toLocaleString('en-IN')}`} label="Total Paid" accent="green" />
      <Stat number={`₹${totalUpcoming.toLocaleString('en-IN')}`} label="Upcoming" accent="orange" />
      <Stat number={String(live.length)} label="Live Payments" accent="blue" />
    </div>
    <div className="payment-tabs">
      <button className={paymentTab === 'all' ? 'active' : ''} onClick={() => setPaymentTab('all')}>All ({payments.length})</button>
      <button className={paymentTab === 'paid' ? 'active' : ''} onClick={() => setPaymentTab('paid')}>Paid ({paid.length})</button>
      <button className={paymentTab === 'upcoming' ? 'active' : ''} onClick={() => setPaymentTab('upcoming')}>Upcoming ({upcoming.length})</button>
      <button className={paymentTab === 'live' ? 'active' : ''} onClick={() => setPaymentTab('live')}>Live ({live.length})</button>
    </div>
    {(paymentTab === 'all' || paymentTab === 'paid') && (
      <div className="payment-section">
        <h3 className="payment-section-title"><Check size={16} /> Paid <span className="count">({paid.length})</span></h3>
        <div className="table-card">
          <div className="table-head"><span>SERVICE</span><span></span><span>AMOUNT</span><span>DATE</span><span>STATUS</span><span>INVOICE</span></div>
          {paid.map((p, i) => <div className="table-row" key={i}><div><strong>{p.service ?? '—'}</strong><small>{p.method ?? '—'}</small></div><div><span></span></div><strong>{p.amount ?? '—'}</strong><span>{p.date ?? '—'}</span><span className="status paid">PAID</span><button className="link" onClick={async () => { const cid = p.clientId ?? p.ownerId ?? ''; const { data: invs } = await fetchAllInvoices(); const match = (invs ?? []).find((inv) => inv.client_id === cid && Number(inv.paid_amount ?? 0) > 0); if (match) downloadInvoicePdf(match, p.pet ?? p.patientId ?? '—', p.client ?? '—'); }}><Download size={13} /> Invoice</button></div>)}
        </div>
      </div>
    )}
    {(paymentTab === 'all' || paymentTab === 'upcoming') && (
      <div className="payment-section">
        <h3 className="payment-section-title"><CalendarDays size={16} /> Upcoming <span className="count">({upcoming.length})</span></h3>
        <div className="table-card">
          <div className="table-head"><span>SERVICE</span><span></span><span>AMOUNT</span><span>DATE</span><span>STATUS</span><span></span></div>
          {upcoming.map((p, i) => <div className="table-row" key={i}><div><strong>{p.service ?? '—'}</strong><small>{p.due ? `Due ${p.due}` : ''}</small></div><div><span></span></div><strong>{p.amount ?? '—'}</strong><span>{p.due ?? p.date ?? '—'}</span><span className="status pending">UPCOMING</span><button className="link">Details</button></div>)}
        </div>
      </div>
    )}
    {(paymentTab === 'all' || paymentTab === 'live') && (
      <div className="payment-section">
        <h3 className="payment-section-title"><AlertTriangle size={16} /> Live — Payment Required <span className="count">({live.length})</span></h3>
        <div className="table-card">
          <div className="table-head"><span>SERVICE</span><span></span><span>AMOUNT</span><span>DATE</span><span>STATUS</span><span></span></div>
          {live.map((p, i) => <div className="table-row" key={i}><div><strong>{p.service ?? '—'}</strong><small>Payment required now</small></div><div><span></span></div><strong>{p.amount ?? '—'}</strong><span>Now</span><span className="status live">LIVE</span><button className="primary" style={{ padding: '6px 12px', fontSize: '11px' }} onClick={async () => {
            const paymentId = p.paymentId ?? p.id;
            if (!paymentId) return;
            setPayingId(paymentId);
            const { data: order, error: orderErr } = await createPaymentOrder('appointment', paymentId);
            if (orderErr) { setPayError(orderErr); setPayingId(null); return; }
            if (order?.keyId === 'PLACEHOLDER' || !order?.keyId) {
              setPayError('Payment provider not configured. Contact your administrator.');
              setPayingId(null);
              return;
            }
            const rzp = (window as any).Razorpay;
            if (!rzp) {
              setPayError('Payment checkout could not load. Please refresh and try again.');
              setPayingId(null);
              return;
            }
            const rzpInstance = new rzp({
              key: order.keyId,
              amount: order.amount,
              currency: order.currency,
              name: 'VetWise',
              order_id: order.orderId,
              handler: async (resp: any) => {
                const { error: verifyErr } = await verifyPayment({
                  razorpayOrderId: resp.razorpay_order_id,
                  razorpayPaymentId: resp.razorpay_payment_id,
                  razorpaySignature: resp.razorpay_signature,
                  paymentId: order.paymentId,
                });
                setPayingId(null);
                if (verifyErr) { setPayError(verifyErr); return; }
                setPayments((prev) => prev.map((x) => (x.paymentId ?? x.id) === paymentId ? { ...x, status: 'paid' } : x));
              },
              modal: { ondismiss: () => { setPayingId(null); } },
            });
            rzpInstance.open();
          }} disabled={payingId === (p.paymentId ?? p.id)}>{payingId === (p.paymentId ?? p.id) ? 'Processing...' : 'Pay Now'}</button></div>)}
          {payError && <div style={{ marginTop: '10px', padding: '10px 14px', background: '#fff0f0', border: '1px solid #f0c0c0', borderRadius: 8, fontSize: '13px', color: '#c00' }}><AlertTriangle size={14} /> {payError}</div>}
        </div>
      </div>
    )}
  </>;
}

function AdminPaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'payments' | 'invoices'>('payments');
  const [refunding, setRefunding] = useState<string | null>(null);
  const [refundError, setRefundError] = useState<string | null>(null);
  const [refundSuccess, setRefundSuccess] = useState<string | null>(null);
  const [receiptSending, setReceiptSending] = useState<string | null>(null);
  const [receiptMsg, setReceiptMsg] = useState<string | null>(null);
  const [reasonFilter, setReasonFilter] = useState<string>('all');

  const loadAll = () => {
    setLoading(true); setError(null);
    Promise.all([fetchPayments(), fetchAllInvoices(), fetchClients(), fetchPatients()]).then(([payRes, invRes, cliRes, patRes]) => {
      if (payRes.error) setError(payRes.error);
      else if (payRes.data) setPayments(payRes.data as any[]);
      if (invRes.error && !payRes.error) setError(invRes.error);
      else if (invRes.data) setInvoices(invRes.data as any[]);
      if (cliRes.data) setClients(cliRes.data as any[]);
      if (patRes.data) setPatients(patRes.data as any[]);
      setLoading(false);
    });
  };

  useEffect(() => { loadAll(); }, []);

  const clientName = (id: string) => clients.find((c) => (c.ownerId ?? c.clientId) === id)?.name ?? id ?? '—';
  const clientEmail = (id: string) => clients.find((c) => (c.ownerId ?? c.clientId) === id)?.email ?? '';
  const patientName = (id: string) => {
    if (!id) return '—';
    const p = patients.find((x) => (x.petId ?? x.patientId) === id);
    return p?.name ?? id;
  };

  const handleRefund = async (invoice: any) => {
    const invId = invoice.invoice_id ?? invoice.invoiceId;
    const paid = Number(invoice.paid_amount ?? 0);
    const alreadyRefunded = Number(invoice.refund_amount ?? 0);
    const refundable = paid - alreadyRefunded;
    if (refundable <= 0) { setRefundError('Nothing left to refund on this invoice.'); return; }
    const amountStr = window.prompt(`Refund amount (max ₹${refundable.toFixed(2)}):`, refundable.toFixed(2));
    if (!amountStr) return;
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) { setRefundError('Enter a valid refund amount.'); return; }
    const reason = window.prompt('Reason for refund (optional):') ?? undefined;
    setRefunding(invId); setRefundError(null); setRefundSuccess(null);
    const { error: rErr } = await refundInvoice(invId, amount, reason);
    setRefunding(null);
    if (rErr) { setRefundError(rErr); return; }
    setRefundSuccess(`Refund of ₹${amount.toFixed(2)} recorded for invoice ${invId}.`);
    loadAll();
  };

  const handleSendReceipt = async (invoice: any) => {
    const invId = invoice.invoice_id ?? invoice.invoiceId ?? '';
    const cid = invoice.client_id ?? '';
    const email = clientEmail(cid);
    const cName = clientName(cid);
    if (!email) { setReceiptMsg(`No email on file for ${cName}.`); return; }
    setReceiptSending(invId); setReceiptMsg(null);
    const { error: sErr } = await sendPaymentReceipt({
      recipientEmail: email,
      recipientName: cName,
      invoiceId: invId,
      clientName: cName,
      patientName: patientName(invoice.patient_id),
      total: Number(invoice.total ?? 0),
      paid: Number(invoice.paid_amount ?? 0),
      refunded: Number(invoice.refund_amount ?? 0),
      status: invoice.status ?? 'draft',
      clientId: cid,
    });
    setReceiptSending(null);
    if (sErr) { setReceiptMsg(`Could not send receipt: ${sErr}`); return; }
    setReceiptMsg(`Receipt emailed to ${email}.`);
  };

  if (loading) return <div className="empty-state"><Loader2 size={28} className="spin" /><p>Loading payments...</p></div>;
  if (error) return <div className="empty-state"><AlertTriangle size={32} /><h3>Could not load payments</h3><p>{error}</p><button className="primary" onClick={loadAll}><RotateCw size={16} /> Retry</button></div>;

  const totalRevenue = payments.reduce((s, p) => s + (typeof p.amount === 'number' ? p.amount : parseInt(String(p.amount ?? '0').replace(/[^0-9]/g, ''), 10)), 0);
  const pendingCount = payments.filter((p) => { const st = (p.status ?? '').toLowerCase(); return st === 'pending' || st === 'upcoming' || st === 'live' || st === 'created'; }).length;
  const totalRefunded = invoices.reduce((s, i) => s + Number(i.refund_amount ?? 0), 0);
  const netRevenue = totalRevenue - totalRefunded;

  const refundedInvoices = invoices.filter((i) => Number(i.refund_amount ?? 0) > 0);
  const reasonOptions = Array.from(new Set(refundedInvoices.map((i) => i.refund_reason).filter(Boolean))) as string[];
  const filteredInvoices = reasonFilter === 'all'
    ? invoices
    : invoices.filter((i) => (i.refund_reason ?? '') === reasonFilter);

  const chartData = useMemo(() => {
    const buckets: Record<string, { revenue: number; refunded: number; count: number }> = {};
    const sorted = [...payments].sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db = b.date ? new Date(b.date).getTime() : 0;
      return da - db;
    });
    for (const p of sorted) {
      const d = p.date ? new Date(p.date) : new Date();
      const key = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
      if (!buckets[key]) buckets[key] = { revenue: 0, refunded: 0, count: 0 };
      const amt = typeof p.amount === 'number' ? p.amount : parseInt(String(p.amount ?? '0').replace(/[^0-9]/g, ''), 10);
      buckets[key].revenue += amt;
      buckets[key].count += 1;
    }
    for (const inv of invoices) {
      const d = inv.created_at ? new Date(inv.created_at) : new Date();
      const key = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
      if (!buckets[key]) buckets[key] = { revenue: 0, refunded: 0, count: 0 };
      buckets[key].refunded += Number(inv.refund_amount ?? 0);
    }
    return Object.entries(buckets).slice(-6);
  }, [payments, invoices]);

  const maxChartVal = Math.max(1, ...chartData.map(([, v]) => v.revenue + v.refunded));

  return <>
    <div className="stats-row"><Stat number={`₹${totalRevenue.toLocaleString('en-IN')}`} label="Total Revenue" accent="green" /><Stat number={`₹${netRevenue.toLocaleString('en-IN')}`} label="Net (after refunds)" accent="blue" /><Stat number={`₹${totalRefunded.toLocaleString('en-IN')}`} label="Refunded" accent="red" /></div>
    {chartData.length > 0 && (
      <section className="panel" style={{ marginBottom: '16px' }}>
        <div className="panel-title"><h3>Payment Summary</h3><span className="count" style={{ fontSize: '11px', color: '#8290a5' }}>Last {chartData.length} months</span></div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', height: '180px', padding: '8px 4px 0', overflowX: 'auto' }}>
          {chartData.map(([label, v]) => {
            const revH = (v.revenue / maxChartVal) * 100;
            const refH = (v.refunded / maxChartVal) * 100;
            return (
              <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', minWidth: '64px', flex: 1 }}>
                <div style={{ display: 'flex', flexDirection: 'column-reverse', gap: '2px', height: '140px', width: '100%', justifyContent: 'flex-end', alignItems: 'stretch' }}>
                  <div style={{ height: `${revH}%`, background: '#112b73', borderRadius: '4px 4px 0 0', minHeight: v.revenue > 0 ? '4px' : '0', transition: 'height .3s' }} title={`Revenue: ₹${v.revenue.toLocaleString('en-IN')}`} />
                  <div style={{ height: `${refH}%`, background: '#e73535', borderRadius: '4px 4px 0 0', minHeight: v.refunded > 0 ? '4px' : '0', transition: 'height .3s' }} title={`Refunded: ₹${v.refunded.toLocaleString('en-IN')}`} />
                </div>
                <small style={{ fontSize: '10px', color: '#8290a5', fontWeight: 600 }}>{label}</small>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: '18px', marginTop: '12px', fontSize: '11px', color: '#53627b' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '12px', height: '12px', background: '#112b73', borderRadius: '3px' }} /> Revenue</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '12px', height: '12px', background: '#e73535', borderRadius: '3px' }} /> Refunded</span>
        </div>
      </section>
    )}
    <div className="payment-tabs">
      <button className={view === 'payments' ? 'active' : ''} onClick={() => setView('payments')}>Payment History ({payments.length})</button>
      <button className={view === 'invoices' ? 'active' : ''} onClick={() => setView('invoices')}>Invoices ({invoices.length})</button>
    </div>
    {refundError && <div style={{ marginBottom: '10px', padding: '10px 14px', background: '#fff0f0', border: '1px solid #f0c0c0', borderRadius: 8, fontSize: '13px', color: '#c00' }}><AlertTriangle size={14} /> {refundError}</div>}
    {refundSuccess && <div style={{ marginBottom: '10px', padding: '10px 14px', background: '#e6f9ee', border: '1px solid #a8e6c1', borderRadius: 8, fontSize: '13px', color: '#0b6b3f' }}><Check size={14} /> {refundSuccess}</div>}
    {receiptMsg && <div style={{ marginBottom: '10px', padding: '10px 14px', background: receiptMsg.startsWith('Receipt emailed') ? '#e6f9ee' : '#fff8e6', border: `1px solid ${receiptMsg.startsWith('Receipt emailed') ? '#a8e6c1' : '#f0d060'}`, borderRadius: 8, fontSize: '13px', color: receiptMsg.startsWith('Receipt emailed') ? '#0b6b3f' : '#8a6300' }}><Send size={14} /> {receiptMsg}</div>}
    {view === 'payments' && (
      <div className="table-card">
        <div className="table-head" style={{ gridTemplateColumns: '1.3fr 1.4fr .8fr .9fr .8fr .8fr' }}><span>CLIENT</span><span>SERVICE</span><span>AMOUNT</span><span>DATE</span><span>STATUS</span><span></span></div>
        {payments.length === 0 ? <div className="empty-state" style={{ padding: '30px' }}><DollarSign size={32} /><h3>No payment history</h3><p>Payments recorded through the system will appear here.</p></div> :
          payments.map((p, i) => <div className="table-row" key={i} style={{ gridTemplateColumns: '1.3fr 1.4fr .8fr .9fr .8fr .8fr' }}><div><strong>{p.client ?? clientName(p.clientId ?? p.ownerId) ?? '—'}</strong><small className="cid-small">{p.clientId ?? p.ownerId ?? ''}</small></div><div><span>{p.service ?? '—'}</span><small>{p.method ?? ''}</small></div><strong>₹{typeof p.amount === 'number' ? p.amount.toFixed(2) : (p.amount ?? '—')}</strong><span>{p.date ?? '—'}</span><span className={`status ${((p.status ?? 'paid').toLowerCase())}`}>{(p.status ?? 'PAID').toUpperCase()}</span><button className="link"><FileText size={13} /> View</button></div>)}
      </div>
    )}
    {view === 'invoices' && (
      <>
        {reasonOptions.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '12px', color: '#53627b', fontWeight: 600 }}>Refund reason:</span>
            <select value={reasonFilter} onChange={(e) => setReasonFilter(e.target.value)} className="species-filter" style={{ height: '34px' }}>
              <option value="all">All invoices ({invoices.length})</option>
              {reasonOptions.map((r) => <option key={r} value={r}>{r} ({invoices.filter((i) => i.refund_reason === r).length})</option>)}
            </select>
            {reasonFilter !== 'all' && <button className="link" onClick={() => setReasonFilter('all')}>Clear filter</button>}
          </div>
        )}
        <div className="table-card">
          <div className="table-head" style={{ gridTemplateColumns: '1.2fr 1.2fr 1.2fr .7fr .7fr .8fr 1.6fr' }}><span>INVOICE</span><span>CLIENT</span><span>PATIENT</span><span>TOTAL</span><span>PAID</span><span>STATUS</span><span></span></div>
          {filteredInvoices.length === 0 ? <div className="empty-state" style={{ padding: '30px' }}><FileText size={32} /><h3>No invoices match this filter</h3><p>Try a different refund reason or clear the filter.</p></div> :
            filteredInvoices.map((inv) => {
              const invId = inv.invoice_id ?? inv.invoiceId ?? '';
              const total = Number(inv.total ?? 0);
              const paid = Number(inv.paid_amount ?? 0);
              const refunded = Number(inv.refund_amount ?? 0);
              const refundable = paid - refunded;
              const status = (inv.status ?? 'draft').toLowerCase();
              return <div className="table-row" key={invId} style={{ gridTemplateColumns: '1.2fr 1.2fr 1.2fr .7fr .7fr .8fr 1.6fr' }}>
                <div><strong className="pid-text">{invId}</strong><small>{inv.created_at ? new Date(inv.created_at).toLocaleDateString('en-IN') : ''}</small>{refunded > 0 && inv.refund_reason && <small style={{ color: '#e73535' }}>Refund: {inv.refund_reason}</small>}</div>
                <div><span>{clientName(inv.client_id)}</span></div>
                <div><span>{patientName(inv.patient_id)}</span></div>
                <strong>₹{total.toFixed(2)}</strong>
                <strong style={{ color: paid > 0 ? '#0b6b3f' : undefined }}>₹{paid.toFixed(2)}</strong>
                <span className={`status ${status === 'refunded' ? 'overdue' : status === 'paid' ? 'paid' : status === 'issued' ? 'pending' : 'pending'}`}>{(inv.status ?? 'DRAFT').toUpperCase()}</span>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button className="link" onClick={() => downloadInvoicePdf(inv, patientName(inv.patient_id), clientName(inv.client_id))}><Download size={13} /> Download</button>
                  <button className="link" disabled={receiptSending === invId} onClick={() => handleSendReceipt(inv)}><Send size={13} /> {receiptSending === invId ? 'Sending...' : 'Receipt'}</button>
                  {refundable > 0 && <button className="link" style={{ color: '#e73535' }} disabled={refunding === invId} onClick={() => handleRefund(inv)}><RotateCw size={13} /> {refunding === invId ? 'Refunding...' : 'Refund'}</button>}
                </div>
              </div>;
            })}
        </div>
      </>
    )}
  </>;
}

function AdminSubscriptions() {
  const [subs, setSubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchSubscriptions().then(({ data }) => { if (data) setSubs(data as any[]); setLoading(false); });
  }, []);

  if (loading) return <div className="empty-state"><Loader2 size={28} className="spin" /><p>Loading subscriptions...</p></div>;

  return <>
    <div className="stats-row"><Stat number={String(subs.filter(s => (s.status ?? '').toLowerCase() === 'active').length)} label="Active" accent="green" /><Stat number={String(subs.filter(s => (s.status ?? '').toLowerCase() === 'pending').length)} label="Pending" accent="orange" /><Stat number={`₹${subs.reduce((s, x) => s + (typeof x.price === 'number' ? x.price : parseInt(String(x.price ?? '0').replace(/[^0-9]/g, ''), 10)), 0).toLocaleString('en-IN')}`} label="Total Value" accent="green" /></div>
    <div className="table-card">
      <div className="table-head"><span>CLIENT</span><span>PLAN</span><span>PRICE</span><span>START DATE</span><span>STATUS</span><span></span></div>
      {subs.map((s, i) => <div className="table-row" key={i}><div><strong>{s.client ?? s.clientId ?? '—'}</strong><small className="cid-small">{s.clientId ?? ''}</small></div><div><span>{s.plan ?? '—'}</span></div><strong>{s.price ?? '—'}</strong><span>{s.start ?? '—'}</span><span className={`status ${(s.status ?? '').toLowerCase()}`}>{(s.status ?? 'PENDING').toUpperCase()}</span></div>)}
    </div>
  </>;
}

function ClientMedicalRecords({ authUserId }: { authUserId: string }) {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authUserId) return;
    setLoading(true);
    fetchClinicalRecords().then(({ data }) => { if (data) setRecords(data as any[]); setLoading(false); });
  }, [authUserId]);

  if (loading) return <div className="empty-state"><Loader2 size={28} className="spin" /><p>Loading medical records...</p></div>;

  return <>
    <div className="searchbar" style={{ marginBottom: '14px' }}><Search size={17} /><input placeholder="Search by pet name, diagnosis, date..." /></div>
    {records.length === 0 ? <div className="empty-state"><FileText size={40} /><h3>No medical records</h3><p>Medical records will appear here after your pet's first visit.</p></div> : records.map((r, i) => (
      <div className="record-card" key={i}>
        <div className="record-pet">
          <div className="pet-icon"><PawPrint size={16} /></div>
          <div><strong>{r.pet ?? r.patientId ?? '—'}</strong><small>{r.species ?? ''} · {r.breed ?? ''} · Owner: {r.clientId ?? ''}</small></div>
        </div>
        <div className="record-grid">
          <div><label>VISIT DATE</label><strong>{r.date ?? '—'}</strong></div>
          <div><label>REASON</label><strong>{r.reason ?? '—'}</strong></div>
          <div><label>DIAGNOSIS</label><strong>{r.diagnosis ?? '—'}</strong></div>
          <div><label>TREATMENT</label><strong>{r.treatment ?? '—'}</strong></div>
          <div><label>NOTES</label><strong>{r.notes ?? '—'}</strong></div>
          <div><label>FOLLOW-UP</label><strong>{r.followup ?? '—'}</strong></div>
        </div>
      </div>
    ))}
  </>;
}

function DoctorClinicalRecordsPage({ setModal, authUserId, refreshKey }: { setModal: (s: string | null) => void; authUserId: string; refreshKey: number }) {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true); setError(null);
    fetchClinicalRecords().then(({ data, error: e }) => {
      if (e) setError(e);
      else if (data) setRecords(data as any[]);
      setLoading(false);
    });
  }, [refreshKey]);

  if (loading) return <div className="empty-state"><Loader2 size={28} className="spin" /><p>Loading clinical records...</p></div>;
  if (error) return <div className="empty-state"><AlertTriangle size={32} /><h3>Could not load records</h3><p>{error}</p><button className="primary" onClick={() => { setLoading(true); setError(null); fetchClinicalRecords().then(({ data, error: e }) => { if (e) setError(e); else if (data) setRecords(data as any[]); setLoading(false); }); }}><RotateCw size={16} /> Retry</button></div>;

  const filtered = records.filter((r) => {
    const q = search.toLowerCase();
    return !q || `${r.pet ?? r.patientId ?? ''} ${r.reason ?? ''} ${r.diagnosis ?? ''} ${r.date ?? ''}`.toLowerCase().includes(q);
  });

  return <>
    <div className="searchbar" style={{ marginBottom: '14px' }}><Search size={17} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by pet, diagnosis, date..." /></div>
    {filtered.length === 0 ? <div className="empty-state"><FileText size={40} /><h3>No clinical records</h3><p>Clinical records from visits will appear here.</p><button className="primary" onClick={() => setModal('Add Clinical Record')}><Plus size={16} /> Add Clinical Record</button></div> : filtered.map((r, i) => (
      <div className="record-card" key={i}>
        <div className="record-pet">
          <div className="pet-icon"><PawPrint size={16} /></div>
          <div><strong>{r.pet ?? r.patientId ?? '—'}</strong><small>{r.date ?? '—'}</small></div>
        </div>
        <div className="record-grid">
          <div><label>REASON</label><strong>{r.reason ?? '—'}</strong></div>
          <div><label>DIAGNOSIS</label><strong>{r.diagnosis ?? '—'}</strong></div>
          <div><label>TREATMENT</label><strong>{r.treatment ?? '—'}</strong></div>
          <div><label>NOTES</label><strong>{r.notes ?? '—'}</strong></div>
          <div><label>FOLLOW-UP</label><strong>{r.followup ?? '—'}</strong></div>
        </div>
      </div>
    ))}
  </>;
}

function ClientPrescriptions({ authUserId, refreshKey }: { authUserId: string; refreshKey: number }) {
  const [rxList, setRxList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!authUserId) return;
    setLoading(true);
    fetchPrescriptionsByClient(authUserId).then(({ data }) => { if (data) setRxList(data as any[]); setLoading(false); });
  }, [authUserId, refreshKey]);
  if (loading) return <div className="empty-state"><Loader2 size={28} className="spin" /><p>Loading prescriptions...</p></div>;
  return <>
    <div className="rx-notice"><AlertTriangle size={16} /><p>Prescriptions are created by your veterinarian. You can view and download them but cannot create or edit prescriptions.</p></div>
    {rxList.length === 0 ? <div className="empty-state"><ClipboardList size={40} /><h3>No prescriptions</h3><p>Prescriptions from your veterinarian will appear here.</p></div> : rxList.map((r, i) => (
      <div className="rx-card" key={i}>
        <div className="pet-icon"><PawPrint size={16} /></div>
        <div><strong>{r.pet ?? r.patientId ?? '—'} <span className="dot">·</span> <small>{r.vet ?? '—'} · {r.date ?? '—'}</small></strong>
          <div className="rx-meds">{r.meds ?? r.medicationName ?? '—'}</div>
          <small>Status: <em className={`status ${(r.status ?? '').toLowerCase() === 'active' ? 'confirmed' : 'pending'}`}>{(r.status ?? 'PENDING').toUpperCase()}</em></small>
        </div>
        <div className="rx-actions"><button className="link" onClick={async () => { const id = r.id ?? r.prescriptionId; if (!id) return; const { data } = await fetchPrescriptionPdf(id); if (data?.url) window.open(data.url, '_blank'); }}><Download size={13} /> Download PDF</button><button className="link">View Details</button></div>
      </div>
    ))}
  </>;
}

function DoctorPrescriptions({ setModal, refreshKey }: { setModal: (s: string | null) => void; refreshKey: number }) {
  const [rxList, setRxList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<string | null>(null);
  const [rxError, setRxError] = useState<string | null>(null);
  const loadRx = () => fetchPrescriptions().then(({ data, error: e }) => { if (e) setRxError(e); else if (data) setRxList(data as any[]); setLoading(false); });
  useEffect(() => {
    setLoading(true); loadRx();
  }, [refreshKey]);
  if (loading) return <div className="empty-state"><Loader2 size={28} className="spin" /><p>Loading prescriptions...</p></div>;
  return <>
    <div style={{ marginBottom: '12px' }}><button className="primary" onClick={() => setModal('Add Prescription')}><Plus size={16} /> Add Prescription</button></div>
    {rxError && <div style={{ marginBottom: '10px', padding: '10px 14px', background: '#fff0f0', border: '1px solid #f0c0c0', borderRadius: 8, fontSize: '13px', color: '#c00' }}><AlertTriangle size={14} /> {rxError}</div>}
    {rxList.length === 0 ? <div className="empty-state"><ClipboardList size={40} /><h3>No prescriptions</h3><p>Prescriptions you create will appear here.</p></div> : <div className="table-card">
      <div className="table-head"><span>PET</span><span>MEDICATION</span><span>DATE</span><span>STATUS</span><span>ACTIONS</span></div>
      {rxList.map((r, i) => <div className="table-row" key={i}><div><strong>{r.petName ?? r.pet ?? r.patientId ?? '—'}</strong></div><div><span>{r.meds ?? '—'}</span></div><span>{r.date ?? '—'}</span><span className={`status ${(r.status ?? '').toLowerCase() === 'finalized' ? 'confirmed' : 'pending'}`}>{(r.status ?? 'DRAFT').toUpperCase()}</span><div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {r.status !== 'finalized' && <button className="link" disabled={actioning === (r.rxId ?? r.id)} onClick={async () => { const id = r.rxId ?? r.id; if (!id) return; setActioning(id); const { error: fErr } = await finalizePrescription(id); setActioning(null); if (fErr) { setRxError(fErr); return; } setRxList((prev) => prev.map((x) => (x.rxId ?? x.id) === id ? { ...x, status: 'finalized' } : x)); }}><Lock size={13} /> {actioning === (r.rxId ?? r.id) ? 'Locking...' : 'Finalize'}</button>}
        {r.status === 'finalized' && <button className="link" onClick={async () => { const id = r.rxId ?? r.id; if (!id) return; const { data, error: pErr } = await fetchPrescriptionPdf(id); if (pErr) { setRxError(pErr); return; } if (data?.url) window.open(data.url, '_blank'); }}><Download size={13} /> PDF</button>}
        <button className="link"><FileText size={13} /> View</button>
      </div></div>)}
    </div>}
  </>;
}

function ClientSubscription({ authUserId }: { authUserId: string }) {
  const [mySub, setMySub] = useState<any | null>(null);
  const [availPlans, setAvailPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    fetchSubscriptions().then(({ data }) => {
      if (data) { const mine = (data as any[]).find((s) => s.ownerId === authUserId || s.clientId === authUserId); if (mine) setMySub(mine); }
    });
    fetchSubscriptionPlans().then(({ data }) => { if (data) setAvailPlans(data as any[]); });
    setLoading(false);
  }, [authUserId]);
  if (loading) return <div className="empty-state"><Loader2 size={28} className="spin" /><p>Loading subscription...</p></div>;
  return <>
    {mySub && <div className="detail-card" style={{ minHeight: 'auto', marginBottom: '16px' }}>
      <div className="detail-head"><div className="avatar large" style={{ background: '#112b73', color: '#fff' }}>{(mySub.plan ?? 'G')[0]}</div><div><h2>Current Subscription</h2><p>{mySub.plan ?? '—'} · {(mySub.status ?? '').toLowerCase() === 'active' ? 'Active' : '—'}{mySub.start ? ` since ${mySub.start}` : ''}</p></div></div>
      <div className="detail-content">
        <div className="info-grid">
          <div><label>PLAN</label><strong>{mySub.plan ?? '—'}</strong></div>
          <div><label>PRICE</label><strong>{mySub.price ?? '—'}</strong></div>
          <div><label>STATUS</label><strong style={{ color: '#0b9b55' }}>{(mySub.status ?? '—').toUpperCase()}</strong></div>
          <div><label>RENEWS ON</label><strong>{mySub.renew ?? '—'}</strong></div>
        </div>
      </div>
    </div>}
    <div className="panel">
      <div className="panel-title"><h3>Available Plans</h3></div>
      <div className="plan-grid">
        {availPlans.map((p, i) => (
          <div key={p.name ?? i} className={`plan-card ${p.current ? 'current' : ''}`}>
            {p.current && <span className="current-badge">Current Plan</span>}
            <h4>{p.name}</h4>
            <div className="price">{p.price}<small>{p.period}</small></div>
            <ul>{(p.benefits ?? []).map((b: string) => <li key={b}><Check size={14} />{b}</li>)}</ul>
            {p.current ? <button className="secondary" disabled style={{ opacity: 0.6 }}>Current Plan</button> : <button className="primary">Select Plan</button>}
          </div>
        ))}
      </div>
    </div>
  </>;
}

function ClientProfile({ profile, setProfile, authUser }: { profile: { name: string; phone: string; email: string; address: string }; setProfile: (p: any) => void; authUser: { sub: string; name: string; phone: string; email: string } | null }) {
  const [form, setForm] = useState(profile);
  const clientId = authUser?.sub ?? '';
  return <>
    <section className="detail-card" style={{ minHeight: 'auto', marginBottom: '16px' }}>
      <div className="detail-head"><div className="avatar large">P</div><div><h2>{profile.name}</h2><p><span className="cid-badge-large">{clientId}</span> Mumbai, Maharashtra · Joined Mar 2025</p></div></div>
      <div className="detail-content">
        <div className="info-grid" style={{ marginBottom: '16px' }}>
          <div><label>CLIENT ID</label><strong className="cid-text">{clientId}</strong></div>
          <div><label>STATUS</label><strong style={{ color: '#0b9b55' }}>Active</strong></div>
        </div>
        <div className="profile-form">
          <label>Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label>Phone<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
          <label>Email<input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
          <label className="wide">Address<input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></label>
          <div className="save-row">
            <button className="secondary" onClick={() => setForm(profile)}>Cancel</button>
            <button className="primary" onClick={() => setProfile(form)}><Check size={16} /> Save Changes</button>
          </div>
          <p style={{ color: '#e8870a', fontSize: '12px', marginTop: '8px', display: 'flex', gap: '6px', alignItems: 'center' }}><AlertTriangle size={12} /> Local changes — not saved to server. Profile update endpoint not yet connected.</p>
        </div>
      </div>
    </section>
    <GpsLocationPicker clientId={clientId} />
  </>;
}

function DoctorApproval({ pendingDocs, setPendingDocs, activeDocs, setActiveDocs, setModal }: any) {
  const [approving, setApproving] = useState<string | null>(null);
  if (pendingDocs.length === 0) return <div className="empty-state"><Check size={40} /><h3>No pending approvals</h3><p>All doctor applications have been reviewed.</p></div>;
  return <>
    <div className="panel" style={{ marginBottom: '16px' }}>
      <div className="panel-title"><h3>Pending Doctor Applications</h3><span className="status pending">{pendingDocs.length} PENDING</span></div>
    </div>
    {pendingDocs.map((d: any, i: number) => (
      <div className="doctor-card" key={d.name}>
        <div className="pet-icon"><Stethoscope size={19} /></div>
        <div className="doctor-info">
          <strong>{d.name}</strong><br /><small>{d.specialty} · Applied {d.applied}</small>
          <div className="doctor-details">
            <div><label>EMAIL</label><strong>{d.email}</strong></div>
            <div><label>PHONE</label><strong>{d.phone}</strong></div>
            <div><label>LICENSE</label><strong>{d.license}</strong></div>
            <div><label>EXPERIENCE</label><strong>{d.experience}</strong></div>
            <div><label>CLINIC</label><strong>{d.clinic}</strong></div>
          </div>
        </div>
        <div className="doctor-actions">
          <button className="approve-btn" disabled={approving === d.doctorId} onClick={async () => {
            setApproving(d.doctorId);
            const adminId = (window as any).__vetwiseUserId ?? 'demo_admin';
            const { error } = await dbApproveDoctor(d.doctorId, adminId);
            if (error) {
              setActiveDocs([...activeDocs, { ...d, joined: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) }]);
            }
            setPendingDocs(pendingDocs.filter((_: any, idx: number) => idx !== i));
            setApproving(null);
          }}><Check size={14} /> {approving === d.doctorId ? 'Approving...' : 'Approve'}</button>
          <button className="danger-btn" disabled={approving === d.doctorId} onClick={async () => {
            setApproving(d.doctorId);
            await dbRejectDoctor(d.doctorId, 'Not specified');
            setPendingDocs(pendingDocs.filter((_: any, idx: number) => idx !== i));
            setApproving(null);
          }}><Ban size={14} /> Reject</button>
        </div>
      </div>
    ))}
  </>;
}

function DoctorsList({ activeDocs }: { activeDocs: any[] }) {
  return <>
    <div className="stats-row"><Stat number={String(activeDocs.length)} label="Active Doctors" /><Stat number="2" label="Specialties" /><Stat number="0" label="Suspended" /></div>
    <div className="table-card">
      <div className="table-head"><span>NAME</span><span>SPECIALTY</span><span>LICENSE</span><span>JOINED</span></div>
      {activeDocs.map((d) => <div className="table-row" key={d.name}><div><strong>{d.name}</strong><small>{d.email}</small></div><div><span>{d.specialty}</span></div><div><span>{d.license}</span></div><div><span>{d.joined}</span></div></div>)}
    </div>
  </>;
}

function Followups() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    fetchClinicalRecords().then(({ data }) => { if (data) setRecords(data as any[]); setLoading(false); });
  }, []);
  const rows = records.map((r) => ({ pet: r.pet ?? r.patientId ?? '—', owner: r.clientId ?? '—', reason: r.followup ?? r.notes ?? '—', status: r.followup ? 'PENDING' : 'COMPLETED' }));
  const overdue = rows.filter((r) => r.status === 'OVERDUE').length;
  const pending = rows.filter((r) => r.status === 'PENDING').length;
  if (loading) return <div className="empty-state"><Loader2 size={28} className="spin" /><p>Loading follow-ups...</p></div>;
  return <>
    <div className="stats-row"><Stat number={String(overdue)} label="Overdue" accent="red" /><Stat number={String(pending)} label="Pending" accent="blue" /><Stat number={String(rows.length - overdue - pending)} label="Completed" accent="green" /></div>
    {rows.length === 0 ? <div className="empty-state"><Clock3 size={40} /><h3>No follow-ups</h3><p>Patients requiring follow-up visits will appear here.</p></div> : <div className="follow-list">{rows.map((r, i) => (
      <div className="follow-card" key={i}>
        <div className="pet-icon"><PawPrint size={18} /></div>
        <div><strong>{r.pet} <span className="dot">·</span> <small>{r.owner}</small> <em className={`status ${r.status.toLowerCase()}`}>{r.status}</em></strong><p>{r.reason}</p></div>
        <div className="follow-actions"><button className="link">Open Patient</button><button className="link">Open Client</button><button className="link">Open Record</button></div>
      </div>
    ))}</div>}
  </>;
}

function CalendarView({ appointments, onEdit }: { appointments: any[]; onEdit: (a: any) => void }) {
  const [month, setMonth] = useState(new Date());
  const year = month.getFullYear();
  const m = month.getMonth();
  const firstDay = new Date(year, m, 1);
  const lastDay = new Date(year, m + 1, 0);
  const startWeekday = firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  const today = new Date();
  const isToday = (d: number) => today.getFullYear() === year && today.getMonth() === m && today.getDate() === d;
  const apptsByDate: Record<string, any[]> = {};
  for (const a of appointments) {
    const dateStr = a.date ?? a.preferred_date ?? '';
    if (dateStr) { (apptsByDate[dateStr] ??= []).push(a); }
  }
  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  const monthName = month.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  return <div className="calendar-view">
    <div className="calendar-header"><button className="secondary" onClick={() => setMonth(new Date(year, m - 1, 1))}>‹</button><strong>{monthName}</strong><button className="secondary" onClick={() => setMonth(new Date(year, m + 1, 1))}>›</button></div>
    <div className="calendar-grid">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => <div key={d} className="calendar-dow">{d}</div>)}
      {cells.map((d, i) => {
        if (d === null) return <div key={i} className="calendar-cell empty" />;
        const dateStr = `${year}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dayAppts = apptsByDate[dateStr] ?? [];
        return <div key={i} className={`calendar-cell ${isToday(d) ? 'today' : ''} ${dayAppts.length > 0 ? 'has-appts' : ''}`}>
          <span className="calendar-day">{d}</span>
          {dayAppts.slice(0, 3).map((a, j) => <button key={j} className="calendar-appt" onClick={() => onEdit(a)}><span className={`status-dot ${(a.status ?? 'pending').toLowerCase()}`} /> {a.preferred_time ?? a.time ?? ''} {a.patients?.name ?? a.pet ?? 'Visit'}</button>)}
          {dayAppts.length > 3 && <small className="calendar-more">+{dayAppts.length - 3} more</small>}
        </div>;
      })}
    </div>
  </div>;
}

function AppointmentRemindersPage({ role }: { role: Role }) {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);
  const [sendResult, setSendResult] = useState<Record<string, { ok: boolean; msg: string }>>({});

  useEffect(() => {
    Promise.all([fetchAppointments(), fetchClients(), fetchAppointmentReminders()]).then(([apptRes, cliRes, remRes]) => {
      if (apptRes.data) setAppointments(apptRes.data as any[]);
      if (cliRes.data) setClients(cliRes.data as any[]);
      if (remRes.data) setReminders(remRes.data as any[]);
      setLoading(false);
    });
  }, []);

  const upcomingAppts = appointments.filter((a) => {
    const status = (a.status ?? '').toLowerCase();
    if (['cancelled', 'completed', 'done'].includes(status)) return false;
    const d = new Date(a.preferred_date ?? a.preferredDate ?? a.date ?? '');
    return d >= new Date(new Date().toDateString());
  });

  const handleSendReminder = async (appt: any) => {
    const apptId = appt.id ?? appt.appointmentId ?? '';
    const petName = appt.patients?.name ?? appt.pet ?? 'your pet';
    const apptDate = appt.preferred_date ?? appt.preferredDate ?? appt.date ?? '';
    const apptTime = appt.preferred_time ?? appt.time ?? '';
    const apptType = appt.reason ?? appt.appointmentType ?? '';
    const cid = appt.client_id ?? appt.clientId ?? appt.ownerId ?? '';
    const client = clients.find((c: any) => (c.ownerId ?? c.clientId) === cid);
    const email = client?.email ?? '';
    const clientName = client?.name ?? '';

    if (!email) {
      setSendResult((prev) => ({ ...prev, [apptId]: { ok: false, msg: 'No email on file for this client' } }));
      return;
    }

    setSending(apptId);
    setSendResult((prev) => ({ ...prev, [apptId]: { ok: false, msg: '' } }));
    const { data, error } = await sendAppointmentReminder({
      recipientEmail: email,
      recipientName: clientName,
      patientName: petName,
      appointmentDate: apptDate,
      appointmentTime: apptTime,
      appointmentType: apptType,
      clientId: cid,
    });
    setSending(null);
    if (error) {
      setSendResult((prev) => ({ ...prev, [apptId]: { ok: false, msg: error } }));
    } else {
      setSendResult((prev) => ({ ...prev, [apptId]: { ok: true, msg: `Reminder queued for ${email}` } }));
      setReminders((prev) => [...prev, { appointment_id: apptId, status: 'sent', sent_at: new Date().toISOString() }]);
    }
  };

  const sentReminderApptIds = new Set(reminders.filter((r) => r.status === 'sent').map((r) => r.appointment_id));

  if (loading) return <div className="empty-state"><Loader2 size={28} className="spin" /><p>Loading appointments...</p></div>;

  if (role === 'client') {
    return <div className="empty-state"><Send size={36} /><h3>Appointment Reminders</h3><p>You will receive email reminders for your upcoming appointments automatically. No action needed.</p></div>;
  }

  return (
    <div className="reminders-page">
      <div style={{ background: '#f4f7fc', border: '1px solid #d6e0f0', borderRadius: 8, padding: '12px 16px', marginBottom: '16px', fontSize: '13px', color: '#3d4d6b' }}>
        <strong>How reminders work:</strong> Click "Send Reminder" to email the client a confirmation for their upcoming appointment. Reminders are sent via the VetWise notification system and duplicate sends are tracked.
      </div>
      {upcomingAppts.length === 0 ? (
        <div className="empty-state"><CalendarDays size={36} /><h3>No upcoming appointments</h3><p>Appointments with pending or confirmed status will appear here for reminder sending.</p></div>
      ) : (
        <div className="table-card">
          <div className="table-head" style={{ gridTemplateColumns: '1.5fr 1.5fr 1fr 1fr 1fr 1.2fr' }}>
            <span>PET</span><span>CLIENT</span><span>DATE</span><span>TIME</span><span>STATUS</span><span></span>
          </div>
          {upcomingAppts.map((a, i) => {
            const apptId = a.id ?? a.appointmentId ?? i;
            const petName = a.patients?.name ?? a.pet ?? 'Unknown';
            const cid = a.client_id ?? a.clientId ?? a.ownerId ?? '';
            const client = clients.find((c: any) => (c.ownerId ?? c.clientId) === cid);
            const clientName = client?.name ?? '—';
            const apptDate = a.preferred_date ?? a.preferredDate ?? a.date ?? '—';
            const apptTime = a.preferred_time ?? a.time ?? '—';
            const alreadySent = sentReminderApptIds.has(String(apptId));
            const result = sendResult[String(apptId)];
            return (
              <div className="table-row" key={apptId} style={{ gridTemplateColumns: '1.5fr 1.5fr 1fr 1fr 1fr 1.2fr' }}>
                <div><strong>{petName}</strong></div>
                <div><strong>{clientName}</strong>{client?.email && <small>{client.email}</small>}</div>
                <div><span>{apptDate}</span></div>
                <div><span>{apptTime}</span></div>
                <div><span className={`status ${(a.status ?? 'pending').toLowerCase()}`}>{(a.status ?? 'PENDING').toUpperCase()}</span></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <button
                    className={alreadySent ? 'secondary' : 'primary'}
                    style={{ fontSize: '11px', padding: '5px 10px' }}
                    disabled={sending === String(apptId)}
                    onClick={() => handleSendReminder(a)}
                  >
                    {sending === String(apptId) ? <Loader2 size={12} className="spin" /> : <Send size={12} />} {alreadySent ? 'Resend' : 'Send Reminder'}
                  </button>
                  {result && (
                    <small style={{ color: result.ok ? '#0b9b55' : '#e73535', fontSize: '11px' }}>{result.msg}</small>
                  )}
                  {alreadySent && !result && (
                    <small style={{ color: '#687993', fontSize: '11px' }}>Reminder previously sent</small>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AppointmentsPage({ role, setModal, setEditTarget, authUserId, refreshKey }: { role: Role; setModal: (s: string | null) => void; setEditTarget: (t: any) => void; authUserId: string; refreshKey: number }) {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [apptError, setApptError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [calDate, setCalDate] = useState(new Date());

  useEffect(() => {
    if (!authUserId) return;
    setLoading(true);
    setApptError(null);
    if (role === 'client') {
      fetchClientsByUser(authUserId).then(({ data: clientsData }) => {
        if (clientsData && clientsData.length > 0) {
          fetchAppointmentsByClient(clientsData[0].ownerId).then(({ data, error }) => {
            if (error) { setApptError(error); setLoading(false); }
            else if (data) { setAppointments(data); setLoading(false); }
          });
        } else { setLoading(false); }
      });
    } else {
      fetchAppointments().then(({ data, error }) => {
        if (error) { setApptError(error); setLoading(false); }
        else if (data) { setAppointments(data); setLoading(false); }
      });
    }
  }, [authUserId, role, refreshKey]);

  if (loading) return <div className="empty-state"><Loader2 size={28} className="spin" /><p>Loading appointments...</p></div>;
  if (apptError) return <div className="empty-state"><AlertTriangle size={32} /><h3>Could not load appointments</h3><p>{apptError}</p><button className="primary" onClick={() => { setLoading(true); setApptError(null); fetchAppointments().then(({ data, error }) => { if (error) setApptError(error); else if (data) setAppointments(data); setLoading(false); }); }}><RotateCw size={16} /> Retry</button></div>;

  if (appointments.length === 0) {
    if (role === 'client') return <div className="empty-state"><CalendarDays size={40} /><h3>No upcoming visits</h3><p>Book a visit for your pet and keep their care on track.</p><button className="primary" onClick={() => setModal('Book a Visit')}><Plus size={16} /> Book appointment</button></div>;
    return <div className="empty-state"><CalendarDays size={40} /><h3>No appointments</h3><p>Appointments will appear here once they are booked.</p></div>;
  }

  return <>
    <div className="appointment-toolbar"><div className="date-switch"><button onClick={() => { const d = new Date(calDate); d.setDate(d.getDate() - 1); setCalDate(d); }}>‹</button><strong>{calDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</strong><button onClick={() => { const d = new Date(calDate); d.setDate(d.getDate() + 1); setCalDate(d); }}>›</button></div><div className="view-toggle"><button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}>List</button><button className={viewMode === 'calendar' ? 'active' : ''} onClick={() => setViewMode('calendar')}>Calendar</button></div></div>
    {viewMode === 'calendar' ? <CalendarView appointments={appointments} onEdit={(a) => { setEditTarget(a); setModal('Edit Appointment'); }} /> : <div className="appointment-list">{appointments.map((a, i) => {
      const petName = a.patients?.name ?? a.pet ?? 'Unknown';
      const clientName = a.clients?.full_name ?? a.client ?? '';
      const apptTime = a.preferred_time ?? a.time ?? '';
      const apptReason = a.reason ?? '';
      const apptStatus = a.status ?? 'Pending';
      const apptLocation = a.visit_location ?? a.visitLocation ?? 'Address not set';
      const apptPid = a.patient_id ?? a.patientId ?? '';
      const apptCid = a.client_id ?? a.clientId ?? '';
      return (
        <div className="appointment-card appt-with-location" key={a.id ?? i}>
          <div className="time">{apptTime}<small>30 min</small></div>
          <div className="pet-icon"><PawPrint size={18} /></div>
          <div className="appt-main"><strong>{petName}</strong><span>{clientName}</span><small>{apptReason}</small>
            <div className="appt-location"><MapPin size={11} /> {apptLocation}</div>
          </div>
          <div className="appt-ids"><small className="pid-small">{apptPid}</small><small className="cid-small">{apptCid}</small></div>
          <span className={`status ${apptStatus.toLowerCase()}`}>{apptStatus.toUpperCase()}</span>
          <div className="appt-actions">
            <button className="link" onClick={() => { setEditTarget(a); setModal('Edit Appointment'); }}><Pencil size={13} /> Edit</button>
            {(apptStatus.toLowerCase() === 'pending' || apptStatus.toLowerCase() === 'confirmed') && <button className="link" style={{ color: '#e73535' }} onClick={async () => { await updateAppointment(a.id ?? a.appointmentId ?? '', { status: 'cancelled' }); setAppointments((prev) => prev.map((x, xi) => xi === i ? { ...x, status: 'cancelled' } : x)); }}><Ban size={13} /> Cancel</button>}
          </div>
        </div>
      );
    })}</div>}
  </>;
}

function Dashboard({ role, navigate, pendingDocs, activeDocs, authUserId, myPets, refreshKey }: { role: Role; navigate: (p: Page) => void; pendingDocs: any[]; activeDocs: any[]; authUserId: string; myPets: any[]; refreshKey: number }) {
  const [stats, setStats] = useState({ clients: 0, patients: 0, appointments: 0, revenue: 0, subs: 0, myPets: 0, myAppts: 0, myRx: 0, myUpcomingPayments: 0 });
  const [dashAppts, setDashAppts] = useState<any[]>([]);
  const [dashPayments, setDashPayments] = useState<any[]>([]);

  useEffect(() => {
    fetchClients().then(({ data }) => { if (data) setStats(s => ({ ...s, clients: (data as any[]).length })); });
    fetchPatients().then(({ data }) => { if (data) setStats(s => ({ ...s, patients: (data as any[]).length })); });
    fetchAppointments().then(({ data }) => { if (data) { setStats(s => ({ ...s, appointments: (data as any[]).length })); setDashAppts(data as any[]); } });
    fetchPayments().then(({ data }) => { if (data) { const p = data as any[]; setDashPayments(p); const rev = p.filter((x: any) => x.status === 'paid').reduce((sum, x) => sum + (x.amount ?? 0), 0); setStats(s => ({ ...s, revenue: rev })); } });
    fetchSubscriptions().then(({ data }) => { if (data) setStats(s => ({ ...s, subs: (data as any[]).filter((x: any) => x.status === 'active').length })); });
    if (role === 'client' && authUserId) {
      setStats(s => ({ ...s, myPets: myPets.length }));
      fetchClientsByUser(authUserId).then(({ data }) => {
        if (data && data.length > 0) {
          fetchAppointmentsByClient(data[0].ownerId).then(({ data: appts }) => { if (appts) setStats(s => ({ ...s, myAppts: (appts as any[]).filter(a => a.status === 'pending' || a.status === 'confirmed').length })); });
        }
      });
      fetchPrescriptionsByClient(authUserId).then(({ data }) => { if (data) setStats(s => ({ ...s, myRx: (data as any[]).filter((r: any) => r.status === 'finalized').length })); });
      fetchPaymentsByClient(authUserId).then(({ data }) => { if (data) setStats(s => ({ ...s, myUpcomingPayments: (data as any[]).filter((p: any) => p.status === 'created' || p.status === 'pending').length })); });
    }
  }, [role, authUserId, myPets, refreshKey]);
  if (role === 'admin') {
    return <div className="dashboard">
      <div className="welcome"><div><p className="eyebrow">ADMIN OVERVIEW</p><h2>Practice at a glance.</h2></div></div>
      <div className="stats-row four"><Stat number={String(activeDocs.length)} label="Active Doctors" /><Stat number={String(pendingDocs.length)} label="Pending Approvals" accent="orange" /><Stat number={String(stats.clients)} label="Clients" /><Stat number={String(stats.patients)} label="Patients" /></div>
      <div className="stats-row"><Stat number={String(stats.appointments)} label="Appointments" /><Stat number={`₹${stats.revenue.toLocaleString('en-IN')}`} label="Total Revenue" accent="green" /><Stat number={String(stats.subs)} label="Active Subscriptions" /></div>
      <div className="dashboard-grid">
        <section className="panel"><div className="panel-title"><h3>Pending Doctor Approvals</h3><button className="link" onClick={() => navigate('Doctor Approval')}>View all <ArrowUpRight size={14} /></button></div>
          {pendingDocs.length > 0 ? pendingDocs.map((d) => <div className="simple-row" key={d.name}><div className="pet-icon"><Stethoscope size={16} /></div><div><strong>{d.name}</strong><small>{d.specialty} · Applied {d.applied}</small></div><span className="status pending">PENDING</span></div>) : <p style={{ color: '#a4aebe', fontSize: '13px', padding: '12px 0' }}>No pending approvals.</p>}
        </section>
        <section className="panel"><div className="panel-title"><h3>Recent Payments</h3></div>
          {dashPayments.slice(0, 3).map((p, i) => <div className="simple-row" key={i}><div className="pet-icon"><DollarSign size={16} /></div><div><strong>{p.client ?? p.clientId ?? '—'}</strong><small>{p.service ?? '—'} · {p.amount ?? '—'}</small></div><span className="status paid">PAID</span></div>)}
        </section>
      </div>
      <div className="dashboard-grid">
        <section className="panel"><div className="panel-title"><h3>Quick Actions</h3></div>
          <button className="quick-action" onClick={() => navigate('Shop Orders')}><Package size={16} />Manage shop orders<ArrowUpRight size={14} /></button>
          <button className="quick-action" onClick={() => navigate('Shop Products')}><Package size={16} />Manage products<ArrowUpRight size={14} /></button>
          <button className="quick-action" onClick={() => navigate('Doctor Approval')}><Activity size={16} />Review doctor approvals<ArrowUpRight size={14} /></button>
        </section>
      </div>
    </div>;
  }
  if (role === 'client') {
    return <div className="dashboard">
      <div className="welcome"><div><p className="eyebrow">YOUR PET CARE</p><h2>How are your pets doing today?</h2></div><button className="primary" onClick={() => navigate('Visits')}><Plus size={16} /> Book a visit</button></div>
      <div className="stats-row four"><Stat number={String(stats.myPets)} label="My Pets" /><Stat number={String(stats.myAppts)} label="Upcoming visits" /><Stat number={String(stats.myRx)} label="Active prescriptions" /><Stat number={String(stats.myUpcomingPayments)} label="Upcoming payments" accent="orange" /></div>
      <div className="dashboard-grid">
        <section className="panel"><div className="panel-title"><h3>Your pets</h3><button className="link" onClick={() => navigate('My Pets')}>View all <ArrowUpRight size={14} /></button></div>
          {myPets.length > 0 ? myPets.slice(0, 4).map((p) => <div className="simple-row" key={p.petId ?? p.name}><div className="pet-icon"><PawPrint size={16} /></div><div><strong>{p.name} · {p.species}</strong><small>{p.breed ?? '—'}</small></div><span className="status confirmed">ACTIVE</span></div>) : <p style={{ color: '#a4aebe', fontSize: '13px', padding: '12px 0' }}>No pets registered yet.</p>}
        </section>
        <section className="panel"><div className="panel-title"><h3>Quick actions</h3></div>
          <button className="quick-action" onClick={() => navigate('Shop')}><ShoppingCart size={16} />Shop for your pets<ArrowUpRight size={14} /></button>
          <button className="quick-action" onClick={() => navigate('Medical Records')}><Activity size={16} />View medical records<ArrowUpRight size={14} /></button>
          <button className="quick-action" onClick={() => navigate('My Orders')}><Package size={16} />View my orders<ArrowUpRight size={14} /></button>
        </section>
      </div>
      <ShopHomeSections navigate={navigate} />
    </div>;
  }
  return <div className="dashboard">
    <div className="welcome"><div><p className="eyebrow">GOOD MORNING, DOCTOR</p><h2>Here's what needs your attention.</h2></div><button className="primary" onClick={() => navigate('Appointments')}><Plus size={16} /> New appointment</button></div>
    <div className="stats-row four"><Stat number={String(stats.appointments)} label="Appointments" /><Stat number={String(dashAppts.filter(a => (a.status ?? '').toLowerCase() === 'pending' || (a.status ?? '').toLowerCase() === 'confirmed').length)} label="Upcoming visits" /><Stat number={String(stats.patients)} label="Patients" /><Stat number={`₹${stats.revenue.toLocaleString('en-IN')}`} label="Total revenue" accent="green" /></div>
    <div className="dashboard-grid">
      <section className="panel"><div className="panel-title"><h3>Upcoming appointments</h3><button className="link" onClick={() => navigate('Appointments')}>View all <ArrowUpRight size={14} /></button></div>
        {dashAppts.length > 0 ? dashAppts.slice(0, 5).map((a, i) => <div className="simple-row" key={a.id ?? i}><div className="pet-icon"><PawPrint size={16} /></div><div><strong>{a.patients?.name ?? a.pet ?? 'Unknown'} · {a.reason ?? 'Visit'}</strong><small>{a.preferred_date ?? ''} {a.preferred_time ?? ''}</small></div><span className={`status ${(a.status ?? 'pending').toLowerCase()}`}>{(a.status ?? 'PENDING').toUpperCase()}</span></div>) : <p style={{ color: '#a4aebe', fontSize: '13px', padding: '12px 0' }}>No upcoming appointments.</p>}
      </section>
      <section className="panel"><div className="panel-title"><h3>Quick actions</h3></div>
        <button className="quick-action" onClick={() => navigate('Clinical Records')}><FileText size={16} />View clinical records<ArrowUpRight size={14} /></button>
        <button className="quick-action" onClick={() => navigate('Prescriptions')}><ClipboardList size={16} />Manage prescriptions<ArrowUpRight size={14} /></button>
        <button className="quick-action" onClick={() => navigate('Settings')}><Settings size={16} />Update profile<ArrowUpRight size={14} /></button>
      </section>
    </div>
  </div>;
}

function ShopHomeSections({ navigate }: { navigate: (p: Page) => void }) {
  const cats = [
    { name: 'Medicines', icon: <Pill size={20} /> },
    { name: 'Pet Food', icon: <Package size={20} /> },
    { name: 'Animal Food', icon: <Package size={20} /> },
    { name: 'Supplements', icon: <Heart size={20} /> },
    { name: 'Vitamins', icon: <ShieldCheck size={20} /> },
    { name: 'Grooming', icon: <Star size={20} /> },
    { name: 'Preventive Care', icon: <Shield size={20} /> },
    { name: 'Healthcare', icon: <Stethoscope size={20} /> },
  ];
  return <>
    <section className="shop-home-section">
      <div className="shop-section-head">
        <div><p className="eyebrow" style={{ color: '#4365a3' }}>VETWISE SHOP</p><h3>VetWise Veterinary Shop</h3><p className="shop-section-sub">Veterinary medicines, nutrition, supplements and healthcare products for pets and animals.</p></div>
        <button className="primary" onClick={() => navigate('Shop Catalog')}><ShoppingCart size={16} /> Shop Now</button>
      </div>
      <div className="shop-cat-grid">
        {cats.map((c) => (
          <button key={c.name} className="shop-cat-card" onClick={() => navigate('Shop Catalog')}>
            <div className="shop-cat-icon">{c.icon}</div>
            <span>{c.name}</span>
          </button>
        ))}
      </div>
    </section>

    <section className="shop-sub-promo">
      <div className="shop-sub-promo-content">
        <span className="shop-promo-badge">10% OFF</span>
        <div><h3>VetWise Subscribers Save 10%</h3><p>Active VetWise subscribers get 10% off eligible medicines, pet food and supplements.</p></div>
      </div>
      <div className="shop-sub-promo-actions">
        <button className="primary" onClick={() => navigate('Shop Catalog')}><ShoppingCart size={14} /> Shop Now</button>
        <button className="secondary" onClick={() => navigate('Subscription')}>View Subscription</button>
      </div>
    </section>

    <section className="shop-about-section">
      <h3>About VetWise</h3>
      <p className="shop-about-text">VetWise brings veterinary care, appointments, prescriptions, animal health records and veterinary products together in one platform.</p>
      <div className="shop-about-grid">
        <div className="shop-about-card"><Stethoscope size={22} /><strong>Veterinary Care</strong><small>Appointments and veterinary consultations.</small></div>
        <div className="shop-about-card"><Package size={22} /><strong>Digital Animal Records</strong><small>Keep animal health information organized.</small></div>
        <div className="shop-about-card"><Pill size={22} /><strong>Prescriptions</strong><small>Access veterinary prescriptions and treatment information.</small></div>
        <div className="shop-about-card"><ShoppingCart size={22} /><strong>Veterinary Shop</strong><small>Buy medicines, food, supplements and animal healthcare products.</small></div>
        <div className="shop-about-card"><ShieldCheck size={22} /><strong>Subscriber Benefits</strong><small>Active subscribers receive 10% off eligible Shop products.</small></div>
      </div>
    </section>
  </>;
}

function SearchPage({ role }: { role: 'doctor' | 'admin' }) {
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  if (selectedPatient) {
    return <PatientDetailPanel patientId={selectedPatient} role={role} onClose={() => setSelectedPatient(null)} />;
  }
  return <PatientSearch role={role} onSelectPatient={setSelectedPatient} />;
}

function BreedingPage({ myPets }: { myPets: any[] }) {
  const [selectedPet, setSelectedPet] = useState<number>(0);
  const eligiblePets = myPets.filter((p: any) => p.breedingEligible);
  if (eligiblePets.length === 0) {
    return <div className="empty-state"><Heart size={40} /><h3>No breeding-enabled animals</h3><p>Enable breeding tracking when adding or editing an animal to see breeding records here.</p></div>;
  }
  const pet = eligiblePets[selectedPet] ?? eligiblePets[0];
  return <div className="patients-layout">
    <div className="patient-list">
      {eligiblePets.map((p: any, i: number) => (
        <button key={p.name} className={`patient-card ${selectedPet === i ? 'selected' : ''}`} onClick={() => setSelectedPet(i)}>
          <div className="pet-icon"><PawPrint size={19} /></div>
          <div className="card-main">
            <strong>{p.name} <em className={`tag ${p.species.toLowerCase()}`}>{p.species}</em></strong>
            <span className="pid-small">{p.patientId ?? ''}</span>
            <span>{p.breed}</span>
          </div>
        </button>
      ))}
    </div>
    <BreedingPanel patientId={pet.patientId ?? ''} patientName={pet.name} species={pet.species} breedingEligible={true} role="client" />
  </div>;
}

function DoctorPatientDetail({ patient, allClients, setModal, setEditTarget }: { patient: any[]; allClients?: any[]; setModal?: (s: string | null) => void; setEditTarget?: (t: any) => void }) {
  const [tab, setTab] = useState<'overview' | 'medical' | 'breeding' | 'records'>('overview');
  const name = patient[0] as string;
  const species = patient[1] as string;
  const breedInfo = patient[2] as string;
  const ageWeight = patient[3] as string;
  const ownerName = patient[4] as string;
  const visits = patient[5] as string;
  const pid = patient[6] as string;
  const clientList = allClients ?? [];
  const client = clientList.find((c: any) => c.clientId === pid?.split('-P')[0]);
  const [clinicalForPatient, setClinicalForPatient] = useState<any[]>([]);
  const [rxForPatient, setRxForPatient] = useState<any[]>([]);

  useEffect(() => {
    if (!pid) return;
    fetchClinicalRecordsByPatient(pid).then(({ data }) => { if (data) setClinicalForPatient(data as any[]); });
    fetchPrescriptions().then(({ data }) => { if (data) setRxForPatient((data as any[]).filter((r: any) => r.patientId === pid)); });
  }, [pid]);

  return <section className="detail-card">
    <div className="detail-head">
      <div className="pet-icon large"><PawPrint size={24} /></div>
      <div>
        <h2>{name}</h2>
        <p><span className="pid-badge">{pid}</span> <em className={`tag ${species.toLowerCase()}`}>{species}</em> <span className="muted">{breedInfo}</span></p>
        <p className="owner-line"><small>Owner: <strong>{ownerName}</strong></small> {client && <small className="cid-badge">{client.clientId}</small>}</p>
      </div>
      {setModal && setEditTarget && <button className="secondary" style={{ padding: '6px 14px', fontSize: '12px' }} onClick={() => { setEditTarget({ name, species, breed: breedInfo.split(' · ')[0], color: breedInfo.split(' · ')[1] ?? '', weight: ageWeight.split(' · ')[1] ?? '', sex: species === 'Dog' ? 'Male' : 'Female', petId: pid }); setModal('Edit Patient'); }}><Pencil size={14} /> Edit</button>}
    </div>
    <div className="tabs">
      <button className={tab === 'overview' ? 'active' : ''} onClick={() => setTab('overview')}>Overview</button>
      <button className={tab === 'medical' ? 'active' : ''} onClick={() => setTab('medical')}>Medical</button>
      <button className={tab === 'breeding' ? 'active' : ''} onClick={() => setTab('breeding')}>Breeding</button>
      <button className={tab === 'records' ? 'active' : ''} onClick={() => setTab('records')}>Records ({clinicalForPatient.length})</button>
    </div>
    <div className="detail-content">
      {tab === 'overview' && <>
        <div className="info-grid">
          <div><label>PATIENT ID</label><strong className="pid-text">{pid}</strong></div>
          <div><label>SPECIES</label><strong>{species}</strong></div>
          <div><label>BREED</label><strong>{breedInfo.split(' · ')[0]}</strong></div>
          <div><label>SEX</label><strong>{species === 'Dog' ? 'Male' : 'Female'}</strong></div>
          <div><label>AGE</label><strong>{ageWeight.split(' · ')[0]}</strong></div>
          <div><label>WEIGHT</label><strong>{ageWeight.split(' · ')[1] ?? 'Not recorded'}</strong></div>
          <div><label>VISITS</label><strong>{visits}</strong></div>
          <div><label>STATUS</label><strong>Active</strong></div>
        </div>
        {client && <div className="owner-section" style={{ marginTop: '16px' }}>
          <h4 style={{ fontFamily: 'Manrope', fontSize: '14px', margin: '0 0 10px', color: '#132f65' }}>Owner / Client</h4>
          <div className="info-grid">
            <div><label>CLIENT ID</label><strong className="cid-text">{client.clientId}</strong></div>
            <div><label>NAME</label><strong>{client.name}</strong></div>
            <div><label>PHONE</label><strong>{client.phone}</strong></div>
            <div><label>EMAIL</label><strong>{client.email}</strong></div>
            <div className="wide"><label>ADDRESS</label><strong>{client.address}</strong></div>
          </div>
        </div>}
      </>}
      {tab === 'medical' && <div className="info-grid">
        <div className="wide"><label>ALLERGIES</label><strong>None known</strong></div>
        <div className="wide"><label>EXISTING CONDITIONS</label><strong>None</strong></div>
        <div className="wide"><label>VACCINATIONS</label><strong>Rabies (Jan 2026), DHPP (Jan 2026)</strong></div>
        <div className="wide"><label>CURRENT MEDICATIONS</label><strong>Multivitamin supplement</strong></div>
        <div className="wide"><label>MEDICAL HISTORY</label><strong>Routine vaccinations up to date</strong></div>
        <div className="wide"><label>SPECIAL REQUIREMENTS</label><strong>Sensitive stomach — avoid dairy</strong></div>
      </div>}
      {tab === 'breeding' && <BreedingPanel patientId={pid} patientName={name} species={species} breedingEligible={species !== 'Cat' && species !== 'Rabbit'} role="doctor" />}
      {tab === 'records' && <>
        {clinicalForPatient.length === 0 ? <p className="empty-hint">No clinical records for this patient.</p> : clinicalForPatient.map((r) => (
          <div className="record-card" key={r.date}>
            <div className="record-pet"><div className="pet-icon"><FileText size={16} /></div><div><strong>{r.reason}</strong><small>{r.date}</small></div></div>
            <div className="record-grid">
              <div><label>DIAGNOSIS</label><strong>{r.diagnosis}</strong></div>
              <div><label>TREATMENT</label><strong>{r.treatment}</strong></div>
              <div><label>NOTES</label><strong>{r.notes}</strong></div>
              <div><label>FOLLOW-UP</label><strong>{r.followup}</strong></div>
            </div>
          </div>
        ))}
      </>}
    </div>
  </section>;
}

function DoctorBreedingSearch({ role }: { role: 'doctor' | 'admin' }) {
  const [query, setQuery] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [allPatients, setAllPatients] = useState<any[]>([]);
  const [allClients, setAllClients] = useState<any[]>([]);

  useEffect(() => {
    fetchPatients().then(({ data }) => { if (data) setAllPatients(data as any[]); });
    fetchClients().then(({ data }) => { if (data) setAllClients(data as any[]); });
  }, []);

  const adapted = allPatients.map((p: any) => Array.isArray(p) ? p : [p.name ?? 'Unknown', p.species ?? 'Unknown', `${p.breed ?? ''} · ${p.color ?? ''}`, `${p.age ?? ''} · ${p.weight ?? ''}`, allClients.find((c: any) => c.ownerId === p.ownerId)?.name ?? 'Unknown', `${p.visits ?? 0} visits`, p.petId ?? '']);

  const breedingPatients = adapted.filter((p) => {
    const species = p[1] as string;
    return species !== 'Cat' && species !== 'Rabbit';
  });
  const filtered = breedingPatients.filter((p) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return `${p[0]} ${p[1]} ${p[2]} ${p[4]} ${p[6]}`.toLowerCase().includes(q);
  });

  if (selectedPatientId) {
    const patient = adapted.find((p) => p[6] === selectedPatientId);
    if (patient) {
      return <div>
        <button className="secondary" style={{ marginBottom: '12px' }} onClick={() => setSelectedPatientId(null)}>Back to Breeding List</button>
        <DoctorPatientDetail patient={patient} allClients={allClients} />
      </div>;
    }
  }

  return <>
    <div className="searchbar" style={{ marginBottom: '14px' }}>
      <Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search breeding animals by name, breed, species, owner, Patient ID..." />
      {query && <button onClick={() => setQuery('')}><X size={14} /></button>}
    </div>
    <div className="search-meta" style={{ marginBottom: '12px' }}>
      <small>{role === 'doctor' ? 'Showing breeding-eligible animals you are authorized to access.' : 'Admin access: all breeding-eligible animals.'}</small>
    </div>
    <div className="table-card">
      <div className="table-head"><span>PATIENT</span><span>SPECIES</span><span>BREED</span><span>OWNER</span><span>PATIENT ID</span><span></span></div>
      {filtered.map((p) => (
        <div className="table-row" key={p[6] as string}>
          <div><strong>{p[0]}</strong></div>
          <div><em className={`tag ${(p[1] as string).toLowerCase()}`}>{p[1]}</em></div>
          <div><span>{(p[2] as string).split(' · ')[0]}</span></div>
          <div><strong>{p[4]}</strong></div>
          <div><span className="pid-small">{p[6]}</span></div>
          <button className="link" onClick={() => setSelectedPatientId(p[6] as string)}>View Details <ArrowUpRight size={12} /></button>
        </div>
      ))}
    </div>
  </>;
}

function RazorpayTestSection() {
  const [amount, setAmount] = useState('1.00');
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState<{ status: string; orderId?: string; paymentId?: string; verified?: boolean; error?: string } | null>(null);
  const available = isRazorpayTestModeAvailable();

  const handleTest = async () => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { setResult({ status: 'error', error: 'Enter a valid amount' }); return; }
    setCreating(true); setResult(null);
    const { data: order, error: orderErr } = await createRazorpayTestOrder(amt);
    if (orderErr || !order) { setCreating(false); setResult({ status: 'error', error: orderErr ?? 'Failed to create order' }); return; }
    openRazorpayTestCheckout(
      order,
      async (paymentId, signature) => {
        const { verified, error: vErr } = await verifyRazorpayTestPayment(order.id, paymentId, signature);
        setCreating(false);
        setResult({ status: 'success', orderId: order.id, paymentId, verified, error: vErr ?? undefined });
      },
      (err) => { setCreating(false); setResult({ status: 'cancelled', error: err }); },
    );
  };

  return <section className="panel">
    <div className="panel-title"><h3>Razorpay TEST MODE</h3></div>
    <div style={{ background: '#fff8e6', border: '1px solid #f0d060', borderRadius: 8, padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#8a6500', display: 'flex', gap: '8px', alignItems: 'center' }}>
      <AlertTriangle size={15} /> Test mode only — no real payments are processed. Uses Razorpay test API keys (rzp_test_*).
    </div>
    {!available ? <p className="empty-hint">Razorpay test keys not configured. Set VITE_RAZORPAY_TEST_KEY_ID and VITE_RAZORPAY_TEST_KEY_SECRET in your environment.</p> : (
      <>
        <div className="profile-form" style={{ maxWidth: 'none' }}>
          <label>Test Amount (INR)
            <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="1.00" />
          </label>
          <div className="save-row">
            <button className="primary" onClick={handleTest} disabled={creating}>
              {creating ? <Loader2 size={16} className="spin" /> : <CreditCard size={16} />} Run Test Payment
            </button>
          </div>
        </div>
        {result && (
          <div className={`razorpay-test-result ${result.status}`} style={{ marginTop: '16px' }}>
            {result.status === 'success' && <>
              <div className="rx-success-banner" style={{ marginBottom: '12px' }}><Check size={16} /> Test payment completed successfully!</div>
              <div className="info-grid">
                <div><label>ORDER ID</label><strong>{result.orderId}</strong></div>
                <div><label>PAYMENT ID</label><strong>{result.paymentId}</strong></div>
                <div><label>SIGNATURE VERIFIED</label><strong>{result.verified ? 'Yes' : 'No'}</strong></div>
              </div>
              {result.error && <p style={{ color: '#e8870a', fontSize: '12px', marginTop: '8px' }}>{result.error}</p>}
            </>}
            {result.status === 'cancelled' && <p style={{ color: '#e8870a' }}>{result.error}</p>}
            {result.status === 'error' && <p className="login-error">{result.error}</p>}
          </div>
        )}
        <div style={{ marginTop: '16px', fontSize: '12px', color: '#8290a5' }}>
          <strong>Test Card Numbers:</strong> 4111 1111 1111 1111 (success), 4111 1111 1111 1112 (failure)<br/>
          <strong>Test UPI:</strong> success@razorpay, failure@razorpay<br/>
          <strong>Test Key ID:</strong> rzp_test_TrMQhK41DytIX3
        </div>
      </>
    )}
  </section>;
}

function SettingsPage({ role, authUser }: { role: Role; authUser: { name: string; phone: string; email: string } | null }) {
  const roleLabel = role === 'admin' ? 'Administrator' : role === 'doctor' ? 'Veterinarian' : role === 'frontdesk' ? 'Front Desk' : 'Client';
  const [tab, setTab] = useState<'staff' | 'practice' | 'notifications' | 'system' | 'payments'>('staff');
  const [name, setName] = useState(authUser?.name ?? '');
  const [phone, setPhone] = useState(authUser?.phone ?? '');
  const [email, setEmail] = useState(authUser?.email ?? '');
  const [address, setAddress] = useState('');
  const [settings, setSettings] = useState<{ brand?: { name: string; company: string; supportEmail: string }; plans?: unknown[]; features?: Record<string, boolean>; booking?: { minAdvanceHours: number; maxAdvanceDays: number; cancellationWindowHours: number } } | null>(null);

  useEffect(() => {
    fetchSettings().then(({ data }) => { if (data) setSettings(data); });
  }, []);

  const localChangeNotice = <p style={{ color: '#e8870a', fontSize: '12px', marginTop: '8px', display: 'flex', gap: '6px', alignItems: 'center' }}><AlertTriangle size={12} /> Local changes — not saved to server. No settings endpoint exists yet.</p>;

  return <div className="dashboard">
    <div className="welcome"><div><p className="eyebrow">ACCOUNT SETTINGS</p><h2>Manage your {roleLabel} account.</h2></div></div>
    <div className="tabs" style={{ marginBottom: '16px' }}>
      <button className={tab === 'staff' ? 'active' : ''} onClick={() => setTab('staff')}>Staff Profile</button>
      <button className={tab === 'practice' ? 'active' : ''} onClick={() => setTab('practice')}>Practice Details</button>
      <button className={tab === 'notifications' ? 'active' : ''} onClick={() => setTab('notifications')}>Notification Preferences</button>
      <button className={tab === 'system' ? 'active' : ''} onClick={() => setTab('system')}>System Information</button>
      {(role === 'admin' || role === 'doctor') && <button className={tab === 'payments' ? 'active' : ''} onClick={() => setTab('payments')}>Payment Testing</button>}
    </div>
    {tab === 'staff' && <section className="panel">
      <div className="panel-title"><h3>Profile Information</h3></div>
      <div className="profile-form" style={{ maxWidth: 'none' }}>
        <label>Name<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" /></label>
        <label>Phone<input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 9876543210" /></label>
        <label>Email<input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></label>
        <label className="wide">Address<input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Enter your address" /></label>
        <div className="save-row">
          <button className="secondary">Cancel</button>
          <button className="primary" disabled><Check size={16} /> Save Changes</button>
        </div>
        {localChangeNotice}
      </div>
    </section>}
    {tab === 'practice' && <section className="panel">
      <div className="panel-title"><h3>Practice Details</h3></div>
      <div className="info-grid">
        <div><label>BRAND</label><strong>{settings?.brand?.name ?? 'VetWise'}</strong></div>
        <div><label>COMPANY</label><strong>{settings?.brand?.company ?? 'SJ Vetfolio Pvt. Ltd.'}</strong></div>
        <div><label>SUPPORT EMAIL</label><strong>{settings?.brand?.supportEmail ?? 'support@vetwise.in'}</strong></div>
        <div><label>MIN ADVANCE (HRS)</label><strong>{settings?.booking?.minAdvanceHours ?? 'Not available'}</strong></div>
        <div><label>MAX ADVANCE (DAYS)</label><strong>{settings?.booking?.maxAdvanceDays ?? 'Not available'}</strong></div>
        <div><label>CANCELLATION WINDOW (HRS)</label><strong>{settings?.booking?.cancellationWindowHours ?? 'Not available'}</strong></div>
      </div>
      {localChangeNotice}
    </section>}
    {tab === 'notifications' && <section className="panel">
      <div className="panel-title"><h3>Notification Preferences</h3></div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <label className="toggle-row"><input type="checkbox" defaultChecked /> Email notifications</label>
        <label className="toggle-row"><input type="checkbox" defaultChecked /> SMS / OTP alerts</label>
        <label className="toggle-row"><input type="checkbox" /> Appointment reminders</label>
        <label className="toggle-row"><input type="checkbox" defaultChecked /> System updates</label>
      </div>
      {localChangeNotice}
    </section>}
    {tab === 'system' && <section className="panel">
      <div className="panel-title"><h3>System Information</h3></div>
      <div className="info-grid">
        <div><label>ROLE</label><strong>{roleLabel}</strong></div>
        <div><label>AI HEALTH CHECKER</label><strong>{settings?.features?.aiHealthChecker ? 'Enabled' : 'Not available'}</strong></div>
        <div><label>HOME VISIT</label><strong>{settings?.features?.homeVisit ? 'Enabled' : 'Not available'}</strong></div>
        <div><label>TELECONSULTATION</label><strong>{settings?.features?.teleconsultation ? 'Enabled' : 'Not available'}</strong></div>
        <div><label>VACCINATION</label><strong>{settings?.features?.vaccination ? 'Enabled' : 'Not available'}</strong></div>
        <div><label>ACTIVE PLANS</label><strong>{settings?.plans ? String((settings.plans as any[]).length) : 'Not available'}</strong></div>
      </div>
    </section>}
    {tab === 'payments' && (role === 'admin' || role === 'doctor') && <RazorpayTestSection />}
  </div>;
}

function NotificationsPage({ role, authUserId, navigate }: { role: Role; authUserId: string; navigate: (p: Page) => void }) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authUserId) return;
    setLoading(true);
    fetchNotifications(authUserId).then(({ data, error }) => {
      if (!error && data) setNotifications(data);
      setLoading(false);
    });
    return () => {};
  }, [authUserId, role]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
    await markNotificationRead(id);
  };

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await markAllNotificationsRead(authUserId);
  };

  const typeIcon = (type: string) => {
    if (type === 'appointment') return <CalendarDays size={18} />;
    if (type === 'prescription') return <ClipboardList size={18} />;
    if (type === 'payment') return <DollarSign size={18} />;
    if (type === 'approval') return <Shield size={18} />;
    return <Bell size={18} />;
  };

  const typeColor = (type: string) => {
    if (type === 'appointment') return '#4365a3';
    if (type === 'prescription') return '#0b9b55';
    if (type === 'payment') return '#e73535';
    if (type === 'approval') return '#e8870a';
    return '#687993';
  };

  if (loading) return <div className="empty-state"><Loader2 size={28} className="spin" /><p>Loading notifications...</p></div>;

  return <>
    <div className="stats-row">
      <Stat number={String(unreadCount)} label="Unread" accent={unreadCount > 0 ? 'orange' : ''} />
      <Stat number={String(notifications.length)} label="Total" />
      <Stat number={String(notifications.filter((n) => n.is_read).length)} label="Read" accent="green" />
    </div>
    {notifications.length === 0 ? (
      <div className="empty-state"><Bell size={40} /><h3>No notifications</h3><p>You're all caught up. New notifications about appointments, prescriptions, and payments will appear here.</p></div>
    ) : (
      <div className="notification-list">
        {notifications.map((n) => (
          <div key={n.id} className={`notification-card ${n.is_read ? 'read' : 'unread'}`}>
            <div className="notification-icon" style={{ color: typeColor(n.type), background: `${typeColor(n.type)}15` }}>
              {typeIcon(n.type)}
            </div>
            <div className="notification-content">
              <div className="notification-header">
                <strong>{n.title}</strong>
                {!n.is_read && <span className="unread-dot" />}
              </div>
              <p>{n.message}</p>
              <small>{new Date(n.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</small>
            </div>
            {!n.is_read && (
              <button className="link" onClick={() => handleMarkRead(n.id)}><Check size={14} /> Mark read</button>
            )}
          </div>
        ))}
      </div>
    )}
  </>;
}

function GenericPage({ page, role }: { page: Page; role: Role }) {
  return <div className="generic-page"><div className="empty-state"><div className="empty-icon"><Settings size={27} /></div><h3>{page} workspace</h3><p>{role === 'client' ? 'Your VetWise information will appear here when it is available.' : 'Connect this view to your AWS service to load live practice data.'}</p></div></div>;
}

function CareOrchestrationPage({ role, appointmentStates }: { role: Role; appointmentStates: AppointmentState[] }) {
  const [selectedAppt, setSelectedAppt] = useState(0);
  const [states, setStates] = useState(appointmentStates);
  const [speciesFilter, setSpeciesFilter] = useState<string>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<UrgencyLevel | 'all'>('all');

  const handleTransition = (from: CareState, to: CareState, action: string) => {
    setStates((prev) => prev.map((a, i) =>
      i === selectedAppt ? { ...a, currentState: to, updatedAt: new Date().toISOString() } : a,
    ));
  };

  const availableSpecies = useMemo(
    () => Array.from(new Set(states.map((a) => a.species))).sort(),
    [states],
  );

  const filteredStates = useMemo(
    () => states.filter((a) =>
      (speciesFilter === 'all' || a.species === speciesFilter) &&
      (urgencyFilter === 'all' || a.urgency === urgencyFilter),
    ),
    [states, speciesFilter, urgencyFilter],
  );

  const criticalCount = filteredStates.filter(isCritical).length;
  const stalledCount = filteredStates.filter(isStalled).length;

  const filteredIndex = (i: number) => states.indexOf(filteredStates[i]);
  const safeSelected = selectedAppt >= 0 && selectedAppt < states.length ? selectedAppt : 0;

  return <div className="orchestration-layout">
    <div style={{ gridColumn: '1 / -1', background: '#eef4ff', border: '1px solid #b8ccf0', borderRadius: 8, padding: '10px 14px', marginBottom: '14px', fontSize: '13px', color: '#2a4a8a', display: 'flex', gap: '8px', alignItems: 'center' }}><AlertTriangle size={15} /> Simulation — appointment states and audit events shown here are sample data for workflow demonstration.</div>
    <div className="left-col">
      <div className="panel" style={{ padding: '18px' }}>
        <div className="panel-title"><h3><Filter size={15} /> Appointments</h3>
          <span className="orch-count-badge">{filteredStates.length}</span>
        </div>

        <div className="orch-filters">
          <select value={speciesFilter} onChange={(e) => setSpeciesFilter(e.target.value)} className="orch-filter-select" aria-label="Filter by species">
            <option value="all">All Species</option>
            {availableSpecies.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={urgencyFilter} onChange={(e) => setUrgencyFilter(e.target.value as UrgencyLevel | 'all')} className="orch-filter-select" aria-label="Filter by urgency">
            <option value="all">All Urgency</option>
            <option value="critical">Critical</option>
            <option value="urgent">Urgent</option>
            <option value="routine">Routine</option>
          </select>
        </div>

        {(criticalCount > 0 || stalledCount > 0) && (
          <div className="orch-alert-summary">
            {criticalCount > 0 && <span className="orch-alert-chip critical"><Siren size={12} /> {criticalCount} Critical</span>}
            {stalledCount > 0 && <span className="orch-alert-chip stalled"><AlertTriangle size={12} /> {stalledCount} Stalled</span>}
          </div>
        )}

        {filteredStates.length === 0 ? (
          <div className="empty-state" style={{ padding: '24px 12px' }}><PawPrint size={28} /><p style={{ fontSize: '13px' }}>No appointments match these filters.</p></div>
        ) : (
          filteredStates.map((a, i) => {
            const realIdx = filteredIndex(i);
            const critical = isCritical(a);
            const stalled = isStalled(a);
            return (
              <button
                key={a.appointmentId}
                className={`client-card orch-appt-card ${selectedAppt === realIdx ? 'selected' : ''} ${critical ? 'critical' : ''} ${stalled ? 'stalled' : ''}`}
                style={{ width: '100%', marginBottom: '8px' }}
                onClick={() => setSelectedAppt(realIdx)}
              >
                <div className="pet-icon">{critical ? <Siren size={16} /> : <PawPrint size={16} />}</div>
                <div className="card-main">
                  <strong>{a.reason}</strong>
                  <span>{a.preferredTime} · {a.appointmentType} · {a.species}</span>
                  <span className="pid-small">{a.patientId}</span>
                </div>
                <div className="orch-card-badges">
                  <span className={`status ${URGENCY_COLORS[a.urgency]}`}>{URGENCY_LABELS[a.urgency].toUpperCase()}</span>
                  <span className={`status ${CARE_STATE_COLORS[a.currentState]}`}>{CARE_STATE_LABELS[a.currentState].toUpperCase()}</span>
                </div>
              </button>
            );
          })
        )}
      </div>
      {states[safeSelected] && <CareStateMachine appointment={states[safeSelected]} role={role} onTransition={handleTransition} />}
    </div>
    <div className="right-col">
      <AssignmentEngine
        decision={null}
        onAssign={() => {}}
        role={role as 'admin' | 'frontdesk' | 'doctor'}
      />
      <AuditTimeline events={emptyAuditEvents} />
    </div>
  </div>;
}

function ClinicalContextPage() {
  return <>
    <div style={{ background: '#eef4ff', border: '1px solid #b8ccf0', borderRadius: 8, padding: '10px 14px', marginBottom: '14px', fontSize: '13px', color: '#2a4a8a', display: 'flex', gap: '8px', alignItems: 'center' }}><AlertTriangle size={15} /> Simulation — clinical context shown here is assembled from sample patient data.</div>
    <ClinicalContextBuilder context={null} />;
  </>;
}

function AuditTimelinePage({ role }: { role: Role }) {
  if (role !== 'admin' && role !== 'doctor') {
    return <div className="empty-state"><Shield size={36} /><h3>Access restricted</h3><p>Audit timeline is available to administrators and veterinarians only.</p></div>;
  }
  return <>
    <div style={{ background: '#eef4ff', border: '1px solid #b8ccf0', borderRadius: 8, padding: '10px 14px', marginBottom: '14px', fontSize: '13px', color: '#2a4a8a', display: 'flex', gap: '8px', alignItems: 'center' }}><AlertTriangle size={15} /> Simulation — audit events shown here are sample data for workflow demonstration.</div>
    <AuditTimeline events={emptyAuditEvents} />;
  </>;
}

function ModalRouter({ modal, setModal, role, myPets, setMyPets, authUserId, editTarget, onSaved }: any) {
  const close = () => setModal(null);
  const saved = () => { onSaved?.(); setModal(null); };
  if (modal === 'Add Pet') return <AddPetModalNew onClose={close} onAdd={(pet: Record<string, unknown>) => { setMyPets((prev: any) => [...prev, pet]); onSaved?.(); }} clientId={authUserId ?? ''} />;
  if (modal === 'Book a Visit') return <BookVisitModal onClose={close} myPets={myPets} onSaved={onSaved} />;
  if (modal === 'reject-doctor') return <RejectDoctorModal onClose={close} />;
  if (modal === 'Add Product') return <AddProductModal onClose={close} />;
  if (modal === 'Add Client') return <AddClientModal onClose={close} onSaved={saved} />;
  if (modal === 'Add Patient') return <AddPatientModal onClose={close} onSaved={saved} />;
  if (modal === 'Add Appointment') return <AddAppointmentModal onClose={close} onSaved={saved} />;
  if (modal === 'Add Prescription') return <AddPrescriptionModal onClose={close} authUserId={authUserId} onSaved={saved} />;
  if (modal === 'Add Clinical Record') return <AddClinicalRecordModal onClose={close} authUserId={authUserId} onSaved={saved} />;
  if (modal === 'Edit Patient') return <EditPatientModal onClose={close} patient={editTarget} onSaved={saved} />;
  if (modal === 'Edit Appointment') return <EditAppointmentModal onClose={close} appointment={editTarget} onSaved={saved} />;
  return <DefaultModal title={modal} onClose={close} />;
}

function useEscapeKey(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && ref.current) {
        const focusable = ref.current.querySelectorAll<HTMLElement>('button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])');
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', handler);
    const prevActive = document.activeElement as HTMLElement | null;
    const focusable = ref.current?.querySelectorAll<HTMLElement>('button, input, select, textarea');
    focusable?.[0]?.focus();
    return () => { document.removeEventListener('keydown', handler); prevActive?.focus?.(); };
  }, [onClose]);
  return ref;
}

function DefaultModal({ title, onClose }: { title: string; onClose: () => void }) {
  const ref = useEscapeKey(onClose);
  return <div className="modal-backdrop" onClick={onClose}><div className="modal" ref={ref} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={title}>
    <div className="modal-head"><div><p className="eyebrow">VETWISE</p><h2>{title}</h2></div><button className="icon-btn" onClick={onClose} aria-label="Close dialog"><X size={18} /></button></div>
    <p style={{ color: '#a4aebe', fontSize: '14px', padding: '16px 0' }}>This form is not yet available.</p>
    <div className="modal-actions"><button className="secondary" onClick={onClose}>Close</button></div>
  </div></div>;
}

function AddClientModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const ref = useEscapeKey(onClose);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!name.trim()) { setError('Name is required.'); return; }
    if (!phone.trim()) { setError('Phone is required.'); return; }
    setError(''); setSaving(true);
    const { error: apiError } = await insertClient({
      full_name: name, phone, email, address_line: address, city, state, pincode, status: 'Active',
    });
    setSaving(false);
    if (apiError) { setError(apiError); return; }
    onSaved();
  };

  return <div className="modal-backdrop" onClick={onClose}><div className="modal" ref={ref} style={{ width: 'min(560px,100%)' }} onClick={(e) => e.stopPropagation()}>
    <div className="modal-head"><div><p className="eyebrow">VETWISE</p><h2>Add Client</h2></div><button className="icon-btn" onClick={onClose}><X size={18} /></button></div>
    <div className="form-grid">
      <label className="wide">Full Name <span className="req">*</span><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter client name" /></label>
      <label>Phone <span className="req">*</span><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 9876543210" /></label>
      <label>Email<input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></label>
      <label className="wide">Address<input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street address" /></label>
      <label>City<input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" /></label>
      <label>State<input value={state} onChange={(e) => setState(e.target.value)} placeholder="State" /></label>
      <label>Pincode<input value={pincode} onChange={(e) => setPincode(e.target.value)} placeholder="400050" /></label>
    </div>
    {error && <p className="login-error" style={{ margin: '4px 0 8px' }}>{error}</p>}
    <div className="modal-actions"><button className="secondary" onClick={onClose}>Cancel</button><button className="primary" onClick={handleSubmit} disabled={saving}><Check size={16} /> {saving ? 'Saving...' : 'Save Client'}</button></div>
  </div></div>;
}

function AddPatientModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const ref = useEscapeKey(onClose);
  const [name, setName] = useState('');
  const [species, setSpecies] = useState('Dog');
  const [breed, setBreed] = useState('');
  const [sex, setSex] = useState('Male');
  const [color, setColor] = useState('');
  const [dob, setDob] = useState('');
  const [weight, setWeight] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [clientsList, setClientsList] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { fetchClients().then(({ data }) => { if (data) setClientsList(data as any[]); }); }, []);

  const handleSubmit = async () => {
    if (!name.trim()) { setError('Patient name is required.'); return; }
    if (!ownerId) { setError('Please select an owner.'); return; }
    setError(''); setSaving(true);
    const { error: apiError } = await insertPatient({
      name, species, breed, sex, color, weight, ownerId,
    });
    setSaving(false);
    if (apiError) { setError(apiError); return; }
    onSaved();
  };

  return <div className="modal-backdrop" onClick={onClose}><div className="modal" ref={ref} style={{ width: 'min(560px,100%)' }} onClick={(e) => e.stopPropagation()}>
    <div className="modal-head"><div><p className="eyebrow">VETWISE</p><h2>Add Patient</h2></div><button className="icon-btn" onClick={onClose}><X size={18} /></button></div>
    <div className="form-grid">
      <label>Patient Name <span className="req">*</span><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter pet name" /></label>
      <label>Owner <span className="req">*</span><select value={ownerId} onChange={(e) => setOwnerId(e.target.value)}><option value="">Select owner</option>{clientsList.map((c: any) => <option key={c.ownerId ?? c.clientId} value={c.ownerId ?? c.clientId}>{c.name ?? c.fullName}</option>)}</select></label>
      <label>Species<select value={species} onChange={(e) => setSpecies(e.target.value)}>{SPECIES_LIST.map((s) => <option key={s}>{s}</option>)}</select></label>
      <label>Breed<input value={breed} onChange={(e) => setBreed(e.target.value)} placeholder="Breed" /></label>
      <label>Sex<select value={sex} onChange={(e) => setSex(e.target.value)}><option>Male</option><option>Female</option></select></label>
      <label>Color<input value={color} onChange={(e) => setColor(e.target.value)} placeholder="Color / markings" /></label>
      <label>Date of Birth<input type="date" value={dob} onChange={(e) => setDob(e.target.value)} /></label>
      <label>Weight<input value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="e.g. 28.5 kg" /></label>
    </div>
    {error && <p className="login-error" style={{ margin: '4px 0 8px' }}>{error}</p>}
    <div className="modal-actions"><button className="secondary" onClick={onClose}>Cancel</button><button className="primary" onClick={handleSubmit} disabled={saving}><Check size={16} /> {saving ? 'Saving...' : 'Save Patient'}</button></div>
  </div></div>;
}

function AddAppointmentModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const ref = useEscapeKey(onClose);
  const [patientId, setPatientId] = useState('');
  const [clientId, setClientId] = useState('');
  const [apptType, setApptType] = useState('Home Visit');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [reason, setReason] = useState('');
  const [patientsList, setPatientsList] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { fetchPatients().then(({ data }) => { if (data) setPatientsList(data as any[]); }); }, []);

  const handleSubmit = async () => {
    if (!patientId) { setError('Please select a patient.'); return; }
    if (!date) { setError('Please select a date.'); return; }
    setError(''); setSaving(true);
    const { error: apiError } = await insertAppointment({
      petId: patientId, date, time, reason, visitType: apptType, status: 'pending',
    });
    setSaving(false);
    if (apiError) { setError(apiError); return; }
    onSaved();
  };

  return <div className="modal-backdrop" onClick={onClose}><div className="modal" ref={ref} style={{ width: 'min(560px,100%)' }} onClick={(e) => e.stopPropagation()}>
    <div className="modal-head"><div><p className="eyebrow">VETWISE</p><h2>Add Appointment</h2></div><button className="icon-btn" onClick={onClose}><X size={18} /></button></div>
    <div className="form-grid">
      <label className="wide">Patient <span className="req">*</span><select value={patientId} onChange={(e) => { setPatientId(e.target.value); const p = patientsList.find((x) => (x.petId ?? x.patientId) === e.target.value); if (p) setClientId(p.ownerId ?? ''); }}><option value="">Select patient</option>{patientsList.map((p: any) => <option key={p.petId ?? p.patientId} value={p.petId ?? p.patientId}>{p.name} ({p.species})</option>)}</select></label>
      <label>Visit Type<select value={apptType} onChange={(e) => setApptType(e.target.value)}><option>Home Visit</option><option>Teleconsultation</option><option>Clinic Visit</option><option>Vaccination</option><option>Emergency</option></select></label>
      <label>Date <span className="req">*</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
      <label>Time<input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></label>
      <label className="wide">Reason<textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for visit" /></label>
    </div>
    {error && <p className="login-error" style={{ margin: '4px 0 8px' }}>{error}</p>}
    <div className="modal-actions"><button className="secondary" onClick={onClose}>Cancel</button><button className="primary" onClick={handleSubmit} disabled={saving}><Check size={16} /> {saving ? 'Saving...' : 'Save Appointment'}</button></div>
  </div></div>;
}

function AddClinicalRecordModal({ onClose, authUserId, onSaved }: { onClose: () => void; authUserId: string; onSaved: () => void }) {
  const ref = useEscapeKey(onClose);
  const [patientId, setPatientId] = useState('');
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [treatment, setTreatment] = useState('');
  const [notes, setNotes] = useState('');
  const [followup, setFollowup] = useState('');
  const [patientsList, setPatientsList] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { fetchPatients().then(({ data }) => { if (data) setPatientsList(data as any[]); }); }, []);

  const handleSubmit = async () => {
    if (!patientId) { setError('Please select a patient.'); return; }
    if (!date) { setError('Please select a visit date.'); return; }
    setError(''); setSaving(true);
    const { error: apiError } = await insertClinicalRecord({
      petId: patientId, date, reason, diagnosis, treatment, notes, followup,
    });
    setSaving(false);
    if (apiError) { setError(apiError); return; }
    onSaved();
  };

  return <div className="modal-backdrop" onClick={onClose}><div className="modal" ref={ref} style={{ width: 'min(640px,100%)' }} onClick={(e) => e.stopPropagation()}>
    <div className="modal-head"><div><p className="eyebrow">VETWISE</p><h2>Add Clinical Record</h2></div><button className="icon-btn" onClick={onClose}><X size={18} /></button></div>
    <div className="form-grid">
      <label className="wide">Patient <span className="req">*</span><select value={patientId} onChange={(e) => setPatientId(e.target.value)}><option value="">Select patient</option>{patientsList.map((p: any) => <option key={p.petId ?? p.patientId} value={p.petId ?? p.patientId}>{p.name} ({p.species})</option>)}</select></label>
      <label>Visit Date <span className="req">*</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
      <label>Reason<input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for visit" /></label>
      <label>Diagnosis<input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder="Diagnosis" /></label>
      <label>Treatment<input value={treatment} onChange={(e) => setTreatment(e.target.value)} placeholder="Treatment given" /></label>
      <label>Follow-up<input value={followup} onChange={(e) => setFollowup(e.target.value)} placeholder="Follow-up instructions" /></label>
      <label className="wide">Notes<textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Clinical notes" /></label>
    </div>
    {error && <p className="login-error" style={{ margin: '4px 0 8px' }}>{error}</p>}
    <div className="modal-actions"><button className="secondary" onClick={onClose}>Cancel</button><button className="primary" onClick={handleSubmit} disabled={saving}><Check size={16} /> {saving ? 'Saving...' : 'Save Record'}</button></div>
  </div></div>;
}

function AddPrescriptionModal({ onClose, authUserId, onSaved }: { onClose: () => void; authUserId: string; onSaved: () => void }) {
  const ref = useEscapeKey(onClose);
  const [patientId, setPatientId] = useState('');
  const [medication, setMedication] = useState('');
  const [dosage, setDosage] = useState('');
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [patientsList, setPatientsList] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { fetchPatients().then(({ data }) => { if (data) setPatientsList(data as any[]); }); }, []);

  const handleSubmit = async () => {
    if (!patientId) { setError('Please select a patient.'); return; }
    if (!medication.trim()) { setError('Medication name is required.'); return; }
    setError(''); setSaving(true);
    const { error: apiError } = await insertPrescription({
      petId: patientId, meds: `${medication} ${dosage ? `— ${dosage}` : ''} ${duration ? `for ${duration}` : ''}`.trim(), instructions: notes,
    });
    setSaving(false);
    if (apiError) { setError(apiError); return; }
    onSaved();
  };

  return <div className="modal-backdrop" onClick={onClose}><div className="modal" ref={ref} style={{ width: 'min(560px,100%)' }} onClick={(e) => e.stopPropagation()}>
    <div className="modal-head"><div><p className="eyebrow">VETWISE</p><h2>Add Prescription</h2></div><button className="icon-btn" onClick={onClose}><X size={18} /></button></div>
    <div className="form-grid">
      <label className="wide">Patient <span className="req">*</span><select value={patientId} onChange={(e) => setPatientId(e.target.value)}><option value="">Select patient</option>{patientsList.map((p: any) => <option key={p.petId ?? p.patientId} value={p.petId ?? p.patientId}>{p.name} ({p.species})</option>)}</select></label>
      <label className="wide">Medication <span className="req">*</span><input value={medication} onChange={(e) => setMedication(e.target.value)} placeholder="Medicine name" /></label>
      <label>Dosage<input value={dosage} onChange={(e) => setDosage(e.target.value)} placeholder="e.g. 1 tablet twice daily" /></label>
      <label>Duration<input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="e.g. 7 days" /></label>
      <label className="wide">Notes<textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Prescription notes" /></label>
    </div>
    {error && <p className="login-error" style={{ margin: '4px 0 8px' }}>{error}</p>}
    <div className="modal-actions"><button className="secondary" onClick={onClose}>Cancel</button><button className="primary" onClick={handleSubmit} disabled={saving}><Check size={16} /> {saving ? 'Saving...' : 'Save Prescription'}</button></div>
  </div></div>;
}

function EditPatientModal({ onClose, patient, onSaved }: { onClose: () => void; patient: any; onSaved: () => void }) {
  const ref = useEscapeKey(onClose);
  const [name, setName] = useState(patient?.name ?? '');
  const [species, setSpecies] = useState(patient?.species ?? 'Dog');
  const [breed, setBreed] = useState(patient?.breed ?? '');
  const [sex, setSex] = useState(patient?.sex ?? 'Male');
  const [color, setColor] = useState(patient?.color ?? '');
  const [weight, setWeight] = useState(patient?.weight ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!name.trim()) { setError('Patient name is required.'); return; }
    setError(''); setSaving(true);
    const { error: apiError } = await updatePatient(patient?.petId ?? patient?.patientId ?? '', {
      name, species, breed, sex, color, weight,
    });
    setSaving(false);
    if (apiError) { setError(apiError); return; }
    onSaved();
  };

  return <div className="modal-backdrop" onClick={onClose}><div className="modal" ref={ref} style={{ width: 'min(560px,100%)' }} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Edit Patient">
    <div className="modal-head"><div><p className="eyebrow">VETWISE</p><h2>Edit Patient</h2></div><button className="icon-btn" onClick={onClose} aria-label="Close dialog"><X size={18} /></button></div>
    <div className="form-grid">
      <label>Patient Name <span className="req">*</span><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter pet name" /></label>
      <label>Species<select value={species} onChange={(e) => setSpecies(e.target.value)}>{SPECIES_LIST.map((s) => <option key={s}>{s}</option>)}</select></label>
      <label>Breed<input value={breed} onChange={(e) => setBreed(e.target.value)} placeholder="Breed" /></label>
      <label>Sex<select value={sex} onChange={(e) => setSex(e.target.value)}><option>Male</option><option>Female</option></select></label>
      <label>Color<input value={color} onChange={(e) => setColor(e.target.value)} placeholder="Color / markings" /></label>
      <label>Weight<input value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="e.g. 28.5 kg" /></label>
    </div>
    {error && <p className="login-error" style={{ margin: '4px 0 8px' }}>{error}</p>}
    <div className="modal-actions"><button className="secondary" onClick={onClose}>Cancel</button><button className="primary" onClick={handleSubmit} disabled={saving}><Check size={16} /> {saving ? 'Saving...' : 'Save Changes'}</button></div>
  </div></div>;
}

function EditAppointmentModal({ onClose, appointment, onSaved, role }: { onClose: () => void; appointment: any; onSaved: () => void; role?: Role }) {
  const ref = useEscapeKey(onClose);
  const [date, setDate] = useState(appointment?.date ?? appointment?.preferred_date ?? '');
  const [time, setTime] = useState(appointment?.time ?? appointment?.preferred_time ?? '');
  const [reason, setReason] = useState(appointment?.reason ?? '');
  const [status, setStatus] = useState(appointment?.status ?? 'pending');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [media, setMedia] = useState<AppointmentMedia[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [lightbox, setLightbox] = useState<AppointmentMedia | null>(null);
  const apptId = appointment?.appointmentId ?? appointment?.id ?? '';
  const allowedStatuses = ['pending', 'confirmed', 'completed', 'cancelled', 'no-show'];
  const isDoctor = role === 'doctor';

  useEffect(() => {
    if (!apptId) return;
    setMediaLoading(true);
    fetchAppointmentMedia(apptId).then(({ data, error: mErr }) => {
      setMediaLoading(false);
      if (mErr) return;
      if (data) setMedia(data);
    });
  }, [apptId]);

  const handleSubmit = async () => {
    if (date && !isDoctor) {
      if (!date) { setError('Date is required.'); return; }
    }
    setError(''); setSaving(true);
    const updates: Record<string, unknown> = { time, reason, status };
    if (!isDoctor) updates.date = date;
    const { error: apiError } = await updateAppointment(apptId, updates);
    setSaving(false);
    if (apiError) { setError(apiError); return; }
    onSaved();
  };

  return <div className="modal-backdrop" onClick={onClose}><div className="modal" ref={ref} style={{ width: 'min(620px,100%)' }} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Edit Appointment">
    <div className="modal-head"><div><p className="eyebrow">VETWISE</p><h2>{isDoctor ? 'Appointment Details' : 'Edit Appointment'}</h2></div><button className="icon-btn" onClick={onClose} aria-label="Close dialog"><X size={18} /></button></div>

    <div className="form-grid">
      {!isDoctor && <label>Date <span className="req">*</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>}
      <label>Time<input type="time" value={time} onChange={(e) => setTime(e.target.value)} disabled={isDoctor} /></label>
      <label>Status<select value={status} onChange={(e) => setStatus(e.target.value)} disabled={isDoctor}>{allowedStatuses.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}</select></label>
      <label className="wide">Reason<textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for visit" disabled={isDoctor} /></label>
    </div>

    {appointment && (appointment.patients?.name || appointment.pet) && (
      <div className="appt-media-section">
        <div className="appt-media-head"><Paperclip size={15} /><strong>Attached Photos & Videos</strong>{media.length > 0 && <span className="appt-media-count">{media.length}</span>}</div>
        {mediaLoading ? (
          <p className="appt-media-hint">Loading media...</p>
        ) : media.length === 0 ? (
          <p className="appt-media-hint">No photos or videos were uploaded for this appointment.</p>
        ) : (
          <div className="appt-media-grid">
            {media.map((m) => (
              <button key={m.id} className="appt-media-thumb" onClick={() => setLightbox(m)}>
                {m.mediaType === 'video' ? (
                  <div className="appt-media-video"><Video size={22} /><span>{m.fileName}</span></div>
                ) : (
                  <img src={m.url} alt={m.fileName} loading="lazy" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    )}

    {error && <p className="login-error" style={{ margin: '4px 0 8px' }}>{error}</p>}
    <div className="modal-actions">
      <button className="secondary" onClick={onClose}>{isDoctor ? 'Close' : 'Cancel'}</button>
      {!isDoctor && <button className="danger-btn" onClick={() => { setStatus('cancelled'); }} disabled={status === 'cancelled'}><Ban size={16} /> Cancel Appointment</button>}
      {!isDoctor && <button className="primary" onClick={handleSubmit} disabled={saving}><Check size={16} /> {saving ? 'Saving...' : 'Save Changes'}</button>}
    </div>
  </div>
  {lightbox && (
    <div className="lightbox-backdrop" onClick={() => setLightbox(null)}>
      <button className="lightbox-close" onClick={() => setLightbox(null)}><X size={22} /></button>
      {lightbox.mediaType === 'video' ? (
        <video src={lightbox.url} controls autoPlay className="lightbox-media" />
      ) : (
        <img src={lightbox.url} alt={lightbox.fileName} className="lightbox-media" />
      )}
      <p className="lightbox-caption">{lightbox.fileName}</p>
    </div>
  )}
  </div>;
}

function BookVisitModal({ onClose, myPets, onSaved, authUserId }: { onClose: () => void; myPets: any[]; onSaved?: () => void; authUserId?: string }) {
  const ref = useEscapeKey(onClose);
  const [locationMode, setLocationMode] = useState<'saved' | 'current' | 'manual'>('saved');
  const [selectedPet, setSelectedPet] = useState('');
  const [visitType, setVisitType] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [reason, setReason] = useState('');
  const [manualAddress, setManualAddress] = useState('');
  const [manualCity, setManualCity] = useState('');
  const [manualPincode, setManualPincode] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [gpsCoords, setGpsCoords] = useState<{ lat: string; lng: string } | null>(null);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<{ url: string; type: 'photo' | 'video'; name: string }[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const captureGps = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setGpsCoords({ lat: pos.coords.latitude.toFixed(6), lng: pos.coords.longitude.toFixed(6) }),
      () => {},
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const addFiles = (files: FileList | null, type: 'photo' | 'video') => {
    if (!files) return;
    const newFiles: File[] = [];
    const newPreviews: { url: string; type: 'photo' | 'video'; name: string }[] = [];
    Array.from(files).forEach((f) => {
      if (type === 'photo' && !['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) return;
      if (type === 'video' && !['video/mp4', 'video/webm', 'video/quicktime'].includes(f.type)) return;
      if (f.size > 50 * 1024 * 1024) return;
      newFiles.push(f);
      newPreviews.push({ url: URL.createObjectURL(f), type, name: f.name });
    });
    setMediaFiles((prev) => [...prev, ...newFiles]);
    setMediaPreviews((prev) => [...prev, ...newPreviews]);
  };

  const removeMedia = (idx: number) => {
    setMediaFiles((prev) => prev.filter((_, i) => i !== idx));
    setMediaPreviews((prev) => {
      URL.revokeObjectURL(prev[idx]?.url);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleSubmit = async () => {
    if (!selectedPet) { setError('Please select your pet.'); return; }
    if (!visitType) { setError('Please select a visit type.'); return; }
    if (!preferredDate) { setError('Please select a preferred date.'); return; }
    setError('');
    setSaving(true);

    const pet = myPets.find((p) => p.name === selectedPet);
    let visitLocation = '';
    if (locationMode === 'current' && gpsCoords) {
      visitLocation = `GPS: ${gpsCoords.lat}, ${gpsCoords.lng}`;
    } else if (locationMode === 'manual') {
      visitLocation = `${manualAddress}, ${manualCity} — ${manualPincode}`;
    }

    const apptData = {
      petId: pet?.petId ?? pet?.patientId ?? '',
      date: preferredDate,
      time: preferredTime,
      reason,
      visitType,
      location: visitLocation,
      status: 'pending',
    };

    const { data: apptResult, error: apptError } = await insertAppointment(apptData);
    if (apptError) { setSaving(false); setError(apptError); return; }

    if (mediaFiles.length > 0 && apptResult) {
      setUploadingMedia(true);
      const newApptId = (apptResult as any)?.appointmentId ?? (apptResult as any)?.appointment_id ?? (apptResult as any)?.id ?? '';
      const patientId = pet?.petId ?? pet?.patientId ?? '';
      const clientId = pet?.ownerId ?? '';
      for (let i = 0; i < mediaFiles.length; i++) {
        const file = mediaFiles[i];
        const type = mediaPreviews[i]?.type ?? 'photo';
        await uploadAppointmentMedia(newApptId, patientId, clientId, file, type);
      }
      setUploadingMedia(false);
    }

    setSaving(false);
    mediaPreviews.forEach((p) => URL.revokeObjectURL(p.url));
    onSaved?.();
    onClose();
  };

  return <div className="modal-backdrop" onClick={onClose}><div className="modal" ref={ref} style={{ width: 'min(560px,100%)' }} onClick={(e) => e.stopPropagation()}>
    <div className="modal-head"><div><p className="eyebrow">VETWISE</p><h2>Book a Visit</h2></div><button className="icon-btn" onClick={onClose}><X size={18} /></button></div>
    <div className="form-grid">
      <label>Pet<select value={selectedPet} onChange={(e) => setSelectedPet(e.target.value)}><option value="">Select your pet</option>{myPets.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}</select></label>
      <label>Visit Type<select value={visitType} onChange={(e) => setVisitType(e.target.value)}><option value="">Select type</option><option>Home Visit</option><option>Teleconsultation</option><option>Clinic Visit</option><option>Vaccination</option><option>Emergency</option></select></label>
      <label>Preferred Date<input type="date" value={preferredDate} onChange={(e) => setPreferredDate(e.target.value)} /></label>
      <label>Preferred Time<input type="time" value={preferredTime} onChange={(e) => setPreferredTime(e.target.value)} /></label>
      <label className="wide">Reason<textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Briefly describe the reason for the visit" /></label>
    </div>
    <div className="location-section">
      <strong>Visit Location</strong>
      <div className="location-mode-tabs">
        <button className={locationMode === 'current' ? 'active' : ''} onClick={() => { setLocationMode('current'); captureGps(); }}><MapPin size={13} /> Use Current Location</button>
        <button className={locationMode === 'manual' ? 'active' : ''} onClick={() => setLocationMode('manual')}><MapPin size={13} /> Enter Different Location</button>
      </div>
      {locationMode === 'current' && (
        <p className="location-hint">{gpsCoords ? `GPS captured: ${gpsCoords.lat}, ${gpsCoords.lng}` : 'Capturing GPS coordinates...'}</p>
      )}
      {locationMode === 'manual' && (
        <div className="form-grid" style={{ marginTop: '10px' }}>
          <label className="wide">Address<input value={manualAddress} onChange={(e) => setManualAddress(e.target.value)} placeholder="Enter visit address" /></label>
          <label>City<input value={manualCity} onChange={(e) => setManualCity(e.target.value)} placeholder="City" /></label>
          <label>Pincode<input value={manualPincode} onChange={(e) => setManualPincode(e.target.value)} placeholder="Pincode" /></label>
        </div>
      )}
    </div>

    <div className="appt-media-section">
      <strong><ImageIcon size={14} /> Photos & Videos for the Vet</strong>
      <p className="appt-media-hint">Upload photos or short videos of the affected area so the veterinarian can review them before the visit.</p>
      <div className="appt-media-upload-buttons">
        <button type="button" className="secondary" onClick={() => photoInputRef.current?.click()}><ImageIcon size={15} /> Add Photos</button>
        <button type="button" className="secondary" onClick={() => videoInputRef.current?.click()}><Video size={15} /> Add Videos</button>
        <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple style={{ display: 'none' }} onChange={(e) => addFiles(e.target.files, 'photo')} />
        <input ref={videoInputRef} type="file" accept="video/mp4,video/webm,video/quicktime" multiple style={{ display: 'none' }} onChange={(e) => addFiles(e.target.files, 'video')} />
      </div>
      {mediaPreviews.length > 0 && (
        <div className="appt-media-grid">
          {mediaPreviews.map((m, i) => (
            <div key={i} className="appt-media-thumb removable">
              {m.type === 'video' ? (
                <div className="appt-media-video"><Video size={22} /><span>{m.name}</span></div>
              ) : (
                <img src={m.url} alt={m.name} loading="lazy" />
              )}
              <button className="appt-media-remove" onClick={() => removeMedia(i)} aria-label="Remove"><X size={14} /></button>
            </div>
          ))}
        </div>
      )}
    </div>

    {error && <p className="login-error" style={{ margin: '4px 0 8px' }}>{error}</p>}
    <div className="modal-actions"><button className="secondary" onClick={onClose}>Cancel</button><button className="primary" onClick={handleSubmit} disabled={saving}><Check size={16} /> {saving ? (uploadingMedia ? 'Uploading media...' : 'Requesting...') : 'Request Visit'}</button></div>
  </div></div>;
}

function RejectDoctorModal({ onClose }: { onClose: () => void }) {
  const ref = useEscapeKey(onClose);
  return <div className="modal-backdrop" onClick={onClose}><div className="modal" ref={ref} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
    <div className="modal-head"><div><p className="eyebrow">VETWISE ADMIN</p><h2>Reject Doctor Application</h2></div><button className="icon-btn" onClick={onClose}><X size={18} /></button></div>
    <div className="form-grid"><label className="wide">Reason for rejection<textarea placeholder="Provide a reason for rejecting this application" /></label></div>
    <div className="modal-actions"><button className="secondary" onClick={onClose}>Cancel</button><button className="danger-btn" onClick={() => { onClose(); alert('Application rejected. Note: Backend API integration is required for persistence.'); }}><Ban size={16} /> Confirm Rejection</button></div>
  </div></div>;
}

function Login({ onSignIn, variant }: { onSignIn: (role: Role, user?: AuthUser) => void; variant: AppVariant }) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [method, setMethod] = useState<'whatsapp' | 'password'>('whatsapp');
  const allowedRoles = VARIANT_ROLES[variant];
  const [role, setRole] = useState<Role>(VARIANT_DEFAULT_ROLE[variant]);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpSent, setOtpSent] = useState(false);
  const [otpId, setOtpId] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(0);
  const [signupName, setSignupName] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPw, setSignupPw] = useState('');
  const [showSignupPw, setShowSignupPw] = useState(false);
  const [waLoginPhone, setWaLoginPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState('');

  const resetState = () => { setOtpSent(false); setOtp(['', '', '', '', '', '']); setOtpId(null); setError(''); setInfo(''); setResendTimer(0); };

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  const handleOtpChange = (i: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[i] = val;
    setOtp(next);
    if (val && i < 5) {
      const el = document.getElementById(`wa-otp-${i + 1}`);
      el?.focus();
    }
  };

  const handleOtpKey = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) {
      const el = document.getElementById(`wa-otp-${i - 1}`);
      el?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length > 0) {
      const next = ['', '', '', '', '', ''];
      for (let j = 0; j < pasted.length && j < 6; j++) next[j] = pasted[j];
      setOtp(next);
      const lastFilled = Math.min(pasted.length, 5);
      document.getElementById(`wa-otp-${lastFilled}`)?.focus();
    }
  };

  const formatPhoneForWa = (raw: string): string => {
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 10) return `+91${digits}`;
    if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
    if (raw.startsWith('+')) return raw;
    return raw;
  };

  const sendWhatsappOtpLogin = async () => {
    if (!waLoginPhone.trim()) { setError('Please enter your mobile number.'); return; }
    const phone = formatPhoneForWa(waLoginPhone);
    setError(''); setInfo(''); setLoading(true);
    try {
      const { otpId: id, error: otpError } = await authSendWhatsappOtp(phone, 'login');
      if (otpError) throw new Error(otpError);
      if (id) { setOtpId(id); setOtpSent(true); setResendTimer(60); setInfo('OTP sent via WhatsApp to ' + phone); }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send WhatsApp OTP');
    } finally {
      setLoading(false);
    }
  };

  const verifyWhatsappOtpLogin = async () => {
    const code = otp.join('');
    if (code.length !== 6) { setError('Please enter the 6-digit code.'); return; }
    if (!otpId) { setError('Please request an OTP first.'); return; }
    setError(''); setLoading(true);
    try {
      const phone = formatPhoneForWa(waLoginPhone);
      const { user, error: verifyError } = await authVerifyWhatsappOtp({ otpId, code, phone, purpose: 'login' });
      if (verifyError) throw new Error(verifyError);
      if (user) onSignIn(user.role, user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const sendWhatsappOtpRegister = async () => {
    if (!signupName.trim()) { setError('Please enter your name.'); return; }
    if (!signupPhone.trim()) { setError('Phone number is required.'); return; }
    if (signupPhone.replace(/\D/g, '').length < 10) { setError('Please enter a valid 10-digit mobile number.'); return; }
    if (!signupEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signupEmail)) { setError('Please enter a valid email address.'); return; }
    if (!allowedRoles.includes(role)) { setError('This role is not available for this app.'); return; }
    const phone = formatPhoneForWa(signupPhone);
    setError(''); setInfo(''); setLoading(true);
    try {
      const { otpId: id, error: otpError } = await authSendWhatsappOtp(phone, 'register');
      if (otpError) throw new Error(otpError);
      if (id) { setOtpId(id); setOtpSent(true); setResendTimer(60); setInfo('OTP sent via WhatsApp to ' + phone + '. Enter the code to complete registration.'); }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send WhatsApp OTP');
    } finally {
      setLoading(false);
    }
  };

  const verifyWhatsappOtpRegister = async () => {
    const code = otp.join('');
    if (code.length !== 6) { setError('Please enter the 6-digit code.'); return; }
    if (!otpId) { setError('Please request an OTP first.'); return; }
    setError(''); setLoading(true);
    try {
      const phone = formatPhoneForWa(signupPhone);
      const { user, error: verifyError } = await authVerifyWhatsappOtp({
        otpId, code, phone, purpose: 'register',
        registrationData: { name: signupName, email: signupEmail, role },
      });
      if (verifyError) throw new Error(verifyError);
      if (user) onSignIn(user.role, user);
      else { setMode('signin'); setError(''); setInfo('Account created successfully. Please sign in.'); resetState(); }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const passwordSignIn = async () => {
    if (!identifier.trim()) { setError('Please enter your email.'); return; }
    if (!password) { setError('Please enter your password.'); return; }
    setError(''); setInfo(''); setLoading(true);
    try {
      const { user, error: signInError } = await signInWithPassword(identifier.trim(), password);
      if (signInError) throw new Error(signInError);
      if (user) onSignIn(user.role, user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const passwordSignUp = async () => {
    if (!signupName.trim()) { setError('Please enter your name.'); return; }
    if (!signupPhone.trim()) { setError('Phone number is required.'); return; }
    if (signupPhone.replace(/\D/g, '').length < 10) { setError('Please enter a valid phone number.'); return; }
    if (!signupEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signupEmail)) { setError('Please enter a valid email address.'); return; }
    if (!signupPw || signupPw.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (!allowedRoles.includes(role)) { setError('This role is not available for this app.'); return; }
    setError(''); setInfo(''); setLoading(true);
    try {
      const { user, error: signUpError } = await authSignUp({
        email: signupEmail, password: signupPw, name: signupName, phone: signupPhone, role,
      });
      if (signUpError) throw new Error(signUpError);
      if (user) onSignIn(user.role, user);
      else { setMode('signin'); setIdentifier(signupEmail); setError(''); setInfo('Account created. Please sign in.'); }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return <div className="login-screen">
    <div className="login-art">
      <div className="brand light"><div className="brand-mark"><Stethoscope size={18} /></div><span>{VARIANT_THEME[variant].label}</span></div>
      <div className="art-copy"><p className="eyebrow">{variant === 'client' ? 'CARE FOR YOUR PETS' : 'CARE, CONNECTED'}</p><h1>{variant === 'client' ? 'Your pets, in good hands.' : 'Better care for every patient.'}</h1><p>{variant === 'client' ? 'Book appointments, shop for your pets, and track their health — all in one place.' : 'One calm workspace for veterinary teams and the people who love their pets.'}</p></div>
      <div className="art-orbit"><PawPrint size={38} /></div>
    </div>
    <div className="login-panel">
      <div className="login-box">
        <div className="brand dark"><div className="brand-mark"><Stethoscope size={18} /></div><span>{VARIANT_THEME[variant].label}</span></div>
        {mode === 'signin' ? <>
          <h2>Welcome back</h2><p>{variant === 'client' ? 'Sign in to manage your pet\'s care.' : 'Sign in to continue to your portal.'}</p>
          {allowedRoles.length > 1 && <div className="role-switch">{allowedRoles.map((r) => <button key={r} className={role === r ? 'active' : ''} onClick={() => { setRole(r); resetState(); setWaLoginPhone(''); }}>{r === 'frontdesk' ? 'Front Desk' : r[0].toUpperCase() + r.slice(1)}</button>)}</div>}
          <div className="method-toggle">
            <button className={method === 'whatsapp' ? 'active' : ''} onClick={() => { setMethod('whatsapp'); resetState(); setWaLoginPhone(''); }}><Send size={13} /> WhatsApp OTP</button>
            <button className={method === 'password' ? 'active' : ''} onClick={() => { setMethod('password'); resetState(); }}>Password</button>
          </div>
          {error && <p className="login-error">{error}</p>}
          {info && <p className="login-info">{info}</p>}
          {method === 'whatsapp' ? <>
            {!otpSent ? <>
              <label>Mobile Number<input value={waLoginPhone} onChange={(e) => setWaLoginPhone(e.target.value)} placeholder="9876543210" inputMode="tel" /></label>
              <p className="otp-hint" style={{ marginBottom: '12px' }}>Enter your 10-digit mobile number. We'll send a code via WhatsApp.</p>
              <button className="primary full" onClick={sendWhatsappOtpLogin} disabled={loading}>{loading ? <LoadingLogo variant={variant} /> : 'Send WhatsApp OTP'}</button>
            </> : <>
              <label>Enter OTP<div className="otp-row" onPaste={handleOtpPaste}>{otp.map((d, i) => <input key={i} id={`wa-otp-${i}`} value={d} onChange={(e) => handleOtpChange(i, e.target.value)} onKeyDown={(e) => handleOtpKey(i, e)} maxLength={1} inputMode="numeric" />)}</div></label>
              <p className="otp-hint">A 6-digit code was sent to {formatPhoneForWa(waLoginPhone)} via WhatsApp.{resendTimer > 0 ? ` Resend in ${resendTimer}s` : <button className="link" onClick={() => { resetState(); setWaLoginPhone(waLoginPhone); }}>Resend</button>}</p>
              <button className="primary full" onClick={verifyWhatsappOtpLogin} disabled={loading}>{loading ? <LoadingLogo variant={variant} /> : 'Verify & Sign in'}</button>
            </>}
          </> : <>
            <label>Email<input value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="you@example.com" /></label>
            <label>Password<div className="password"><input type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" /><button onClick={() => setShowPw(!showPw)}>{showPw ? 'Hide' : 'Show'}</button></div></label>
            <div className="login-options"><label className="check"><input type="checkbox" /> Remember me</label><button className="link">Forgot password?</button></div>
            <button className="primary full" onClick={passwordSignIn} disabled={loading}>{loading ? <LoadingLogo variant={variant} /> : 'Sign in'}</button>
          </>}
          <p className="signup">New to {VARIANT_THEME[variant].label}? <button className="link" onClick={() => { setMode('signup'); resetState(); setError(''); setInfo(''); }}>Create an account</button></p>
        </> : <>
          <h2>Create your account</h2><p>{variant === 'client' ? 'Join to manage your pet\'s health, appointments, and more.' : 'Join VetWise to manage pet care in one place.'}</p>
          {allowedRoles.length > 1 && <div className="role-switch">{allowedRoles.map((r) => <button key={r} className={role === r ? 'active' : ''} onClick={() => { setRole(r); resetState(); }}>{r[0].toUpperCase() + r.slice(1)}</button>)}</div>}
          <div className="method-toggle">
            <button className={method === 'whatsapp' ? 'active' : ''} onClick={() => { setMethod('whatsapp'); resetState(); }}><Send size={13} /> WhatsApp OTP</button>
            <button className={method === 'password' ? 'active' : ''} onClick={() => { setMethod('password'); resetState(); }}>Password</button>
          </div>
          {error && <p className="login-error">{error}</p>}
          {info && <p className="login-info">{info}</p>}
          {method === 'whatsapp' ? <>
            {!otpSent ? <>
              <label>Full Name<input value={signupName} onChange={(e) => setSignupName(e.target.value)} placeholder="Enter your name" /></label>
              <label>Mobile Number <span className="req">*</span><input value={signupPhone} onChange={(e) => setSignupPhone(e.target.value)} placeholder="9876543210" inputMode="tel" /></label>
              <label>Email <span className="req">*</span><input value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} placeholder="you@example.com" /></label>
              <p className="otp-hint" style={{ marginBottom: '12px' }}>Step 1: Enter your details. Step 2: Verify your WhatsApp number. Step 3: Complete registration.</p>
              <button className="primary full" onClick={sendWhatsappOtpRegister} disabled={loading}>{loading ? <LoadingLogo variant={variant} /> : 'Send WhatsApp OTP'}</button>
            </> : <>
              <div className="signup-otp-summary">
                <div><strong>{signupName}</strong></div>
                <div><small>{signupEmail}</small></div>
                <div><small>{formatPhoneForWa(signupPhone)}</small></div>
              </div>
              <label>Enter OTP<div className="otp-row" onPaste={handleOtpPaste}>{otp.map((d, i) => <input key={i} id={`wa-otp-${i}`} value={d} onChange={(e) => handleOtpChange(i, e.target.value)} onKeyDown={(e) => handleOtpKey(i, e)} maxLength={1} inputMode="numeric" />)}</div></label>
              <p className="otp-hint">A 6-digit code was sent to {formatPhoneForWa(signupPhone)} via WhatsApp. {resendTimer > 0 ? `Resend in ${resendTimer}s` : <button className="link" onClick={() => { resetState(); }}>Change number</button>}</p>
              <button className="primary full" onClick={verifyWhatsappOtpRegister} disabled={loading}>{loading ? <LoadingLogo variant={variant} /> : 'Verify & Create Account'}</button>
            </>}
          </> : <>
            <label>Full Name<input value={signupName} onChange={(e) => setSignupName(e.target.value)} placeholder="Enter your name" /></label>
            <label>Phone Number <span className="req">*</span><input value={signupPhone} onChange={(e) => setSignupPhone(e.target.value)} placeholder="9876543210" /></label>
            <label>Email <span className="req">*</span><input value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} placeholder="you@example.com" /></label>
            <label>Password<div className="password"><input type={showSignupPw ? 'text' : 'password'} value={signupPw} onChange={(e) => setSignupPw(e.target.value)} placeholder="At least 8 characters" /><button onClick={() => setShowSignupPw(!showSignupPw)}>{showSignupPw ? 'Hide' : 'Show'}</button></div></label>
            <button className="primary full" onClick={passwordSignUp} disabled={loading}>{loading ? <LoadingLogo variant={variant} /> : 'Create Account'}</button>
          </>}
          <p className="signup">Already have an account? <button className="link" onClick={() => { setMode('signin'); resetState(); setError(''); setInfo(''); }}>Sign in</button></p>
        </>}
      </div>
    </div>
  </div>;
}

export default App;
