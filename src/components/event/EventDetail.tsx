import { useState } from 'react';
import {
  ArrowLeft,
  Heart,
  Share2,
  MapPin,
  Calendar,
  CalendarPlus,
  Navigation,
  Ticket,
  ExternalLink,
  Check,
  Clock,
} from 'lucide-react';
import type { SpotEvent } from '../../types';
import { PosterImage } from '../common/PosterImage';
import { PrimaryButton } from '../common/PrimaryButton';
import { categoryLabel } from '../../data/categories';
import {
  formatEventDate,
  formatTime,
  directionsUrl,
  mapsSearchUrl,
  shareEvent,
  relativeDayLabel,
  isHappeningNow,
} from '../../lib/format';
import { buildIcsDataUrl, icsFileName } from '../../lib/calendar';

interface EventDetailProps {
  event: SpotEvent;
  saved: boolean;
  onToggleSave: () => void;
  onBack: () => void;
  distanceLabel?: string;
}

type DetailTab = 'about' | 'venue';

export function EventDetail({
  event,
  saved,
  onToggleSave,
  onBack,
  distanceLabel,
}: EventDetailProps) {
  const [tab, setTab] = useState<DetailTab>('about');
  const [shareState, setShareState] = useState<'idle' | 'copied'>('idle');

  async function handleShare() {
    const result = await shareEvent(event);
    if (result === 'copied') {
      setShareState('copied');
      setTimeout(() => setShareState('idle'), 1800);
    }
  }

  return (
    <div className="flex h-full flex-col bg-bg">
      {/* Poster hero */}
      <div className="relative h-[46%] shrink-0">
        <PosterImage
          src={event.posterUrl}
          alt={event.title}
          category={event.category}
          className="h-full w-full"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />

        {/* top controls */}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4 pt-5">
          <button
            onClick={onBack}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/85 text-[#111827] shadow-soft backdrop-blur transition active:scale-90"
            aria-label="Back"
          >
            <ArrowLeft size={20} strokeWidth={1.9} />
          </button>
          <div className="flex gap-2">
            <button
              onClick={handleShare}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/85 text-[#111827] shadow-soft backdrop-blur transition active:scale-90"
              aria-label="Share"
            >
              {shareState === 'copied' ? (
                <Check size={19} strokeWidth={2} className="text-brand" />
              ) : (
                <Share2 size={18} strokeWidth={1.9} />
              )}
            </button>
            <button
              onClick={onToggleSave}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/85 text-[#111827] shadow-soft backdrop-blur transition active:scale-90"
              aria-label={saved ? 'Unsave' : 'Save'}
            >
              <Heart
                size={19}
                strokeWidth={1.9}
                className={saved ? 'text-brand' : 'text-[#111827]'}
                fill={saved ? '#2F7D5A' : 'none'}
              />
            </button>
          </div>
        </div>

        {/* title overlay */}
        <div className="absolute inset-x-0 bottom-0 p-5">
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded-full bg-brand px-2.5 py-1 text-[11px] font-medium text-white">
              {categoryLabel(event.category)}
            </span>
            <span className="rounded-full bg-white/85 px-2.5 py-1 text-[11px] text-ink backdrop-blur">
              {relativeDayLabel(event.startsAt)}
            </span>
            {isHappeningNow(event) && (
              <span className="flex items-center gap-1 rounded-full bg-red-500 px-2.5 py-1 text-[11px] font-medium text-white">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                Happening now
              </span>
            )}
          </div>
          <h1 className="font-serif text-[38px] leading-[1.05] text-white drop-shadow-sm">
            {event.title}
          </h1>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-5 pb-40 pt-4">
          {/* meta rows */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <MetaRow
                  icon={<Calendar size={18} strokeWidth={1.75} />}
                  title={formatEventDate(event.startsAt)}
                  subtitle={
                    event.endsAt ? `Ends around ${formatTime(event.endsAt)}` : undefined
                  }
                />
              </div>
              <a
                href={buildIcsDataUrl(event)}
                download={icsFileName(event)}
                className="mt-0.5 flex shrink-0 items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-[12px] text-ink transition active:scale-95"
              >
                <CalendarPlus size={14} strokeWidth={1.9} />
                Add to calendar
              </a>
            </div>
            <MetaRow
              icon={<MapPin size={18} strokeWidth={1.75} />}
              title={event.venue}
              subtitle={`${event.address}${
                distanceLabel ? ` · ${distanceLabel}` : ''
              }`}
            />
            <MetaRow
              icon={<Ticket size={18} strokeWidth={1.75} />}
              title={event.priceLabel}
              subtitle={event.isFree ? 'No ticket needed' : 'Entry / ticket price'}
            />
          </div>

          {/* tabs */}
          <div className="mt-6 flex gap-6 border-b border-hairline">
            <TabButton active={tab === 'about'} onClick={() => setTab('about')}>
              About
            </TabButton>
            <TabButton active={tab === 'venue'} onClick={() => setTab('venue')}>
              Venue
            </TabButton>
          </div>

          {tab === 'about' ? (
            <div className="pt-4">
              <p className="text-[15px] leading-relaxed text-ink/80">
                {event.description}
              </p>

              {event.highlights && event.highlights.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-serif text-xl text-ink">Event Highlights</h3>
                  <ul className="mt-3 space-y-2">
                    {event.highlights.map((h) => (
                      <li key={h} className="flex items-center gap-2.5 text-[14px] text-ink/80">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brandsoft text-brand">
                          <Check size={13} strokeWidth={2.4} />
                        </span>
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {event.lineup && event.lineup.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-serif text-xl text-ink">Lineup</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {event.lineup.map((name) => (
                      <span
                        key={name}
                        className="rounded-full bg-surface px-3.5 py-1.5 text-[13px] text-ink"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {event.organizer && (
                <p className="mt-6 text-[13px] text-muted">
                  Organized by{' '}
                  <span className="text-ink">{event.organizer}</span>
                </p>
              )}
            </div>
          ) : (
            <div className="pt-4">
              <div className="flex items-start gap-2.5">
                <MapPin size={18} strokeWidth={1.75} className="mt-0.5 text-brand" />
                <div>
                  <p className="font-serif text-lg text-ink">{event.venue}</p>
                  <p className="text-[13.5px] text-muted">{event.address}</p>
                  <p className="text-[13.5px] text-muted">{event.city}</p>
                </div>
              </div>

              {/* mini static map preview */}
              <a
                href={mapsSearchUrl(event)}
                target="_blank"
                rel="noreferrer"
                className="mt-4 block overflow-hidden rounded-2xl border border-hairline"
              >
                <div className="relative h-40 w-full">
                  <img
                    src={`https://staticmap.openstreetmap.de/staticmap.php?center=${event.lat},${event.lng}&zoom=15&size=600x320&markers=${event.lat},${event.lng},lightgreen`}
                    alt="Map preview"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.currentTarget.parentElement as HTMLElement).style.background =
                        '#e8f5ef';
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-[12px] text-ink shadow-soft backdrop-blur">
                      <ExternalLink size={13} /> Open in Maps
                    </span>
                  </div>
                </div>
              </a>

              <div className="mt-4 flex items-center gap-2 text-[13px] text-muted">
                <Clock size={15} strokeWidth={1.75} />
                Doors at {formatTime(event.startsAt)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sticky action bar */}
      <div className="absolute inset-x-0 bottom-0 border-t border-hairline bg-card/90 p-4 pb-5 backdrop-blur">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSave}
            className={`flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full border transition active:scale-95 ${
              saved
                ? 'border-brand bg-brandsoft text-brand'
                : 'border-hairline bg-card text-ink'
            }`}
            aria-label={saved ? 'Saved' : 'Save event'}
          >
            <Heart size={22} strokeWidth={1.9} fill={saved ? '#2F7D5A' : 'none'} />
          </button>

          <a href={directionsUrl(event)} target="_blank" rel="noreferrer" className="flex-1">
            <PrimaryButton
              variant="soft"
              full
              icon={<Navigation size={18} strokeWidth={1.9} />}
            >
              Navigate
            </PrimaryButton>
          </a>

          {event.ticketUrl ? (
            <a href={event.ticketUrl} target="_blank" rel="noreferrer" className="flex-1">
              <PrimaryButton
                variant="primary"
                full
                icon={<Ticket size={18} strokeWidth={1.9} />}
              >
                Get Tickets
              </PrimaryButton>
            </a>
          ) : (
            <div className="flex-1">
              <PrimaryButton variant="primary" full disabled>
                {event.isFree ? 'Free Entry' : 'At the door'}
              </PrimaryButton>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetaRow({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface text-ink">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[14.5px] text-ink">{title}</p>
        {subtitle && <p className="text-[12.5px] text-muted">{subtitle}</p>}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative pb-2.5 text-[15px] transition-colors ${
        active ? 'text-ink' : 'text-muted'
      }`}
    >
      {children}
      {active && (
        <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand" />
      )}
    </button>
  );
}
