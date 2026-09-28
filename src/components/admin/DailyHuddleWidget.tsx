import React, { useEffect, useState } from 'react';
import { Hotel, Booking, Room, HousekeepingTask } from '../../types';
import { getBookings } from '../../services/bookingService';
import { getRooms, updateRoomStatus } from '../../services/roomsService';
import {
  getHousekeepingTasks,
  updateHousekeepingTask,
  getHousekeepingSupplies,
  HousekeepingSupplyItem,
} from '../../services/housekeepingService';
import { formatINR } from '../../lib/utils';
import {
  Crown,
  Wrench,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Clock,
  ClipboardCheck,
  RefreshCw,
} from 'lucide-react';

interface DailyHuddleWidgetProps {
  hotel: Hotel | null;
  onNavigateTab?: (tab: any) => void;
  onRefreshParent?: () => void;
}

export const DailyHuddleWidget: React.FC<DailyHuddleWidgetProps> = ({
  hotel,
  onNavigateTab,
  onRefreshParent,
}) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [tasks, setTasks] = useState<HousekeepingTask[]>([]);
  const [supplies, setSupplies] = useState<HousekeepingSupplyItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    loadHuddleData();
  }, [hotel?.id]);

  const loadHuddleData = async () => {
    const hotelId = hotel?.id || 'default-hotel-id';
    setIsLoading(true);
    const [bks, rms, tks, sups] = await Promise.all([
      getBookings(hotelId),
      getRooms(hotelId),
      getHousekeepingTasks(hotelId),
      getHousekeepingSupplies(hotelId),
    ]);
    setBookings(bks);
    setRooms(rms);
    setTasks(tks);
    setSupplies(sups);
    setIsLoading(false);
  };

  // 1. VIP & Today's Priority Arrivals
  // Includes today's arrivals or upcoming VIP bookings (high value >= 3500, Suite bookings, or special requests)
  const todaysArrivals = bookings.filter(
    (b) =>
      b.check_in_date === todayStr &&
      (b.status === 'Confirmed' || b.status === 'Pending' || b.status === 'Checked-In')
  );

  const vipArrivals = (
    todaysArrivals.length > 0
      ? todaysArrivals
      : bookings.filter((b) => b.status === 'Confirmed' || b.status === 'Pending').slice(0, 3)
  ).map((b) => {
    const guestName = b.guest
      ? `${b.guest.first_name} ${b.guest.last_name || ''}`.trim()
      : b.guest_name || 'VIP Guest';
    const isHighValue = Number(b.total_amount || 0) >= 4000;
    const hasSpecialReq = Boolean(b.special_requests && b.special_requests.trim().length > 0);
    const isRepeat = (b.guest?.total_stays || 0) > 1;

    let vipReason = 'Priority Arrival';
    if (isRepeat) vipRepeatLabel: vipReason = 'Repeat VIP Guest';
    else if (isHighValue) vipReason = 'High-Tariff / Suite';
    else if (hasSpecialReq) vipReason = 'Special Request';

    return {
      booking: b,
      guestName,
      vipReason,
      specialNotes: b.special_requests || 'Welcome drink & express check-in',
    };
  });

  // 2. Pending Maintenance Requests (rooms in Maintenance / Out of Order)
  const maintenanceRooms = rooms.filter(
    (r) => r.status === 'Maintenance' || r.status === 'Out of Order'
  );

  // 3. Critical Housekeeping Tasks (High/Urgent pending tasks + dirty rooms + low stock supplies)
  const criticalTasks = tasks.filter(
    (t) =>
      t.status !== 'Completed' &&
      (t.priority === 'Urgent' || t.priority === 'High' || t.priority === 'Medium')
  );
  const dirtyRooms = rooms.filter((r) => r.status === 'Cleaning');
  const lowStockSupplies = supplies.filter((s) => s.current_stock <= s.reorder_threshold);

  const handleResolveMaintenance = async (room: Room) => {
    const hotelId = hotel?.id || 'default-hotel-id';
    await updateRoomStatus(room.id, 'Available', hotelId);
    await loadHuddleData();
    onRefreshParent?.();
  };

  const handleQuickCleanRoom = async (room: Room) => {
    const hotelId = hotel?.id || 'default-hotel-id';
    await updateRoomStatus(room.id, 'Available', hotelId);
    await loadHuddleData();
    onRefreshParent?.();
  };

  const handleCompleteTask = async (task: HousekeepingTask) => {
    const hotelId = hotel?.id || 'default-hotel-id';
    await updateHousekeepingTask(task.id, hotelId, 'Completed', task.room_id);
    await loadHuddleData();
    onRefreshParent?.();
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
      {/* Top Bar */}
      <div className="bg-stone-900 text-white px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
            <ClipboardCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-serif font-bold text-base text-white">
                Front Desk Daily Huddle
              </h4>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-400/30">
                Shift Briefing
              </span>
            </div>
            <p className="text-[11px] text-stone-400">
              Live overview of today&apos;s VIP arrivals, pending maintenance requests &amp; critical housekeeping tasks
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadHuddleData}
            className="px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Refresh Daily Huddle"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-amber-400' : 'text-amber-400'}`} />
            <span>Refresh Huddle</span>
          </button>
        </div>
      </div>

      {/* 3-Column Huddle Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-stone-200">
        {/* COLUMN 1: TODAY'S VIP ARRIVALS */}
        <div className="p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-700" />
                <h5 className="font-serif font-bold text-sm text-stone-900">
                  Today&apos;s VIP &amp; Priority Arrivals
                </h5>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
                {vipArrivals.length} Scheduled
              </span>
            </div>

            {vipArrivals.length === 0 ? (
              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 text-center text-xs text-stone-500">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                No pending VIP arrivals scheduled for today.
              </div>
            ) : (
              <div className="space-y-2.5">
                {vipArrivals.slice(0, 3).map(({ booking, guestName, vipReason, specialNotes }) => (
                  <div
                    key={booking.id}
                    className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/80 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-xs text-stone-900 truncate">
                        {guestName}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-200/80 text-amber-950 shrink-0">
                        {vipReason}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-stone-600">
                      <span className="font-mono font-semibold text-stone-700">
                        {booking.booking_reference}
                      </span>
                      <span>
                        {booking.adults} Adults &bull; {formatINR(booking.total_amount)}
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-900 bg-white/80 px-2 py-1 rounded border border-amber-200/60 truncate">
                      Note: {specialNotes}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {onNavigateTab && (
            <button
              type="button"
              onClick={() => onNavigateTab('frontdesk')}
              className="w-full py-2 px-3 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Open Check-In Desk</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* COLUMN 2: PENDING MAINTENANCE REQUESTS */}
        <div className="p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-rose-700" />
                <h5 className="font-serif font-bold text-sm text-stone-900">
                  Pending Maintenance Requests
                </h5>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  maintenanceRooms.length > 0
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {maintenanceRooms.length} Active
              </span>
            </div>

            {maintenanceRooms.length === 0 ? (
              <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 text-center text-xs text-emerald-900">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                All 30 rooms are operational with zero pending maintenance blocks.
              </div>
            ) : (
              <div className="space-y-2.5">
                {maintenanceRooms.slice(0, 3).map((room) => (
                  <div
                    key={room.id}
                    className="p-3 rounded-xl bg-rose-50/50 border border-rose-200 flex items-center justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-stone-900">
                          Room {room.room_number}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-bold uppercase">
                          {room.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-600 mt-0.5">
                        Floor {room.floor} &bull; {room.notes || 'Engineering inspection required'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleResolveMaintenance(room)}
                      className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-semibold rounded-lg shrink-0 cursor-pointer transition-colors"
                    >
                      Resolve
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {onNavigateTab && (
            <button
              type="button"
              onClick={() => onNavigateTab('rooms')}
              className="w-full py-2 px-3 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Manage 30-Room Inventory</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* COLUMN 3: CRITICAL HOUSEKEEPING TASKS & ALERTS */}
        <div className="p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-700" />
                <h5 className="font-serif font-bold text-sm text-stone-900">
                  Critical Housekeeping Tasks
                </h5>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
                {criticalTasks.length + dirtyRooms.length} Turnarounds
              </span>
            </div>

            {/* Low Stock Supply Banner inside Huddle */}
            {lowStockSupplies.length > 0 && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-rose-800 font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>{lowStockSupplies.length} Supplies Below Reorder Threshold</span>
                </div>
                {onNavigateTab && (
                  <button
                    type="button"
                    onClick={() => onNavigateTab('housekeeping')}
                    className="text-[11px] font-bold text-rose-900 underline cursor-pointer"
                  >
                    Restock
                  </button>
                )}
              </div>
            )}

            {criticalTasks.length === 0 && dirtyRooms.length === 0 ? (
              <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 text-center text-xs text-emerald-900">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                All rooms are clean and ready for check-in!
              </div>
            ) : (
              <div className="space-y-2">
                {criticalTasks.slice(0, 2).map((task) => (
                  <div
                    key={task.id}
                    className="p-2.5 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-stone-900">
                          {task.room ? `Room ${task.room.room_number}` : task.task_type}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-900">
                          {task.priority}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500">
                        {task.task_type} {task.notes ? `• ${task.notes}` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCompleteTask(task)}
                      className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-semibold rounded-lg shrink-0 cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                ))}

                {dirtyRooms.slice(0, 2).map((room) => (
                  <div
                    key={room.id}
                    className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-200 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                      <div>
                        <div className="font-mono font-bold text-xs text-stone-900">
                          Room {room.room_number} (Dirty / Turnaround)
                        </div>
                        <div className="text-[11px] text-stone-500">
                          Floor {room.floor} &bull; {room.category?.name || 'Standard Room'}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleQuickCleanRoom(room)}
                      className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-semibold rounded-lg shrink-0 cursor-pointer"
                    >
                      Mark Clean
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {onNavigateTab && (
            <button
              type="button"
              onClick={() => onNavigateTab('housekeeping')}
              className="w-full py-2 px-3 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Open Housekeeping Board</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
