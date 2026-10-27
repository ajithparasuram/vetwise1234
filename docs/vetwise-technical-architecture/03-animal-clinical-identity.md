# Animal Clinical Identity Layer

## Concept

Every animal is treated as a persistent clinical identity, not just a basic pet record. The AnimalContext structure contains the full clinical profile.

## AnimalContext Fields

- patientId — unique clinical identity
- name, species, breed, sex, dateOfBirth, age, weight
- color, markings, microchipNumber
- allergies, existingConditions, medicalHistory
- vaccinationInfo, medications, specialRequirements
- breedingEligible, status
- registrationDate, lastVisit

## Species Support

Dogs, Cats, Cattle, Horses, Goats, Sheep, Rabbits, Poultry, Other

## Breed Handling

Breed is searchable free-text. The system provides breed suggestions (BREED_SUGGESTIONS in demo-data.ts) but does not restrict breed to a fixed dropdown. Searches like "German Shepherd" work against the breed field.

## Search

The PatientSearch component (`src/components/PatientSearch.tsx`) supports:
- Patient ID, Client ID, animal name, breed, species, client name, phone
- Species filter dropdown
- Backend-driven search via `db.searchPatients()` with PostgreSQL ILIKE
- Frontend filtering is used only as fallback when backend is unavailable

## Clinical Context Assembly

The ClinicalContextBuilder component (`src/components/ClinicalContextBuilder.tsx`) assembles:
- Current appointment
- Previous visits
- Clinical history records
- Previous prescriptions
- Vaccination history
- Weight history
- Known conditions
- Recent relevant events

## Data Source Distinction

The ClinicalContext explicitly distinguishes:
- **Recorded clinical data** — source: 'recorded', tagged with veterinarian name
- **AI-generated guidance** — source: 'ai_guidance', tagged with "AI" and medical disclaimer

AI output is never presented as clinical record data.
