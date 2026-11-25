'use client';

import { useMemo, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  CalendarCheck,
  Clock,
  History,
  Loader2,
  Phone,
  Search,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDateLabel } from '@/lib/format';
import type { Appointment, AppointmentStatus } from '@/lib/types';

interface AppointmentsSidebarProps {
  upcoming: Appointment[];
  recent: Appointment[];
  onCancel: (id: string) => void;
  cancellingId: string | null;
  onLookup: (phone: string) => void;
  history: Appointment[] | null;
  lookupLoading: boolean;
  lookupError: string | null;
  loading: boolean;
}

const STATUS_STYLE: Record<
  AppointmentStatus,
  { label: string; className: string }
> = {
  confirmed: {
    label: 'Confirmed',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  pending: {
    label: 'Pending',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  completed: {
    label: 'Completed',
    className: 'bg-sky-50 text-sky-700 border-sky-200',
  },
};

export function AppointmentsSidebar({
  upcoming,
  recent,
  onCancel,
  cancellingId,
  onLookup,
  history,
  lookupLoading,
  lookupError,
  loading,
}: AppointmentsSidebarProps) {
  const [phone, setPhone] = useState('');

  const sortedUpcoming = useMemo(
    () =>
      [...upcoming].sort((a, b) =>
        (a.date + a.time).localeCompare(b.date + b.time)
      ),
    [upcoming]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.trim()) onLookup(phone.trim());
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-5 pt-5 pb-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-gradient text-white">
          <CalendarCheck className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Appointments
          </h2>
          <p className="text-xs text-muted-foreground">
            Manage &amp; track bookings
          </p>
        </div>
      </div>

      <ScrollArea className="flex-1 px-4 pb-4 scrollbar-thin">
        {/* Upcoming */}
        <SectionTitle>Upcoming</SectionTitle>
        {loading ? (
          <div className="flex items-center gap-2 px-1 py-2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/60" />
            <span className="text-xs text-muted-foreground">
              Loading appointments…
            </span>
          </div>
        ) : sortedUpcoming.length === 0 ? (
          <EmptyState
            icon={<CalendarCheck className="h-7 w-7" />}
            text="No upcoming appointments."
          />
        ) : (
          <div className="space-y-2.5">
            {sortedUpcoming.map((appt) => (
              <AppointmentCard
                key={appt.id}
                appt={appt}
                onCancel={onCancel}
                cancelling={cancellingId === appt.id}
              />
            ))}
          </div>
        )}

        {/* Recent activity */}
        <div className="mt-6">
          <SectionTitle>
            <History className="h-3.5 w-3.5" />
            Recent Activity
          </SectionTitle>
          {recent.length === 0 ? (
            <p className="text-xs text-muted-foreground px-1">
              No recent activity yet.
            </p>
          ) : (
            <div className="space-y-2">
              {recent.map((appt) => {
                const style = STATUS_STYLE[appt.status];
                return (
                  <div
                    key={appt.id}
                    className="flex items-center gap-3 rounded-lg border border-border bg-card/60 px-3 py-2"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-navy">
                      {appt.doctorName
                        .replace('Dr. ', '')
                        .split(' ')
                        .map((p) => p[0])
                        .join('')
                        .slice(0, 2)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-foreground">
                        {appt.doctorName}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatDateLabel(appt.date)} · {appt.time}
                      </p>
                    </div>
                    <span
                      className={cn(
                        'rounded-full border px-2 py-0.5 text-[10px] font-medium',
                        style.className
                      )}
                    >
                      {style.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* History lookup */}
        <div className="mt-6">
          <SectionTitle>
            <Phone className="h-3.5 w-3.5" />
            Appointment History
          </SectionTitle>
          <form onSubmit={handleSubmit} className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter phone number"
                className="pl-9 h-9 text-sm"
              />
            </div>
            <Button
              type="submit"
              variant="secondary"
              className="w-full"
              disabled={lookupLoading || !phone.trim()}
            >
              {lookupLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Looking up…
                </>
              ) : (
                'Retrieve History'
              )}
            </Button>
          </form>

          {lookupError && (
            <p className="mt-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {lookupError}
            </p>
          )}

          {history && (
            <div className="mt-3 space-y-2">
              {history.length === 0 ? (
                <p className="text-xs text-muted-foreground px-1">
                  No appointments found for this number.
                </p>
              ) : (
                history.map((appt) => {
                  const style = STATUS_STYLE[appt.status];
                  return (
                    <div
                      key={appt.id}
                      className="rounded-lg border border-border bg-card px-3 py-2.5 animate-fade-in-up"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs font-semibold text-foreground">
                          {appt.doctorName}
                        </p>
                        <span
                          className={cn(
                            'rounded-full border px-2 py-0.5 text-[10px] font-medium shrink-0',
                            style.className
                          )}
                        >
                          {style.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {appt.speciality}
                      </p>
                      <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDateLabel(appt.date)} · {appt.time}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </h3>
  );
}

function EmptyState({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-muted-foreground/50 mb-2">
        {icon}
      </div>
      <p className="text-xs text-muted-foreground">{text}</p>
    </div>
  );
}

interface AppointmentCardProps {
  appt: Appointment;
  onCancel: (id: string) => void;
  cancelling: boolean;
}

function AppointmentCard({ appt, onCancel, cancelling }: AppointmentCardProps) {
  const style = STATUS_STYLE[appt.status];
  return (
    <div className="rounded-xl border border-border bg-card p-3.5 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy text-xs font-semibold text-white">
            {appt.doctorName
              .replace('Dr. ', '')
              .split(' ')
              .map((p) => p[0])
              .join('')
              .slice(0, 2)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {appt.doctorName}
            </p>
            <p className="text-xs text-muted-foreground">{appt.speciality}</p>
          </div>
        </div>
        <span
          className={cn(
            'rounded-full border px-2 py-0.5 text-[10px] font-medium shrink-0',
            style.className
          )}
        >
          {style.label}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <CalendarCheck className="h-3.5 w-3.5 text-primary" />
          {formatDateLabel(appt.date)}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5 text-primary" />
          {appt.time}
        </span>
      </div>

      {appt.status === 'confirmed' && (
        <div className="mt-3 flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2.5 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
            disabled={cancelling}
            onClick={() => onCancel(appt.id)}
          >
            {cancelling ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <>
                <X className="h-3.5 w-3.5" />
                Cancel
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
