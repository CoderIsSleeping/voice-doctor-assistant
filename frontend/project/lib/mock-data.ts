import type { Appointment, Doctor, AppointmentSlot } from '@/lib/types';

export const mockDoctors: Doctor[] = [
  {
    id: 'doc-1',
    name: 'Dr. Sarah Mitchell',
    speciality: 'Cardiologist',
    experienceYears: 14,
    availability: 'available',
    rating: 4.9,
    avatarColor: 'bg-teal-100 text-teal-700',
    initials: 'SM',
  },
  {
    id: 'doc-2',
    name: 'Dr. James Okoro',
    speciality: 'General Physician',
    experienceYears: 9,
    availability: 'available',
    rating: 4.7,
    avatarColor: 'bg-sky-100 text-sky-700',
    initials: 'JO',
  },
  {
    id: 'doc-3',
    name: 'Dr. Priya Nair',
    speciality: 'Dermatologist',
    experienceYears: 11,
    availability: 'busy',
    rating: 4.8,
    avatarColor: 'bg-rose-100 text-rose-700',
    initials: 'PN',
  },
  {
    id: 'doc-4',
    name: 'Dr. Liam Chen',
    speciality: 'Neurologist',
    experienceYears: 17,
    availability: 'available',
    rating: 4.9,
    avatarColor: 'bg-amber-100 text-amber-700',
    initials: 'LC',
  },
  {
    id: 'doc-5',
    name: 'Dr. Emily Carter',
    speciality: 'Pediatrician',
    experienceYears: 7,
    availability: 'offline',
    rating: 4.6,
    avatarColor: 'bg-violet-100 text-violet-700',
    initials: 'EC',
  },
];

function todayPlus(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export const mockSlots: AppointmentSlot[] = [
  { id: 's1', doctorId: 'doc-1', date: todayPlus(0), time: '09:00' },
  { id: 's2', doctorId: 'doc-1', date: todayPlus(0), time: '11:30' },
  { id: 's3', doctorId: 'doc-1', date: todayPlus(1), time: '10:15' },
  { id: 's4', doctorId: 'doc-1', date: todayPlus(1), time: '14:00' },
  { id: 's5', doctorId: 'doc-2', date: todayPlus(0), time: '08:45' },
  { id: 's6', doctorId: 'doc-2', date: todayPlus(0), time: '13:20' },
  { id: 's7', doctorId: 'doc-2', date: todayPlus(2), time: '15:30' },
  { id: 's8', doctorId: 'doc-3', date: todayPlus(1), time: '09:30' },
  { id: 's9', doctorId: 'doc-3', date: todayPlus(2), time: '12:00' },
  { id: 's10', doctorId: 'doc-4', date: todayPlus(0), time: '16:00' },
  { id: 's11', doctorId: 'doc-4', date: todayPlus(1), time: '08:00' },
  { id: 's12', doctorId: 'doc-4', date: todayPlus(3), time: '11:45' },
];

export const mockAppointments: Appointment[] = [
  {
    id: 'appt-1',
    doctorId: 'doc-1',
    doctorName: 'Dr. Sarah Mitchell',
    speciality: 'Cardiologist',
    date: todayPlus(2),
    time: '10:15',
    status: 'confirmed',
    patientName: 'Alex Morgan',
    patientPhone: '+1234567890',
  },
  {
    id: 'appt-2',
    doctorId: 'doc-4',
    doctorName: 'Dr. Liam Chen',
    speciality: 'Neurologist',
    date: todayPlus(4),
    time: '16:00',
    status: 'confirmed',
    patientName: 'Alex Morgan',
    patientPhone: '+1234567890',
  },
  {
    id: 'appt-3',
    doctorId: 'doc-2',
    doctorName: 'Dr. James Okoro',
    speciality: 'General Physician',
    date: todayPlus(-5),
    time: '13:20',
    status: 'completed',
    patientName: 'Alex Morgan',
    patientPhone: '+1234567890',
  },
  {
    id: 'appt-4',
    doctorId: 'doc-3',
    doctorName: 'Dr. Priya Nair',
    speciality: 'Dermatologist',
    date: todayPlus(-12),
    time: '09:30',
    status: 'cancelled',
    patientName: 'Alex Morgan',
    patientPhone: '+1234567890',
  },
];
