'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { DoctorsSidebar } from '@/components/dashboard/DoctorsSidebar';
import { AppointmentsSidebar } from '@/components/dashboard/AppointmentsSidebar';
import { VoiceAssistant } from '@/components/dashboard/VoiceAssistant';
import { LiveTranscript } from '@/components/dashboard/LiveTranscript';
import { useToast } from '@/hooks/use-toast';
import { useVoiceCall } from '@/hooks/use-voice-call';
import { api, ApiError } from '@/lib/api';
import type {
  Appointment,
  AppointmentSlot,
  Doctor,
} from '@/lib/types';
import { Activity, CalendarClock, Sparkles, Stethoscope } from 'lucide-react';

// Demo patient used for bookings until auth/patient selection is added.
const DEMO_PATIENT = {
  name: 'Alex Morgan',
  phone: '+1234567890',
};

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

export function Dashboard() {
  const { toast } = useToast();
  const { callState, callDuration, transcript, startCall, endCall } =
    useVoiceCall();

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState(true);
  const [doctorsError, setDoctorsError] = useState<string | null>(null);

  const [slots, setSlots] = useState<AppointmentSlot[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [requestedDate, setRequestedDate] = useState<string>(todayISO());
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const [history, setHistory] = useState<Appointment[] | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Load doctors on mount (falls back to mock data inside the service).
  useEffect(() => {
    let active = true;
    (async () => {
      setDoctorsLoading(true);
      setDoctorsError(null);
      try {
        const list = await api.getDoctors();
        if (active) {
          setDoctors(list);
          setDoctorsLoading(false);
        }
      } catch (err) {
        if (active) {
          setDoctorsError(
            err instanceof Error ? err.message : 'Failed to load doctors.'
          );
          setDoctorsLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Load this patient's existing appointments on mount (demo patient phone).
  useEffect(() => {
    let active = true;
    (async () => {
      setAppointmentsLoading(true);
      try {
        const list = await api.getAppointments(DEMO_PATIENT.phone);
        if (active) {
          setAppointments(list);
          setAppointmentsLoading(false);
        }
      } catch (err) {
        if (active) {
          // Non-fatal: start with an empty list so the panel still works.
          setAppointments([]);
          setAppointmentsLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Fetch availability whenever doctor or date changes.
  useEffect(() => {
    if (!selectedDoctorId) {
      setSlots([]);
      return;
    }
    let active = true;
    (async () => {
      setLoadingSlots(true);
      setSlotsError(null);
      try {
        const list = await api.getAvailability(selectedDoctorId, requestedDate);
        if (active) {
          setSlots(list);
          setLoadingSlots(false);
        }
      } catch (err) {
        if (active) {
          setSlotsError(
            err instanceof Error ? err.message : 'Failed to load slots.'
          );
          setSlots([]);
          setLoadingSlots(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [selectedDoctorId, requestedDate]);

  const upcoming = useMemo(
    () => appointments.filter((a) => a.status === 'confirmed'),
    [appointments]
  );
  const recent = useMemo(
    () =>
      appointments
        .filter((a) => a.status !== 'confirmed')
        .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))
        .slice(0, 4),
    [appointments]
  );

  const handleSelectDoctor = useCallback((id: string) => {
    setSelectedDoctorId(id || null);
    setSelectedSlotId(null);
    setSlots([]);
    setSlotsError(null);
  }, []);

  const handleSelectDate = useCallback((date: string) => {
    setRequestedDate(date || todayISO());
    setSelectedSlotId(null);
  }, []);

  const handleBook = useCallback(() => {
    if (!selectedDoctorId || !selectedSlotId) return;
    const slot = slots.find((s) => s.id === selectedSlotId);
    const doctor = doctors.find((d) => d.id === selectedDoctorId);
    if (!slot || !doctor) return;

    setBooking(true);
    api
      .bookAppointment({
        doctor_id: doctor.id,
        date: slot.date,
        time: slot.time,
        patient_name: DEMO_PATIENT.name,
        patient_phone: DEMO_PATIENT.phone,
      })
      .then((newAppt) => {
        setAppointments((prev) => [newAppt, ...prev]);
        setSelectedDoctorId(null);
        setSelectedSlotId(null);
        toast({
          title: 'Appointment booked',
          description: `${doctor.name} on ${slot.date} at ${slot.time}.`,
        });
      })
      .catch((err: unknown) => {
        toast({
          title: 'Booking failed',
          description:
            err instanceof ApiError
              ? err.message
              : 'Could not reach the booking service. Please try again.',
          variant: 'destructive',
        });
      })
      .finally(() => setBooking(false));
  }, [selectedDoctorId, selectedSlotId, slots, doctors, toast]);

  const handleCancel = useCallback(
    (id: string) => {
      setCancellingId(id);
      api
        .cancelAppointment(id)
        .then(() => {
          setAppointments((prev) =>
            prev.map((a) => (a.id === id ? { ...a, status: 'cancelled' } : a))
          );
          toast({
            title: 'Appointment cancelled',
            description: 'The appointment has been cancelled successfully.',
          });
        })
        .catch((err: unknown) => {
          toast({
            title: 'Cancellation failed',
            description:
              err instanceof ApiError
                ? err.message
                : 'Could not reach the service. Please try again.',
            variant: 'destructive',
          });
        })
        .finally(() => setCancellingId(null));
    },
    [toast]
  );

  const handleLookup = useCallback(
    (phone: string) => {
      setLookupLoading(true);
      setLookupError(null);
      setHistory(null);
      api
        .getAppointments(phone)
        .then((matches) => {
          setHistory(matches);
          toast({
            title: 'History retrieved',
            description: `${matches.length} appointment(s) found.`,
          });
        })
        .catch((err: unknown) => {
          const msg =
            err instanceof ApiError
              ? err.message
              : 'Could not reach the service. Please try again.';
          setLookupError(msg);
          toast({
            title: 'Lookup failed',
            description: msg,
            variant: 'destructive',
          });
        })
        .finally(() => setLookupLoading(false));
    },
    [toast]
  );

  const callActive = callState !== 'idle';

  return (
    <div className="flex h-screen flex-col bg-background">
      <Header callActive={callActive} />

      <main className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4 lg:flex-row lg:gap-4 lg:overflow-hidden lg:px-6">
        {/* Left: Doctors */}
        <section className="flex h-[70vh] flex-col shrink-0 rounded-2xl border border-border bg-card/60 backdrop-blur-sm shadow-sm overflow-hidden lg:h-full lg:w-[280px]">
          <DoctorsSidebar
            doctors={doctors}
            slots={slots}
            selectedDoctorId={selectedDoctorId}
            onSelectDoctor={handleSelectDoctor}
            loadingSlots={loadingSlots}
            slotsError={slotsError}
            requestedDate={requestedDate}
            onSelectDate={handleSelectDate}
            selectedSlotId={selectedSlotId}
            onSelectSlot={setSelectedSlotId}
            onBook={handleBook}
            booking={booking}
            loadingDoctors={doctorsLoading}
            doctorsError={doctorsError}
          />
        </section>

        {/* Center: Transcript (top) + Voice assistant (below) */}
        <section className="flex flex-1 flex-col gap-3 min-w-0 lg:h-full lg:overflow-hidden">
          <LiveTranscript messages={transcript} active={callActive} />
          <div className="flex flex-col items-center justify-center lg:flex-1 lg:min-h-0">
            <VoiceAssistant
              callState={callState}
              callDuration={callDuration}
              onStartCall={startCall}
              onEndCall={endCall}
              transcript={transcript}
            />
          </div>
        </section>

        {/* Right: Appointments */}
        <section className="flex h-[70vh] flex-col shrink-0 rounded-2xl border border-border bg-card/60 backdrop-blur-sm shadow-sm overflow-hidden lg:h-full lg:w-[280px]">
          <AppointmentsSidebar
            upcoming={upcoming}
            recent={recent}
            onCancel={handleCancel}
            cancellingId={cancellingId}
            onLookup={handleLookup}
            history={history}
            lookupLoading={lookupLoading}
            lookupError={lookupError}
            loading={appointmentsLoading}
          />
        </section>
      </main>
    </div>
  );
}

function Header({ callActive }: { callActive: boolean }) {
  return (
    <header className="flex items-center justify-between px-4 py-3 lg:px-6">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-gradient shadow-md shadow-teal/30">
          <Stethoscope className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-base font-semibold tracking-tight text-foreground">
            CareVoice<span className="text-teal"> AI</span>
          </h1>
          <p className="text-[11px] text-muted-foreground -mt-0.5">
            Voice-first doctor appointment assistant
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <StatusPill
          icon={<Activity className="h-3.5 w-3.5" />}
          label={callActive ? 'Call in progress' : 'AI Online'}
          tone={callActive ? 'live' : 'ok'}
        />
        <StatusPill
          icon={<CalendarClock className="h-3.5 w-3.5" />}
          label="Demo mode"
          tone="muted"
        />
        <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5">
          <Sparkles className="h-3.5 w-3.5 text-teal" />
          <span className="text-xs font-medium text-foreground">
            Hackathon Preview
          </span>
        </div>
      </div>
    </header>
  );
}

function StatusPill({
  icon,
  label,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  tone: 'ok' | 'live' | 'muted';
}) {
  const styles = {
    ok: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    live: 'bg-rose-50 text-rose-700 border-rose-200',
    muted: 'bg-secondary text-muted-foreground border-border',
  };
  return (
    <div
      className={`hidden sm:flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-medium ${styles[tone]}`}
    >
      {icon}
      {label}
      {tone === 'live' && (
        <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
      )}
    </div>
  );
}
