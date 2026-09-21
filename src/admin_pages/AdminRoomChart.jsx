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

// 'completed' (checked out) is included alongside hold/confirmed/active
// (2026-09-19) - without it, any window that has fully passed shows almost
// nothing, since nothing sits in "hold" a month after its dates.
const BAR_STYLES = {
  hold: 'bg-amber-400 text-amber-950',
  confirmed: 'bg-blue-500 text-white',
  active: 'bg-green-600 text-white',
  completed: 'bg-slate-400 text-white',
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

  // Real height of the sticky date-header row, so each room-type section
  // header (also sticky) knows exactly where to sit below it. Measured, not
  // guessed: this app's root font-size is itself responsive (see
  // design-system.css's html{font-size} breakpoints), and the date labels
  // wrap to 2 or 3 lines depending on how narrow the real day columns render
  // - so the row's true height isn't a fixed constant at all, and a
  // hardcoded offset drifts out of alignment the moment either changes
  // (2026-09-19: "look at how the date row looks when we scroll... fix it" -
  // it was overlapping). useLayoutEffect + ResizeObserver reads the actual
  // rendered height instead, and stays correct through any resize.
  //
  // Attached through a callback ref, not an effect (2026-09-21: the rows
  // "started overlapping after changing dates"). Every reload swaps the grid
  // for a spinner, so an effect-held observer ended up watching the old,
  // detached header cell - which measures 0 - and never saw the new one; the
  // room-type rows then stuck at top: 0, right over the dates. The ref
  // re-attaches to each new cell (React 19 runs the returned cleanup when it
  // goes), and a 0 reading - a cell on its way out - is ignored.
  const [dateRowHeight, setDateRowHeight] = useState(44);
  const cornerCellRef = useCallback((el) => {
    if (!el) return undefined;
    const measure = () => {
      const height = el.getBoundingClientRect().height;
      if (height > 0) setDateRowHeight(height);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

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

  // The room column is never narrower than its widest status tag - 10rem is
  // only 80px at a phone's root font-size, and "Complementary" overflowed
  // onto the day cells (2026-09-19). min-content is the MINIMUM on purpose:
  // as the maximum it only grows into spare room, and on a phone the day
  // columns leave none, so the column stayed at 80px.
  const gridTemplateColumns = `minmax(min-content, 10rem) repeat(${DAYS_VISIBLE}, minmax(4.5rem, 1fr))`;

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
        {/* "Completed" (2026-09-19), not a separate "Past Stay" term - it's
            the same reservation status shown everywhere else in the app. */}
        <span className='flex items-center gap-2'>
          <span className='w-4 h-4 rounded bg-slate-400 inline-block' />{' '}
          Completed
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
            <div ref={cornerCellRef} className='sticky top-0 left-0 z-30 bg-white border-b border-r border-[color:var(--text-color)]/10 px-3 py-2' />
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
                // Sticky under the date row (2026-09-19) - unsticky, it scrolls
                // out of view like any other row, so a long room list reads as
                // an unlabeled sequence of numbers once you've scrolled past
                // which type section they belong to. `top` is the date row's
                // MEASURED height (see dateRowHeight above), not a guess.
                <div
                  key={row.key}
                  className='col-span-full sticky z-20 bg-[color-mix(in_srgb,var(--text-color)_5%,white)] px-3 py-3 text-2xl font-bold text-[color:var(--black)] border-b border-[color:var(--text-color)]/10'
                  style={{ top: dateRowHeight }}
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
      {/* min-w-0 on both levels (2026-09-19): a grid/flex item's default
          min-width is its CONTENT's size, not its track's, so a room number
          plus a wide tag like "Out of Order" simply overflowed past this
          fixed 10rem column and sat on top of the day cells to its right
          instead of wrapping, even with flex-wrap already set below. */}
      <div
        className={`sticky left-0 z-10 min-w-0 border-b border-r border-[color:var(--text-color)]/10 px-3 py-3 text-xl font-medium flex items-start ${
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
        <span className='flex items-center gap-2 flex-wrap min-w-0'>
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
                className={`admin-bar-in m-1 px-3 py-1 rounded-md text-lg font-semibold truncate text-left cursor-pointer transition-opacity hover:opacity-80 ${BAR_STYLES[bar.status] || 'bg-gray-400 text-white'}`}
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
