import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, type Appointment, type Pet } from './api';

export type DataState<T> = { loading: boolean; error: string | null; data: T; refetch: () => void };

export function usePets(): DataState<Pet[]> {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pets, setPets] = useState<Pet[]>([]);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(null);
    api.getPets().then((data) => { if (active) setPets(data); }).catch((err) => { if (active) setError(err instanceof ApiError ? err.message : 'Could not load pets'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [tick]);
  const refetch = useCallback(() => setTick((t) => t + 1), []);
  return { loading, error, data: pets, refetch };
}

export function useAppointments(): DataState<Appointment[]> {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Appointment[]>([]);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(null);
    api.getAppointments().then((data) => { if (active) setItems(data); }).catch((err) => { if (active) setError(err instanceof ApiError ? err.message : 'Could not load appointments'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [tick]);
  const refetch = useCallback(() => setTick((t) => t + 1), []);
  return { loading, error, data: items, refetch };
}

export function usePetDetail(petId: string | null) {
  const [loading, setLoading] = useState(!!petId);
  const [error, setError] = useState<string | null>(null);
  const [pet, setPet] = useState<Pet | null>(null);
  const [clinicalRecords, setClinicalRecords] = useState<NonNullable<unknown[]>>([]);
  const [prescriptions, setPrescriptions] = useState<NonNullable<unknown[]>>([]);
  const [appointments, setAppointments] = useState<NonNullable<unknown[]>>([]);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!petId) return;
    let active = true;
    setLoading(true); setError(null);
    Promise.all([
      api.getPets().then((data) => data.find((p) => p.petId === petId) ?? null),
      api.getClinicalRecords(petId).catch(() => []),
      api.getPrescriptions(petId).catch(() => []),
      api.getAppointments().then((data) => data.filter((a) => a.petId === petId)).catch(() => []),
    ]).then(([p, records, rxs, appts]) => {
      if (!active) return;
      setPet(p); setClinicalRecords(records as never[]); setPrescriptions(rxs as never[]); setAppointments(appts as never[]);
    }).catch((err) => { if (active) setError(err instanceof ApiError ? err.message : 'Could not load pet details'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [petId, tick]);
  const refetch = useCallback(() => setTick((t) => t + 1), []);
  return { loading, error, pet, clinicalRecords, prescriptions, appointments, refetch };
}
