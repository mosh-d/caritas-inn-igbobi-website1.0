import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IoAppsOutline,
  IoChevronBack,
  IoChevronForward,
} from 'react-icons/io5';
import PageHeading from '../components/shared/PageHeading';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import { btn } from '../components/shared/ui';
import { fetchRoomChart } from '../utils/reservations-pms-api';
import { useWebSocketContext } from '../context/WebSocketContext';
import RoomStatusTag from '../components/shared/RoomStatusTag';

const DAYS_VISIBLE = 14;
const DAY_MS = 86400000;

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const addDays = (d, n) => new Date(d.getTime() + n * DAY_MS);
// Deliberately NOT toISOString() — every `d` here is a local-midnight Date
// (built via startOfDay/addDays), and toISOString() always converts to UTC
// first. For Lagos (WAT, UTC+1) that silently shifts every date one day
// EARLIER — not just near midnight, but always — since local midnight is
// still "yesterday, 11pm" in UTC. That shifted string is what actually gets
// sent to /api/rooms/chart as start_date/end_date, so the fetched data was
// permanently misaligned by a day against the (correctly, locally
// formatted) date headers above it. Building the string from local getters
// keeps it matching what's actually on screen.
const isoDate = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
const dayIndexOf = (date, windowStart) =>
  Math.round((startOfDay(new Date(date)) - windowStart) / DAY_MS);

const BAR_STYLES = {
  hold: 'bg-amber-400 text-amber-950',
  confirmed: 'bg-blue-500 text-white',
  active: 'bg-green-600 text-white',
};

const dateLabel = (d) =>
  d.toLocaleDateString('en-US', {
    timeZone: 'Africa/Lagos',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

// Greedy interval-graph-coloring: bars that don't overlap in actual dates
// (not just visible columns — clipping at the window edge would otherwise
// make two bars look separable when they aren't) share a lane; anything
// that overlaps an existing lane's last bar gets its own new lane. This is
// the "Unassigned" bucket's whole reason to exist — several holds/bookings
// for the same room type can genuinely overlap since none of them have a
// specific physical room yet, so they can't be squashed into one row.
function packIntoLanes(bars) {
  const sorted = [...bars].sort(
    (a, b) => new Date(a.check_in) - new Date(b.check_in),
  );
  const lanes = [];
  for (const bar of sorted) {
    const start = new Date(bar.check_in);
    const lane = lanes.find((l) => l.end <= start);
    if (lane) {
      lane.bars.push(bar);
      lane.end = new Date(bar.check_out);
    } else {
      lanes.push({ end: new Date(bar.check_out), bars: [bar] });
    }
  }
  return lanes.map((l) => l.bars);
}

export default function AdminRoomChartPage() {
  const navigate = useNavigate();
  const [windowStart, setWindowStart] = useState(() => startOfDay(new Date()));
  const [chart, setChart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const windowEnd = useMemo(
    () => addDays(windowStart, DAYS_VISIBLE),
    [windowStart],
  );
  const days = useMemo(
    () =>
      Array.from({ length: DAYS_VISIBLE }, (_, i) => addDays(windowStart, i)),
    [windowStart],
  );

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchRoomChart(
        isoDate(windowStart),
        isoDate(windowEnd),
      );
      setChart(data);
      setError(null);
    } catch (err) {
      setError(
        (err.response?.data?.message || 'Failed to load room chart.') +
          ' Please refresh the page.',
      );
    } finally {
      setLoading(false);
    }
  }, [windowStart, windowEnd]);

  useEffect(() => {
    load();
  }, [load]);

  // Re-fetch whenever the socket (re)connects (e.g. after a backend
  // restart), same pattern as AdminOverview.jsx/AdminRooms.jsx.
  const { isConnected } = useWebSocketContext();
  useEffect(() => {
    if (!isConnected) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected]);

  // Flatten room types into a single row list: a header row per type, one
  // row per numbered room, and an "Unassigned" row per type if it has any
  // bookings without a specific room picked yet. Each room/unassigned entry
  // carries its bars pre-packed into non-overlapping lanes.
  const rows = useMemo(() => {
    if (!chart) return [];
    const out = [];
    for (const rt of chart.room_types) {
      out.push({
        kind: 'header',
        key: `h-${rt.room_type_id}`,
        label: rt.room_type_name,
        count: rt.rooms.length,
      });
      for (const room of rt.rooms) {
        out.push({
          kind: 'room',
          key: `r-${rt.room_type_id}-${room.room_inventory_id}`,
          label: room.room_number,
          roomStatus: room.room_status,
          lanes: packIntoLanes(room.bars),
        });
      }
      if (rt.unassigned.length > 0) {
        out.push({
          kind: 'unassigned',
          key: `u-${rt.room_type_id}`,
          label: 'Unassigned',
          lanes: packIntoLanes(rt.unassigned),
        });
      }
    }
    return out;
  }, [chart]);

  const gridTemplateColumns = `10rem repeat(${DAYS_VISIBLE}, minmax(4.5rem, 1fr))`;

  // Hold → the guest hasn't paid yet, so the detail view (with its Confirm
  // button right there) is the useful destination. Confirmed → nothing
  // reservation-specific to jump to yet since check-in hasn't happened, so
  // just the list. Active → the guest is physically in-house, so their
  // In-House detail (room/folio/extend-stay) is the useful destination.
  const handleSelectBar = (bar) => {
    if (bar.status === 'hold') {
      navigate(`/admin/reservations?reservation_id=${bar.reservation_id}`);
    } else if (bar.status === 'active') {
      navigate(`/admin/in-house?reservation_id=${bar.reservation_id}`);
    } else {
      navigate('/admin/reservations');
    }
  };

  return (
    <div
      data-component='AdminRoomChart'
      className='px-[4rem] max-sm:px-[1rem] py-[4rem] flex flex-col items-start gap-[3rem]'
    >
      <div className='w-full flex justify-between items-center max-sm:flex-col max-sm:items-start max-sm:gap-4'>
        <PageHeading icon={IoAppsOutline}>Room Chart</PageHeading>

        <div className='flex flex-col items-start gap-3 flex-wrap'>
          <input
            type='date'
            value={isoDate(windowStart)}
            onChange={(e) =>
              e.target.value &&
              setWindowStart(startOfDay(new Date(`${e.target.value}T00:00:00`)))
            }
            className='border border-[color:var(--text-color)]/25 rounded-lg px-4 py-3 text-xl focus:outline-none focus:ring-2 focus:ring-[color:var(--emphasis)]'
            title='Jump to a date — it becomes the leftmost column'
          />
          <div className='flex items-center gap-3'>
            <button
              onClick={() => setWindowStart((d) => addDays(d, -DAYS_VISIBLE))}
              className={`${btn.secondary} flex items-center gap-1`}
            >
              <IoChevronBack size={18} /> Previous
            </button>
            <button
              onClick={() => setWindowStart(startOfDay(new Date()))}
              className={btn.secondary}
            >
              Today
            </button>
            <button
              onClick={() => setWindowStart((d) => addDays(d, DAYS_VISIBLE))}
              className={`${btn.secondary} flex items-center gap-1`}
            >
              Next <IoChevronForward size={18} />
            </button>
          </div>
        </div>
      </div>

      <p className='text-lg text-[color:var(--text-color)]/68 -mt-6'>
        Showing {isoDate(windowStart)} to{' '}
        {isoDate(addDays(windowStart, DAYS_VISIBLE - 1))}. Previous/Next jump a
        full {DAYS_VISIBLE}-day window back or forward; Today snaps back to the
        window starting today; the date picker jumps straight to any date, which
        becomes the leftmost column.
      </p>

      <div className='flex items-center gap-6 text-xl'>
        <span className='flex items-center gap-2'>
          <span className='w-4 h-4 rounded bg-amber-400 inline-block' /> Hold
        </span>
        <span className='flex items-center gap-2'>
          <span className='w-4 h-4 rounded bg-blue-500 inline-block' />{' '}
          Confirmed
        </span>
        <span className='flex items-center gap-2'>
          <span className='w-4 h-4 rounded bg-green-600 inline-block' />{' '}
          In-House
        </span>
      </div>

      {loading ?
        <div className='w-full flex justify-center py-16'>
          <LoadingSpinner size='lg' />
        </div>
      : error ?
        <p className='text-red-600 text-xl'>{error}</p>
      : rows.length === 0 ?
        <p className='text-xl text-[color:var(--text-color)]/68 py-16 w-full text-center'>
          No room types have numbered rooms yet — the chart fills in once room
          numbers are assigned on the Rooms page.
        </p>
      : <div className='w-full bg-white rounded-xl border border-[color:var(--text-color)]/10 overflow-auto max-h-[70vh]'>
          <div
            className='grid'
            style={{
              gridTemplateColumns,
              minWidth: `${10 + DAYS_VISIBLE * 4.5}rem`,
            }}
          >
            {/* Date header row — sticky so it stays visible while the body scrolls vertically */}
            <div className='sticky top-0 left-0 z-30 bg-white border-b border-r border-[color:var(--text-color)]/10 px-3 py-2' />
            {days.map((d, i) => (
              <div
                key={isoDate(d)}
                className={`sticky top-0 z-20 text-center text-lg font-semibold border-b px-1 py-2 ${
                  i < DAYS_VISIBLE - 1 ? 'border-r' : ''
                } border-[color:var(--text-color)]/15 ${
                  isoDate(d) === isoDate(new Date()) ?
                    'bg-[color-mix(in_srgb,var(--emphasis)_12%,white)] text-[color:var(--emphasis)]'
                  : 'bg-white text-[color:var(--text-color)]/76'
                }`}
              >
                {dateLabel(d)}
              </div>
            ))}

            {/* Body rows */}
            {rows.map((row) =>
              row.kind === 'header' ?
                <div
                  key={row.key}
                  className='col-span-full bg-[color:var(--text-color)]/5 px-3 py-3 text-2xl font-bold text-[color:var(--black)] border-b border-[color:var(--text-color)]/10'
                >
                  {row.label}{' '}
                  <span className='text-lg font-normal text-[color:var(--text-color)]/68'>
                    ({row.count} room{row.count === 1 ? '' : 's'})
                  </span>
                </div>
              : <RoomRow
                  key={row.key}
                  label={row.label}
                  roomStatus={row.roomStatus}
                  lanes={row.lanes}
                  windowStart={windowStart}
                  isUnassigned={row.kind === 'unassigned'}
                  onSelectBar={handleSelectBar}
                />,
            )}
          </div>
        </div>
      }
    </div>
  );
}

function RoomRow({
  label,
  roomStatus,
  lanes,
  windowStart,
  isUnassigned,
  onSelectBar,
}) {
  // A room/unassigned bucket with nothing booked still needs one empty lane
  // so its label row renders at all.
  const effectiveLanes = lanes.length > 0 ? lanes : [[]];

  // 1px vertical rule at every day boundary, drawn as a background so it
  // doesn't interfere with the bars' own explicit grid-column placement
  // (real per-day grid cells would fight the bars for auto-placement slots
  // since both would target the same columns — see item 54's writeup).
  // All 14 day columns share one `minmax(4.5rem, 1fr)` track definition, so
  // they're always equal width, which is what makes a percentage-based
  // repeating gradient line up with the real column boundaries.
  const gridlineBackground = `repeating-linear-gradient(to right, var(--rc-gridline, rgba(0,0,0,0.12)) 0, var(--rc-gridline, rgba(0,0,0,0.12)) 1px, transparent 1px, transparent calc(100% / ${DAYS_VISIBLE}))`;

  return (
    <>
      <div
        className={`sticky left-0 z-10 border-b border-r border-[color:var(--text-color)]/10 px-3 py-3 text-xl font-medium flex items-start ${
          isUnassigned ?
            'bg-gray-50 text-[color:var(--text-color)]/68 italic'
          : 'bg-white text-[color:var(--black)]'
        }`}
        style={
          effectiveLanes.length > 1 ?
            { gridRow: `span ${effectiveLanes.length}` }
          : undefined
        }
      >
        <span className='flex items-center gap-2 flex-wrap'>
          {label}
          <RoomStatusTag
            status={roomStatus === 'available' ? null : roomStatus}
          />
        </span>
      </div>
      {effectiveLanes.map((laneBars, laneIdx) => (
        <div
          key={laneIdx}
          className='relative grid grid-cols-subgrid border-b border-[color:var(--text-color)]/10'
          style={{
            gridColumn: `2 / -1`,
            minHeight: '3.5rem',
            backgroundImage: gridlineBackground,
          }}
        >
          {laneBars.map((bar, i) => {
            const startCol = Math.max(0, dayIndexOf(bar.check_in, windowStart));
            const endCol = Math.min(
              DAYS_VISIBLE,
              dayIndexOf(bar.check_out, windowStart),
            );
            if (endCol <= startCol) return null;
            return (
              <button
                key={`${bar.reservation_id}-${i}`}
                onClick={() => onSelectBar(bar)}
                title={`${bar.guest_name} · ${new Date(bar.check_in).toLocaleDateString(undefined, { timeZone: 'Africa/Lagos' })} → ${new Date(bar.check_out).toLocaleDateString(undefined, { timeZone: 'Africa/Lagos' })}${bar.rooms_needed ? ` · ${bar.rooms_needed} room(s) needed` : ''}`}
                className={`m-1 px-3 py-1 rounded-md text-lg font-semibold truncate text-left cursor-pointer transition-opacity hover:opacity-80 ${BAR_STYLES[bar.status] || 'bg-gray-400 text-white'}`}
                style={{ gridColumn: `${startCol + 1} / ${endCol + 1}` }}
              >
                {bar.guest_name}
              </button>
            );
          })}
        </div>
      ))}
    </>
  );
}
