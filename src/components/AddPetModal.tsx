/**
 * AddPetModal — comprehensive multi-section animal registration form.
 *
 * Sections:
 *  1. Animal Information (species, breed with autocomplete+free text, Other species)
 *  2. Identity (face photo, body photo, additional photos, video)
 *  3. Medical Information (weight, allergies, conditions, vaccinations, medications)
 *  4. Breeding (eligibility toggle, breeding fields when applicable)
 *  5. Location (saved location display)
 */

import { useRef, useState } from 'react';
import {
  X, Check, PawPrint, Camera, Upload, MapPin, Plus, Trash2,
  ChevronDown, ChevronUp, ImageIcon, Video, Heart,
} from 'lucide-react';
import { SPECIES_LIST, getBreedsForSpecies } from '@/lib/demo-data';
import { insertPatient } from '@/lib/queries';

interface PetFormData {
  name: string;
  species: string;
  customSpecies: string;
  breed: string;
  sex: string;
  dateOfBirth: string;
  estimatedAge: string;
  weight: string;
  color: string;
  markings: string;
  microchipNumber: string;
  identificationDetails: string;
  notes: string;
  allergies: string;
  existingConditions: string;
  medicalHistory: string;
  vaccinationInfo: string;
  medications: string;
  specialRequirements: string;
  breedingEligible: boolean;
  breedingPurpose: string;
  customBreedingPurpose: string;
  facePhoto: File | null;
  bodyPhoto: File | null;
  additionalPhotos: File[];
  video: File | null;
}

const initialForm: PetFormData = {
  name: '', species: '', customSpecies: '', breed: '', sex: '',
  dateOfBirth: '', estimatedAge: '', weight: '', color: '', markings: '',
  microchipNumber: '', identificationDetails: '', notes: '',
  allergies: '', existingConditions: '', medicalHistory: '',
  vaccinationInfo: '', medications: '', specialRequirements: '',
  breedingEligible: false, breedingPurpose: '', customBreedingPurpose: '',
  facePhoto: null, bodyPhoto: null,
  additionalPhotos: [], video: null,
};

export function AddPetModal({
  onClose,
  onAdd,
  clientId,
  demoMode = false,
}: {
  onClose: () => void;
  onAdd: (pet: Record<string, unknown>) => void;
  clientId: string;
  demoMode?: boolean;
}) {
  const [form, setForm] = useState<PetFormData>(initialForm);
  const [breedOpen, setBreedOpen] = useState(false);
  const [highlightedBreed, setHighlightedBreed] = useState(0);
  const [showOtherSpecies, setShowOtherSpecies] = useState(false);
  const [showBreeding, setShowBreeding] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const faceInputRef = useRef<HTMLInputElement>(null);
  const bodyInputRef = useRef<HTMLInputElement>(null);
  const additionalInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const availableBreeds = getBreedsForSpecies(form.species);
  const filteredBreeds = availableBreeds.filter((b) =>
    b.toLowerCase().includes(form.breed.toLowerCase()),
  );
  const isCustomBreed = form.breed && !availableBreeds.includes(form.breed);

  const update = <K extends keyof PetFormData>(key: K, value: PetFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSpeciesChange = (value: string) => {
    update('species', value);
    update('breed', '');
    setBreedOpen(false);
    setHighlightedBreed(0);
    setShowOtherSpecies(value === 'Other');
  };

  const handleBreedKey = (e: React.KeyboardEvent) => {
    if (!breedOpen || filteredBreeds.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedBreed((prev) => Math.min(prev + 1, filteredBreeds.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedBreed((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = filteredBreeds[highlightedBreed];
      if (selected) { update('breed', selected); setBreedOpen(false); }
    } else if (e.key === 'Escape') {
      setBreedOpen(false);
    }
  };

  const handleFileSelect = (key: 'facePhoto' | 'bodyPhoto' | 'video', file: File | null) => {
    update(key, file);
  };

  const addAdditionalPhoto = (file: File) => {
    setForm((prev) => ({ ...prev, additionalPhotos: [...prev.additionalPhotos, file] }));
  };

  const removeAdditionalPhoto = (index: number) => {
    setForm((prev) => ({
      ...prev,
      additionalPhotos: prev.additionalPhotos.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('Pet name is required.'); return; }
    if (!form.species) { setError('Please select a species.'); return; }
    if (form.species === 'Other' && !form.customSpecies.trim()) {
      setError('Please enter the animal type.'); return;
    }
    if (!form.sex) { setError('Please select sex.'); return; }

    if (saving) return;
    setError('');

    // Demo workspace: never call the server. Keep the record on screen only.
    if (demoMode) {
      onAdd({
        patientId: `DEMO-${Date.now()}`,
        name: form.name.trim(),
        species: form.species === 'Other' ? form.customSpecies.trim() : form.species,
        breed: form.breed || '',
        sex: form.sex,
        age: form.estimatedAge || 'Not specified',
        weight: form.weight || 'Not specified',
        color: form.color || 'Not specified',
        visits: 0,
        lastVisit: 'No visits yet',
        isDemo: true,
      });
      onClose();
      return;
    }

    // Only fields the server handler persists. Ownership is set by the backend
    // from the signed-in user, so no clientId/ownerId is sent.
    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      species: form.species === 'Other' ? form.customSpecies.trim() : form.species,
      sex: form.sex,
    };
    if (form.species === 'Other') payload.customSpecies = form.customSpecies.trim();
    if (form.breed) payload.breed = form.breed;
    if (form.color) payload.color = form.color;
    if (form.markings) payload.markings = form.markings;
    if (form.dateOfBirth) payload.dateOfBirth = form.dateOfBirth;
    if (form.estimatedAge) payload.age = form.estimatedAge;
    if (form.weight) payload.weight = form.weight;
    if (form.microchipNumber) payload.microchipNumber = form.microchipNumber;
    if (form.identificationDetails) payload.identificationDetails = form.identificationDetails;
    if (form.notes) payload.notes = form.notes;
    if (form.allergies) payload.allergies = form.allergies;
    if (form.existingConditions) payload.existingConditions = form.existingConditions;
    if (form.medicalHistory) payload.medicalHistory = form.medicalHistory;
    if (form.vaccinationInfo) payload.vaccinationInfo = form.vaccinationInfo;
    if (form.medications) payload.medications = form.medications;
    if (form.specialRequirements) payload.specialRequirements = form.specialRequirements;
    if (form.breedingEligible) payload.breedingEligible = true;

    setSaving(true);
    const { data: created, error: apiError } = await insertPatient(payload);
    setSaving(false);

    if (apiError || !created) {
      // Stay open, keep the form, show the failure. Nothing is added locally.
      setError(apiError ?? 'The server did not confirm the save. Your pet was not registered. Please try again.');
      return;
    }

    onAdd(created as Record<string, unknown>);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <p className="eyebrow">VETWISE</p>
            <h2>Register a New Animal</h2>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="modal-scroll">
          {/* Section 1: Animal Information */}
          <FormSection title="Animal Information" icon={<PawPrint size={16} />}>
            <FormGrid>
              <Field label="Animal Name" required>
                <input value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Enter animal name" />
              </Field>
              <Field label="Species" required>
                <select value={form.species} onChange={(e) => handleSpeciesChange(e.target.value)}>
                  <option value="">Select species</option>
                  {SPECIES_LIST.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              {showOtherSpecies && (
                <Field label="Custom Animal Type" required>
                  <input
                    value={form.customSpecies}
                    onChange={(e) => update('customSpecies', e.target.value)}
                    placeholder="e.g. Snake, Deer, Exotic bird"
                  />
                </Field>
              )}
              <Field label="Breed">
                <div className="breed-suggestions">
                  <input
                    value={form.breed}
                    onChange={(e) => { update('breed', e.target.value); setBreedOpen(true); setHighlightedBreed(0); }}
                    onFocus={() => setBreedOpen(true)}
                    onKeyDown={handleBreedKey}
                    onBlur={() => setTimeout(() => setBreedOpen(false), 150)}
                    placeholder={form.species ? 'Search or type breed name' : 'Select species first'}
                    disabled={!form.species}
                  />
                  {breedOpen && form.species && (
                    <div className="breed-list open">
                      {filteredBreeds.length === 0 && form.breed && (
                        <button type="button" className="breed-custom-entry" onClick={() => { update('breed', form.breed); setBreedOpen(false); }}>
                          Use "{form.breed}" as custom breed
                        </button>
                      )}
                      {filteredBreeds.length === 0 && !form.breed && (
                        <div className="breed-empty">Start typing to search or enter a custom breed</div>
                      )}
                      {filteredBreeds.map((b, i) => (
                        <button
                          type="button"
                          key={b}
                          className={i === highlightedBreed ? 'highlighted' : ''}
                          onClick={() => { update('breed', b); setBreedOpen(false); }}
                        >{b}</button>
                      ))}
                      {form.breed && filteredBreeds.length > 0 && !availableBreeds.includes(form.breed) && (
                        <button type="button" className="breed-custom-entry" onClick={() => { update('breed', form.breed); setBreedOpen(false); }}>
                          Use "{form.breed}" as custom breed
                        </button>
                      )}
                    </div>
                  )}
                  {isCustomBreed && <small className="breed-custom-tag">Custom breed</small>}
                </div>
              </Field>
              <Field label="Sex" required>
                <select value={form.sex} onChange={(e) => update('sex', e.target.value)}>
                  <option value="">Select sex</option>
                  <option>Male</option>
                  <option>Female</option>
                </select>
              </Field>
              <Field label="Date of Birth">
                <input type="date" value={form.dateOfBirth} onChange={(e) => update('dateOfBirth', e.target.value)} />
              </Field>
              <Field label="Estimated Age">
                <input value={form.estimatedAge} onChange={(e) => update('estimatedAge', e.target.value)} placeholder="e.g. 3y 2m" />
              </Field>
              <Field label="Weight">
                <input value={form.weight} onChange={(e) => update('weight', e.target.value)} placeholder="e.g. 28.5 kg" />
              </Field>
              <Field label="Color">
                <input value={form.color} onChange={(e) => update('color', e.target.value)} placeholder="e.g. Golden, Black & White" />
              </Field>
              <Field label="Markings">
                <input value={form.markings} onChange={(e) => update('markings', e.target.value)} placeholder="e.g. White patch on chest" />
              </Field>
              <Field label="Microchip Number">
                <input value={form.microchipNumber} onChange={(e) => update('microchipNumber', e.target.value)} placeholder="15-digit microchip ID" />
              </Field>
              <Field label="Identification Details" wide>
                <input value={form.identificationDetails} onChange={(e) => update('identificationDetails', e.target.value)} placeholder="Any other identification details" />
              </Field>
              <Field label="Notes" wide>
                <textarea value={form.notes} onChange={(e) => update('notes', e.target.value)} placeholder="Any additional information about this animal" />
              </Field>
            </FormGrid>
          </FormSection>

          {/* Section 2: Identity — Photos & Video */}
          <FormSection title="Photos & Video" icon={<Camera size={16} />}>
            <div className="media-upload-grid">
              <MediaUploadSlot
                label="Face Photo"
                icon={<Camera size={20} />}
                file={form.facePhoto}
                onPick={() => faceInputRef.current?.click()}
                onClear={() => handleFileSelect('facePhoto', null)}
                inputRef={faceInputRef}
                onFile={(f) => handleFileSelect('facePhoto', f)}
              />
              <MediaUploadSlot
                label="Full Body Photo"
                icon={<ImageIcon size={20} />}
                file={form.bodyPhoto}
                onPick={() => bodyInputRef.current?.click()}
                onClear={() => handleFileSelect('bodyPhoto', null)}
                inputRef={bodyInputRef}
                onFile={(f) => handleFileSelect('bodyPhoto', f)}
              />
            </div>

            <div className="media-upload-section">
              <div className="media-upload-label">
                <strong>Additional Photos</strong>
                <small>Side profile, markings, wounds, identification details</small>
              </div>
              <div className="additional-photos-row">
                {form.additionalPhotos.map((photo, i) => (
                  <div key={i} className="photo-thumb">
                    <img src={URL.createObjectURL(photo)} alt={`Additional ${i + 1}`} />
                    <button type="button" className="photo-remove" onClick={() => removeAdditionalPhoto(i)}><Trash2 size={12} /></button>
                  </div>
                ))}
                <button type="button" className="photo-add-btn" onClick={() => additionalInputRef.current?.click()}>
                  <Plus size={18} />
                  <span>Add Photo</span>
                </button>
                <input
                  ref={additionalInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  hidden
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) addAdditionalPhoto(f); e.target.value = ''; }}
                />
              </div>
            </div>

            <div className="media-upload-section">
              <div className="media-upload-label">
                <strong>Video</strong>
                <small>Animal movement, behavior, or clinical video</small>
              </div>
              <MediaUploadSlot
                label="Animal Video"
                icon={<Video size={20} />}
                file={form.video}
                onPick={() => videoInputRef.current?.click()}
                onClear={() => handleFileSelect('video', null)}
                inputRef={videoInputRef}
                onFile={(f) => handleFileSelect('video', f)}
                wide
              />
            </div>
          </FormSection>

          {/* Section 3: Medical Information */}
          <FormSection title="Medical Information" icon={<Heart size={16} />}>
            <FormGrid>
              <Field label="Allergies">
                <input value={form.allergies} onChange={(e) => update('allergies', e.target.value)} placeholder="e.g. None known, Pollen, Certain foods" />
              </Field>
              <Field label="Existing Conditions">
                <input value={form.existingConditions} onChange={(e) => update('existingConditions', e.target.value)} placeholder="e.g. Arthritis, Diabetes" />
              </Field>
              <Field label="Previous Medical History" wide>
                <textarea value={form.medicalHistory} onChange={(e) => update('medicalHistory', e.target.value)} placeholder="Past surgeries, illnesses, treatments" />
              </Field>
              <Field label="Vaccination Information" wide>
                <textarea value={form.vaccinationInfo} onChange={(e) => update('vaccinationInfo', e.target.value)} placeholder="Vaccines administered and dates" />
              </Field>
              <Field label="Current Medications" wide>
                <input value={form.medications} onChange={(e) => update('medications', e.target.value)} placeholder="e.g. Multivitamin, Antibiotics" />
              </Field>
              <Field label="Special Requirements" wide>
                <textarea value={form.specialRequirements} onChange={(e) => update('specialRequirements', e.target.value)} placeholder="Dietary needs, handling precautions, etc." />
              </Field>
            </FormGrid>
          </FormSection>

          {/* Section 4: Breeding */}
          <FormSection
            title="Breeding Information"
            icon={<Heart size={16} />}
            collapsible
            defaultOpen={false}
          >
            <p className="form-hint">Enable breeding tracking for this animal if applicable. Breeding details can be added after registration.</p>
            <label className="toggle-row">
              <input
                type="checkbox"
                checked={form.breedingEligible}
                onChange={(e) => {
                  update('breedingEligible', e.target.checked);
                  setShowBreeding(e.target.checked);
                }}
              />
              <span>This animal is intended for breeding</span>
            </label>
            {showBreeding && (
              <div style={{ marginTop: '12px' }}>
                <Field label="Breeding Purpose">
                  <select value={form.breedingPurpose} onChange={(e) => update('breedingPurpose', e.target.value)}>
                    <option value="">Select purpose</option>
                    <option>Companion / Pet</option>
                    <option>Dairy</option>
                    <option>Meat</option>
                    <option>Draft / Work</option>
                    <option>Show / Exhibition</option>
                    <option>Fiber / Wool</option>
                    <option>Egg Production</option>
                    <option>Other</option>
                  </select>
                </Field>
                {form.breedingPurpose === 'Other' && (
                  <Field label="Custom Breeding Purpose" required>
                    <input
                      value={form.customBreedingPurpose}
                      onChange={(e) => update('customBreedingPurpose', e.target.value)}
                      placeholder="e.g. Guard work, Therapy, Breeding stock"
                    />
                  </Field>
                )}
                <p className="form-hint" style={{ marginTop: '10px' }}>
                  You can add breeding records (mating dates, partner details, pregnancy tracking, outcomes) from the animal's profile after registration.
                </p>
              </div>
            )}
          </FormSection>

          {/* Section 5: Location */}
          <FormSection title="Service Location" icon={<MapPin size={16} />}>
            <p className="form-hint">
              This animal is linked to your client account <strong>{clientId}</strong>.
              Visit locations are managed in your profile and can be selected when booking appointments.
            </p>
          </FormSection>

          {!demoMode && <p style={{ color: '#e8870a', fontSize: '12px', margin: '4px 0 8px' }}>Photos, video, and breeding details are not saved to the server yet. All text fields including medical information will be stored.</p>}
          {error && <p className="login-error" role="alert" style={{ margin: '4px 0 8px' }}>{error}</p>}
        </div>

        <div className="modal-actions">
          <button className="secondary" onClick={onClose}>Cancel</button>
          <button className="primary" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving...' : <><Check size={16} /> Register Animal</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Sub-components ----

function FormSection({
  title, icon, children, collapsible, defaultOpen = true,
}: {
  title: string; icon: React.ReactNode; children: React.ReactNode;
  collapsible?: boolean; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  if (collapsible) {
    return (
      <div className="form-section">
        <button type="button" className="form-section-header collapsible" onClick={() => setOpen(!open)}>
          {icon}
          <span>{title}</span>
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {open && <div className="form-section-body">{children}</div>}
      </div>
    );
  }
  return (
    <div className="form-section">
      <div className="form-section-header">{icon}<span>{title}</span></div>
      <div className="form-section-body">{children}</div>
    </div>
  );
}

function FormGrid({ children }: { children: React.ReactNode }) {
  return <div className="form-grid">{children}</div>;
}

function Field({
  label, children, required, wide,
}: {
  label: string; children: React.ReactNode; required?: boolean; wide?: boolean;
}) {
  return (
    <label className={wide ? 'wide' : ''}>
      {label}{required && <span className="req"> *</span>}
      {children}
    </label>
  );
}

function MediaUploadSlot({
  label, icon, file, onPick, onClear, inputRef, onFile, wide,
}: {
  label: string; icon: React.ReactNode; file: File | null;
  onPick: () => void; onClear: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onFile: (file: File) => void; wide?: boolean;
}) {
  return (
    <div className={`media-slot ${wide ? 'wide' : ''}`}>
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="file"
        accept="image/*,video/*"
        capture="environment"
        hidden
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }}
      />
      {file ? (
        <div className="media-preview">
          {file.type.startsWith('video/') ? (
            <video src={URL.createObjectURL(file)} />
          ) : (
            <img src={URL.createObjectURL(file)} alt={label} />
          )}
          <div className="media-preview-info">
            <span>{file.name}</span>
            <button type="button" className="link" onClick={onClear}>Remove</button>
          </div>
        </div>
      ) : (
        <button type="button" className="media-upload-btn" onClick={onPick}>
          {icon}
          <span>{label}</span>
          <small>Take photo or upload</small>
        </button>
      )}
    </div>
  );
}
