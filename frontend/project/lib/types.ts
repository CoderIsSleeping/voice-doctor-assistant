export type DoctorAvailability = 'available' | 'busy' | 'offline';

export interface Doctor {
  id: string;
  name: string;
  speciality: string;
  experienceYears: number;
  availability: DoctorAvailability;
  rating: number;
  avatarColor: string;
  initials: string;
}

export interface AppointmentSlot {
  id: string;
  doctorId: string;
  date: string; // ISO date YYYY-MM-DD
  time: string; // HH:mm
}

export type AppointmentStatus = 'confirmed' | 'cancelled' | 'completed' | 'pending';

export interface Appointment {
  id: string;
  doctorId: string;
  doctorName: string;
  speciality: string;
  date: string; // ISO date YYYY-MM-DD
  time: string; // HH:mm
  status: AppointmentStatus;
  patientName?: string;
  patientPhone?: string;
}

export type CallState = 'idle' | 'connecting' | 'listening' | 'speaking';

export type TranscriptSpeaker = 'patient' | 'assistant';

export interface TranscriptMessage {
  id: string;
  speaker: TranscriptSpeaker;
  text: string;
  timestamp: number;
}
