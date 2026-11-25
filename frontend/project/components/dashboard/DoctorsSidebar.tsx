'use client';

import { useMemo, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertCircle,
  CalendarDays,
  ChevronLeft,
  Clock,
  Loader2,
  Search,
  Star,
  Stethoscope,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDateLabel } from '@/lib/format';
import type { AppointmentSlot, Doctor } from '@/lib/types';

interface DoctorsSidebarProps {
  doctors: Doctor[];
  slots: AppointmentSlot[];
  selectedDoctorId: string | null;
  onSelectDoctor: (id: string) => void;
  loadingSlots: boolean;
  slotsError: string | null;
  requestedDate: string;
  onSelectDate: (date: string) => void;
  selectedSlotId: string | null;
  onSelectSlot: (slotId: string) => void;
  onBook: () => void;
  booking: boolean;
  loadingDoctors: boolean;
  doctorsError: string | null;
}

const AVAILABILITY_STYLE: Record<
  Doctor['availability'],
  { label: string; dot: string; badge: string }
> = {
  available: {
    label: 'Available',
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  busy: {
    label: 'Busy',
    dot: 'bg-amber-500',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  offline: {
    label: 'Offline',
    dot: 'bg-zinc-400',
    badge: 'bg-zinc-100 text-zinc-500 border-zinc-200',
  },
};

export function DoctorsSidebar({
  doctors,
  slots,
  selectedDoctorId,
  onSelectDoctor,
  loadingSlots,
  slotsError,
  requestedDate,
  onSelectDate,
  selectedSlotId,
  onSelectSlot,
  onBook,
  booking,
  loadingDoctors,
  doctorsError,
}: DoctorsSidebarProps) {
  const [query, setQuery] = useState('');

  const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId) ?? null;

  const filteredDoctors = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return doctors;
    return doctors.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.speciality.toLowerCase().includes(q)
    );
  }, [doctors, query]);

  const slotsForDoctor = useMemo(
    () => slots.filter((s) => s.doctorId === selectedDoctorId),
    [slots, selectedDoctorId]
  );

  const groupedSlots = useMemo(() => {
    const map = new Map<string, AppointmentSlot[]>();
    slotsForDoctor.forEach((s) => {
      const arr = map.get(s.date) ?? [];
      arr.push(s);
      map.set(s.date, arr);
    });
    return Array.from(map.entries());
  }, [slotsForDoctor]);

  if (selectedDoctor) {
    return (
      <DoctorSlotsView
        doctor={selectedDoctor}
        groupedSlots={groupedSlots}
        loading={loadingSlots}
        error={slotsError}
        requestedDate={requestedDate}
        onSelectDate={onSelectDate}
        selectedSlotId={selectedSlotId}
        onSelectSlot={onSelectSlot}
        onBack={() => onSelectDoctor('')}
        onBook={onBook}
        booking={booking}
      />
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-5 pt-5 pb-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy text-white">
          <Stethoscope className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Find a Doctor
          </h2>
          <p className="text-xs text-muted-foreground">
            {doctors.length} specialists available
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="px-5 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or speciality"
            className="h-9 w-full rounded-lg border border-input bg-secondary/50 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>

      <ScrollArea className="flex-1 px-4 pb-4 scrollbar-thin">
        {loadingDoctors ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground/60 mb-2" />
            <p className="text-sm text-muted-foreground">Loading doctors…</p>
          </div>
        ) : doctorsError ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-7 w-7 text-destructive/60 mb-2" />
            <p className="text-sm text-destructive">{doctorsError}</p>
          </div>
        ) : filteredDoctors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Stethoscope className="h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">No doctors found.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredDoctors.map((doctor) => {
              const avail = AVAILABILITY_STYLE[doctor.availability];
              return (
                <div
                  key={doctor.id}
                  className="group rounded-xl border border-border bg-card p-3.5 shadow-sm transition-all hover:shadow-md hover:border-primary/40"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        'flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                        doctor.avatarColor
                      )}
                    >
                      {doctor.initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="truncate text-sm font-semibold text-foreground">
                          {doctor.name}
                        </h3>
                        <div className="flex items-center gap-0.5 text-amber-500 shrink-0">
                          <Star className="h-3 w-3 fill-current" />
                          <span className="text-xs font-medium">
                            {doctor.rating}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {doctor.speciality}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {doctor.experienceYears} yrs experience
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium',
                            avail.badge
                          )}
                        >
                          <span
                            className={cn('h-1.5 w-1.5 rounded-full', avail.dot)}
                          />
                          {avail.label}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2.5 text-xs group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary"
                          disabled={doctor.availability === 'offline'}
                          onClick={() => onSelectDoctor(doctor.id)}
                        >
                          View Slots
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

interface DoctorSlotsViewProps {
  doctor: Doctor;
  groupedSlots: [string, AppointmentSlot[]][];
  loading: boolean;
  error: string | null;
  requestedDate: string;
  onSelectDate: (date: string) => void;
  selectedSlotId: string | null;
  onSelectSlot: (slotId: string) => void;
  onBack: () => void;
  onBook: () => void;
  booking: boolean;
}

function DoctorSlotsView({
  doctor,
  groupedSlots,
  loading,
  error,
  requestedDate,
  onSelectDate,
  selectedSlotId,
  onSelectSlot,
  onBack,
  onBook,
  booking,
}: DoctorSlotsViewProps) {
  const minDate = new Date().toISOString().split('T')[0];
  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pt-5 pb-3 border-b border-border">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to doctors
        </button>
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-full text-sm font-semibold',
              doctor.avatarColor
            )}
          >
            {doctor.initials}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-foreground">
              {doctor.name}
            </h2>
            <p className="text-xs text-muted-foreground">
              {doctor.speciality} · {doctor.experienceYears} yrs
            </p>
          </div>
        </div>
        {/* Date picker drives the availability request */}
        <div className="mt-3">
          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
            Appointment date
          </label>
          <input
            type="date"
            value={requestedDate}
            min={minDate}
            onChange={(e) => onSelectDate(e.target.value)}
            className="h-9 w-full rounded-lg border border-input bg-secondary/50 px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>

      <ScrollArea className="flex-1 px-4 py-4 scrollbar-thin">
        {loading ? (
          <SlotsSkeleton />
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-8 w-8 text-destructive/60 mb-2" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        ) : groupedSlots.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CalendarDays className="h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">
              No slots available for this date.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {groupedSlots.map(([date, daySlots]) => (
              <div key={date}>
                <div className="flex items-center gap-1.5 mb-2">
                  <CalendarDays className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-semibold text-foreground">
                    {formatDateLabel(date)}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {daySlots.map((slot) => {
                    const selected = slot.id === selectedSlotId;
                    return (
                      <button
                        key={slot.id}
                        onClick={() => onSelectSlot(slot.id)}
                        className={cn(
                          'flex items-center justify-center gap-1 rounded-lg border py-2 text-xs font-medium transition-all',
                          selected
                            ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                            : 'border-border bg-card text-foreground hover:border-primary/50 hover:bg-secondary'
                        )}
                      >
                        <Clock className="h-3 w-3" />
                        {slot.time}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      <div className="border-t border-border p-4">
        <Button
          className="w-full"
          disabled={!selectedSlotId || booking}
          onClick={onBook}
        >
          {booking ? 'Booking…' : 'Book Appointment'}
        </Button>
      </div>
    </div>
  );
}

function SlotsSkeleton() {
  return (
    <div className="space-y-4">
      {[0, 1].map((g) => (
        <div key={g}>
          <div className="h-3 w-24 rounded bg-muted mb-2 animate-pulse" />
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-8 rounded-lg bg-muted animate-pulse"
                style={{ animationDelay: `${i * 80}ms` }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
