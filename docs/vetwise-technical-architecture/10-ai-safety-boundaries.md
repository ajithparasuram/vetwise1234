# AI Safety Boundaries

## What AI Is

The AI Health Checker provides **AI-assisted health information and guidance**. It is NOT:
- Autonomous diagnosis
- Autonomous prescription
- Emergency medical authority

## Integration with Animal Context

The AI Health Checker integrates with the AnimalContext architecture. When a health check is performed, the animal's species, breed, age, weight, and known conditions are available as context.

## Data Distinction

The ClinicalContextBuilder explicitly distinguishes:
- **Recorded clinical data** — source: 'recorded', tagged with veterinarian name, displayed in the main timeline
- **AI-generated guidance** — source: 'ai_guidance', displayed in a separate section with red styling and medical disclaimer

AI output is NEVER presented as clinical record data.

## Medical Disclaimer

The UI displays: "AI-generated guidance is NOT a veterinary diagnosis. It does not replace professional veterinary judgment. Always verify with clinical examination."

## What AI Must NOT Do

1. Fabricate medical answers
2. Invent medical history
3. Invent clinical values
4. Make autonomous diagnoses
5. Prescribe medications
6. Override veterinarian decisions

## API Integration

The existing `api.aiHealthCheck()` endpoint is preserved. The AI handler is in `infrastructure/lambda/src/handlers/ai.ts`.

## Clinical Data Safety

- No sensitive patient data in URLs
- No API secrets in frontend code
- No AWS secrets in source code
- No payment secrets in frontend
- No AI provider secret keys in frontend
- Proper loading/error/permission states
- Safe empty states
- Safe logout/session expiry
