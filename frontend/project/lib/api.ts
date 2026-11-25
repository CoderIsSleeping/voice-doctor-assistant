import type { Appointment, AppointmentSlot, Doctor } from '@/lib/types';
import {
  mockAppointments,
  mockDoctors,
  mockSlots,
} from '@/lib/mock-data';

/**
 * Centralized API service for the CareVoice FastAPI backend.
 * Backend base URL is configured via NEXT_PUBLIC_API_URL.
 * Mock data is used only as a fallback when the backend is unreachable.
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function apiRequest<T>(
  path: string,
  options?: RequestInit,
  timeoutMs = 8000
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      ...options,
    });
    if (!res.ok) {
      const message = await res.text().catch(() => res.statusText);
      throw new ApiError(message || `Request failed (${res.status})`, res.status);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

/** Normalizes an unknown backend doctor payload into our Doctor shape. */
function normalizeDoctor(raw: Record<string, unknown>, index: number): Doctor {
  const id = String(raw.id ?? raw.doctor_id ?? index);
  const name = String(raw.name ?? raw.doctor_name ?? 'Unknown Doctor');
  const speciality = String(raw.speciality ?? raw.specialization ?? 'General');
  const experienceYears = Number(raw.experience_years ?? raw.experience ?? 0);
  const rating = Number(raw.rating ?? 0);
  const rawAvail = String(raw.availability ?? 'available').toLowerCase();
  const availability =
    rawAvail === 'busy' || rawAvail === 'offline' ? rawAvail : 'available';
  const initials =
    String(raw.initials ?? '') ||
    name
      .replace('Dr. ', '')
      .split(' ')
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  const palette = [
    'bg-teal-100 text-teal-700',
    'bg-sky-100 text-sky-700',
    'bg-rose-100 text-rose-700',
    'bg-amber-100 text-amber-700',
    'bg-emerald-100 text-emerald-700',
  ];
  const avatarColor = String(raw.avatarColor ?? palette[index % palette.length]);
  return {
    id,
    name,
    speciality,
    experienceYears,
    availability: availability as Doctor['availability'],
    rating,
    avatarColor,
    initials,
  };
}

/** Normalizes an unknown backend slot payload into our AppointmentSlot shape. */
function normalizeSlot(raw: Record<string, unknown>, index: number): AppointmentSlot {
  const id = String(raw.id ?? raw.slot_id ?? `slot-${index}`);
  const doctorId = String(raw.doctor_id ?? raw.doctorId ?? '');
  const date = String(raw.date ?? raw.day ?? '');
  const time = String(raw.time ?? raw.start_time ?? '');
  return { id, doctorId, date, time };
}

/** Normalizes an unknown backend appointment payload into our Appointment shape. */
function normalizeAppointment(
  raw: Record<string, unknown>,
  index: number
): Appointment {
  const id = String(raw.id ?? raw.appointment_id ?? `appt-${index}`);
  const doctorId = String(raw.doctor_id ?? raw.doctorId ?? '');
  const doctorName = String(raw.doctor_name ?? raw.doctorName ?? 'Doctor');
  const speciality = String(raw.speciality ?? raw.specialization ?? 'General');
  const date = String(raw.date ?? '');
  const time = String(raw.time ?? '');
  const rawStatus = String(raw.status ?? 'confirmed').toLowerCase();
  const status = (
    ['confirmed', 'pending', 'cancelled', 'completed'].includes(rawStatus)
      ? rawStatus
      : 'confirmed'
  ) as Appointment['status'];
  return {
    id,
    doctorId,
    doctorName,
    speciality,
    date,
    time,
    status,
    patientName: raw.patient_name ? String(raw.patient_name) : undefined,
    patientPhone: raw.patient_phone ? String(raw.patient_phone) : undefined,
  };
}

export const api = {
  /** GET /api/doctors — loads all doctors with specialities. */
  async getDoctors(): Promise<Doctor[]> {
    try {
      const raw = await apiRequest<unknown[]>('/api/doctors');
      const list = Array.isArray(raw) ? raw : [];
      return list.map((d, i) =>
        normalizeDoctor(d as Record<string, unknown>, i)
      );
    } catch (err) {
      console.warn('[api] getDoctors failed, using mock data', err);
      return mockDoctors;
    }
  },

  /** GET /api/availability?doctor_id=&date= — available slots for a doctor/date. */
  async getAvailability(
    doctorId: string,
    date?: string
  ): Promise<AppointmentSlot[]> {
    const params = new URLSearchParams({ doctor_id: doctorId });
    if (date) params.set('requested_date', date);
    try {
      const raw = await apiRequest<unknown[]>(
        `/api/availability?${params.toString()}`
      );
      const list = Array.isArray(raw) ? raw : [];
      return list.map((s, i) =>
        normalizeSlot(s as Record<string, unknown>, i)
      );
    } catch (err) {
      console.warn('[api] getAvailability failed, using mock data', err);
      return mockSlots.filter((s) => s.doctorId === doctorId);
    }
  },

  /** POST /api/appointments/book — creates a new appointment. */
  async bookAppointment(payload: {
    doctor_id: string;
    date: string;
    time: string;
    patient_name: string;
    patient_phone: string;
  }): Promise<Appointment> {
    const raw = await apiRequest<Record<string, unknown>>(
      '/api/appointments/book',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
    return normalizeAppointment(raw, Date.now());
  },

  /** POST /api/appointments/cancel — cancels an appointment by id. */
  async cancelAppointment(
    appointmentId: string
  ): Promise<{ success: boolean }> {
    const raw = await apiRequest<Record<string, unknown>>(
      '/api/appointments/cancel',
      {
        method: 'POST',
        body: JSON.stringify({ appointment_id: appointmentId }),
      }
    );
    return { success: Boolean(raw.success ?? true) };
  },

  /** GET /api/appointments?phone_number=... — retrieves a patient's appointments. */
  async getAppointments(phoneNumber: string): Promise<Appointment[]> {
    const params = new URLSearchParams({ phone_number: phoneNumber });
    const raw = await apiRequest<unknown[]>(
      `/api/appointments?${params.toString()}`
    );
    const list = Array.isArray(raw) ? raw : [];
    return list.map((a, i) =>
      normalizeAppointment(a as Record<string, unknown>, i)
    );
  },
};

export { API_BASE_URL };
