import React, { useEffect, useState } from 'react';
import { Hotel, Room, HousekeepingTask } from '../../types';
import { getRooms, updateRoomStatus } from '../../services/roomsService';
import {
  getHousekeepingTasks,
  updateHousekeepingTask,
  createHousekeepingTask,
  getHousekeepingSupplies,
  updateHousekeepingSupply,
  createHousekeepingSupply,
  deleteHousekeepingSupply,
  HousekeepingSupplyItem,
} from '../../services/housekeepingService';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { Modal } from '../common/Modal';
import {
  Sparkles,
  CheckCircle,
  Clock,
  Wrench,
  AlertTriangle,
  Plus,
  Package,
  Minus,
  Trash2,
} from 'lucide-react';

interface HousekeepingViewProps {
  hotel: Hotel | null;
}

export const HousekeepingView: React.FC<HousekeepingViewProps> = ({ hotel }) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [tasks, setTasks] = useState<HousekeepingTask[]>([]);
  const [supplies, setSupplies] = useState<HousekeepingSupplyItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  // New task modal
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [taskType, setTaskType] = useState<
    'Daily Cleaning' | 'Deep Cleaning' | 'Linen Change' | 'Inspection'
  >('Daily Cleaning');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High' | 'Urgent'>('Medium');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New supply item modal
  const [showAddSupplyModal, setShowAddSupplyModal] = useState(false);
  const [supplyName, setSupplyName] = useState('');
  const [supplyCategory, setSupplyCategory] =
    useState<HousekeepingSupplyItem['category']>('Linen');
  const [supplyStock, setSupplyStock] = useState<number>(20);
  const [supplyThreshold, setSupplyThreshold] = useState<number>(25);
  const [supplyUnit, setSupplyUnit] = useState('pcs');

  useEffect(() => {
    if (hotel?.id) {
      loadData();
    }
  }, [hotel?.id]);

  const loadData = async () => {
    if (!hotel?.id) return;
    setIsLoading(true);
    const [roomsData, tasksData, suppliesData] = await Promise.all([
      getRooms(hotel.id),
      getHousekeepingTasks(hotel.id),
      getHousekeepingSupplies(hotel.id),
    ]);
    setRooms(roomsData);
    setTasks(tasksData);
    setSupplies(suppliesData);
    setIsLoading(false);
  };

  const handleMarkRoomClean = async (room: Room) => {
    if (!hotel?.id) return;
    const res = await updateRoomStatus(room.id, 'Available', hotel.id);
    if (res.success) {
      const pendingTask = tasks.find((t) => t.room_id === room.id && t.status !== 'Completed');
      if (pendingTask) {
        await updateHousekeepingTask(pendingTask.id, hotel.id, 'Completed');
      }
      loadData();
    }
  };

  const handleMarkRoomCleaning = async (room: Room) => {
    if (!hotel?.id) return;
    const res = await updateRoomStatus(room.id, 'Cleaning', hotel.id);
    if (res.success) {
      loadData();
    }
  };

  const handleMarkRoomMaintenance = async (room: Room) => {
    if (!hotel?.id) return;
    const res = await updateRoomStatus(room.id, 'Maintenance', hotel.id);
    if (res.success) {
      loadData();
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hotel?.id || !selectedRoomId) return;
    setIsSubmitting(true);

    const res = await createHousekeepingTask({
      hotel_id: hotel.id,
      room_id: selectedRoomId,
      task_type: taskType,
      priority,
      status: 'Pending',
      notes: notes.trim() || undefined,
    });

    setIsSubmitting(false);
    if (res.success) {
      setShowNewTaskModal(false);
      setNotes('');
      loadData();
    }
  };

  const handleAdjustSupplyStock = async (item: HousekeepingSupplyItem, delta: number) => {
    const nextStock = Math.max(0, item.current_stock + delta);
    await updateHousekeepingSupply(item.id, { current_stock: nextStock });
    setSupplies((prev) =>
      prev.map((s) => (s.id === item.id ? { ...s, current_stock: nextStock } : s))
    );
  };

  const handleUpdateThreshold = async (item: HousekeepingSupplyItem, nextThreshold: number) => {
    const cleanVal = Math.max(0, nextThreshold);
    await updateHousekeepingSupply(item.id, { reorder_threshold: cleanVal });
    setSupplies((prev) =>
      prev.map((s) => (s.id === item.id ? { ...s, reorder_threshold: cleanVal } : s))
    );
  };

  const handleCreateSupplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplyName.trim()) return;
    const res = await createHousekeepingSupply({
      hotel_id: hotel?.id || 'default-hotel-id',
      name: supplyName.trim(),
      category: supplyCategory,
      current_stock: supplyStock,
      reorder_threshold: supplyThreshold,
      unit: supplyUnit.trim() || 'pcs',
    });
    if (res.success) {
      setSupplies((prev) => [res.data, ...prev]);
      setShowAddSupplyModal(false);
      setSupplyName('');
      setSupplyStock(20);
      setSupplyThreshold(25);
      setSupplyUnit('pcs');
    }
  };

  const handleDeleteSupply = async (id: string) => {
    await deleteHousekeepingSupply(id);
    setSupplies((prev) => prev.filter((s) => s.id !== id));
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading housekeeping board & supply inventory..." />;
  }

  const dirtyRooms = rooms.filter((r) => r.status === 'Cleaning');
  const maintenanceRooms = rooms.filter(
    (r) => r.status === 'Maintenance' || r.status === 'Out of Order'
  );
  const cleanRooms = rooms.filter((r) => r.status === 'Available');
  const occupiedRooms = rooms.filter((r) => r.status === 'Occupied');

  const lowStockItems = supplies.filter((s) => s.current_stock <= s.reorder_threshold);
  const displayedSupplies = showLowStockOnly ? lowStockItems : supplies;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="font-serif font-bold text-2xl text-stone-900">
              Housekeeping &amp; Room Cleanliness Board
            </h3>
            {lowStockItems.length > 0 && (
              <button
                type="button"
                onClick={() => setShowLowStockOnly((prev) => !prev)}
                className="px-3 py-1 rounded-full bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                title="Click to filter Low Stock items"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span>Low Stock ({lowStockItems.length})</span>
              </button>
            )}
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            Real-time room cleanliness across all 30 rooms and housekeeping linen/supply stock alerts
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAddSupplyModal(true)}
            className="px-3.5 py-2 bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Package className="w-4 h-4" />
            <span>Add Supply Item</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedRoomId(rooms[0]?.id || '');
              setShowNewTaskModal(true);
            }}
            className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Housekeeping Task</span>
          </button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-xs uppercase font-bold text-amber-900">
            <span>Needs Cleaning</span>
            <Clock className="w-4 h-4 text-amber-700" />
          </div>
          <div className="text-2xl font-serif font-bold text-amber-950">
            {dirtyRooms.length}
          </div>
          <p className="text-[11px] text-amber-800">Dirty / checkout rooms</p>
        </div>

        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-xs uppercase font-bold text-emerald-900">
            <span>Clean &amp; Ready</span>
            <CheckCircle className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-2xl font-serif font-bold text-emerald-950">
            {cleanRooms.length}
          </div>
          <p className="text-[11px] text-emerald-800">Available for check-in</p>
        </div>

        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-xs uppercase font-bold text-blue-900">
            <span>Occupied</span>
            <Sparkles className="w-4 h-4 text-blue-700" />
          </div>
          <div className="text-2xl font-serif font-bold text-blue-950">
            {occupiedRooms.length}
          </div>
          <p className="text-[11px] text-blue-800">Guests residing</p>
        </div>

        <div className="p-4 bg-stone-100 border border-stone-300 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-xs uppercase font-bold text-stone-700">
            <span>Maintenance</span>
            <Wrench className="w-4 h-4 text-stone-600" />
          </div>
          <div className="text-2xl font-serif font-bold text-stone-900">
            {maintenanceRooms.length}
          </div>
          <p className="text-[11px] text-stone-500">Repairs / offline</p>
        </div>

        <div
          className={`p-4 rounded-xl space-y-1 border ${
            lowStockItems.length > 0
              ? 'bg-rose-50 border-rose-200'
              : 'bg-stone-50 border-stone-200'
          }`}
        >
          <div className="flex items-center justify-between text-xs uppercase font-bold text-rose-900">
            <span>Low Stock Alerts</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-serif font-bold text-rose-950">
            {lowStockItems.length}
          </div>
          <p className="text-[11px] text-rose-800">Below reorder threshold</p>
        </div>
      </div>

      {/* Housekeeping Supplies & Linen Inventory with Low Stock Alert Badges */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Package className="w-5 h-5 text-amber-800" />
            <div>
              <h4 className="font-serif font-bold text-stone-900 text-base flex items-center gap-2">
                <span>Housekeeping Supplies &amp; Linen Inventory</span>
                {lowStockItems.length > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-rose-600" />
                    {lowStockItems.length} Low Stock
                  </span>
                )}
              </h4>
              <p className="text-[11px] text-stone-500">
                Items automatically display a <strong className="text-rose-700">LOW STOCK</strong> badge when inventory falls at or below their reorder threshold
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowLowStockOnly((prev) => !prev)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                showLowStockOnly
                  ? 'bg-rose-700 text-white border-rose-700'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border-stone-200'
              }`}
            >
              {showLowStockOnly
                ? `Showing Low Stock (${lowStockItems.length})`
                : `Filter Low Stock (${lowStockItems.length})`}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 text-stone-600 uppercase font-semibold border-b border-stone-200">
              <tr>
                <th className="px-6 py-3">Supply / Linen Item</th>
                <th className="px-6 py-3">Category</th>
                <th className="px-6 py-3">Inventory Count</th>
                <th className="px-6 py-3">Reorder Threshold</th>
                <th className="px-6 py-3">Stock Alert Status</th>
                <th className="px-6 py-3 text-right">Quick Restock / Adjust</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {displayedSupplies.map((item) => {
                const isOutOfStock = item.current_stock <= 0;
                const isLowStock = item.current_stock <= item.reorder_threshold;

                return (
                  <tr
                    key={item.id}
                    className={isLowStock ? 'bg-rose-50/40 hover:bg-rose-50/70' : 'hover:bg-stone-50/50'}
                  >
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-stone-900 text-sm">{item.name}</span>
                        {isLowStock && (
                          <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                            Low Stock
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-3.5 text-stone-600 font-medium">{item.category}</td>

                    <td className="px-6 py-3.5">
                      <span
                        className={`font-mono font-bold text-sm ${
                          isLowStock ? 'text-rose-700' : 'text-stone-900'
                        }`}
                      >
                        {item.current_stock}
                      </span>{' '}
                      <span className="text-stone-500">{item.unit}</span>
                    </td>

                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min={0}
                          value={item.reorder_threshold}
                          onChange={(e) =>
                            handleUpdateThreshold(item, Number(e.target.value))
                          }
                          className="w-16 px-2 py-1 text-xs font-mono border border-stone-300 rounded bg-white text-center"
                          title="Edit Reorder Threshold"
                        />
                        <span className="text-stone-400 text-[11px]">{item.unit}</span>
                      </div>
                    </td>

                    <td className="px-6 py-3.5">
                      {isOutOfStock ? (
                        <span className="px-2.5 py-1 rounded-full bg-rose-700 text-white text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Out of Stock
                        </span>
                      ) : isLowStock ? (
                        <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-300 text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          Low Stock &bull; Reorder Now
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-emerald-600" />
                          In Stock
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleAdjustSupplyStock(item, -1)}
                          className="p-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded cursor-pointer"
                          title="Use 1 unit"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAdjustSupplyStock(item, 1)}
                          className="p-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded cursor-pointer"
                          title="Add 1 unit"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAdjustSupplyStock(item, 25)}
                          className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded text-[11px] cursor-pointer transition-colors"
                          title="Restock +25 units"
                        >
                          +25 Restock
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSupply(item.id)}
                          className="p-1 text-stone-400 hover:text-rose-600 rounded cursor-pointer"
                          title="Delete Supply Item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Priority Action Section: Rooms that need cleaning right now */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
          <h4 className="font-serif font-bold text-stone-900 text-base flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            Rooms Requiring Cleaning ({dirtyRooms.length})
          </h4>
        </div>

        {dirtyRooms.length === 0 ? (
          <div className="p-8 text-center text-xs text-stone-500">
            <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
            All checkout and dirty rooms have been cleaned and inspected!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
            {dirtyRooms.map((room) => (
              <div
                key={room.id}
                className="p-4 rounded-xl border border-amber-300 bg-amber-50/50 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="font-mono font-bold text-xl text-stone-900">
                    Room {room.room_number}
                  </div>
                  <span className="text-[11px] text-stone-500 font-medium">
                    Floor {room.floor}
                  </span>
                </div>
                <div className="text-xs text-stone-600">
                  {room.category?.name || 'Standard Room'}
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleMarkRoomClean(room)}
                    className="flex-1 py-1.5 px-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Mark Cleaned</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMarkRoomMaintenance(room)}
                    className="py-1.5 px-2.5 bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    Maintenance
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Full 30 Rooms Status Overview */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-200">
          <h4 className="font-serif font-bold text-stone-900 text-base">
            All 30 Rooms Cleanliness Status
          </h4>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 text-stone-600 uppercase font-semibold border-b border-stone-200">
              <tr>
                <th className="px-6 py-3">Room</th>
                <th className="px-6 py-3">Floor</th>
                <th className="px-6 py-3">Category</th>
                <th className="px-6 py-3">Current Status</th>
                <th className="px-6 py-3 text-right">Quick Transition</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {rooms.map((room) => (
                <tr key={room.id} className="hover:bg-stone-50/50">
                  <td className="px-6 py-3 font-mono font-bold text-stone-900 text-sm">
                    {room.room_number}
                  </td>
                  <td className="px-6 py-3 text-stone-600">Floor {room.floor}</td>
                  <td className="px-6 py-3 text-stone-800 font-medium">
                    {room.category?.name || 'Standard'}
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        room.status === 'Available'
                          ? 'bg-emerald-100 text-emerald-800'
                          : room.status === 'Cleaning'
                          ? 'bg-amber-100 text-amber-800'
                          : room.status === 'Occupied'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-stone-200 text-stone-800'
                      }`}
                    >
                      {room.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {room.status !== 'Available' && (
                        <button
                          type="button"
                          onClick={() => handleMarkRoomClean(room)}
                          className="px-2.5 py-1 text-[11px] bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-semibold rounded cursor-pointer"
                        >
                          Clean
                        </button>
                      )}
                      {room.status !== 'Cleaning' && (
                        <button
                          type="button"
                          onClick={() => handleMarkRoomCleaning(room)}
                          className="px-2.5 py-1 text-[11px] bg-amber-100 hover:bg-amber-200 text-amber-800 font-semibold rounded cursor-pointer"
                        >
                          Mark Dirty
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD SUPPLY ITEM MODAL */}
      <Modal
        isOpen={showAddSupplyModal}
        onClose={() => setShowAddSupplyModal(false)}
        title="Add Housekeeping Supply Item"
        subtitle="Track linen, toiletries, or cleaning supplies with automatic Low Stock alerts"
        maxWidth="md"
      >
        <form onSubmit={handleCreateSupplySubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
              Supply / Linen Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Hand Towels, Floor Cleaner, Soap Bars"
              value={supplyName}
              onChange={(e) => setSupplyName(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                Category
              </label>
              <select
                value={supplyCategory}
                onChange={(e) =>
                  setSupplyCategory(e.target.value as HousekeepingSupplyItem['category'])
                }
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg bg-white"
              >
                <option value="Linen">Linen</option>
                <option value="Toiletries">Toiletries</option>
                <option value="Cleaning Supplies">Cleaning Supplies</option>
                <option value="Guest Amenities">Guest Amenities</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                Unit (e.g. pcs, kits, liters)
              </label>
              <input
                type="text"
                required
                value={supplyUnit}
                onChange={(e) => setSupplyUnit(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                Initial Stock Count *
              </label>
              <input
                type="number"
                min={0}
                required
                value={supplyStock}
                onChange={(e) => setSupplyStock(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                Reorder Threshold (Low Stock Alert) *
              </label>
              <input
                type="number"
                min={0}
                required
                value={supplyThreshold}
                onChange={(e) => setSupplyThreshold(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-200">
            <button
              type="button"
              onClick={() => setShowAddSupplyModal(false)}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-amber-800 hover:bg-amber-900 text-white text-xs font-semibold uppercase tracking-wider rounded-lg cursor-pointer"
            >
              Save Supply Item
            </button>
          </div>
        </form>
      </Modal>

      {/* NEW TASK MODAL */}
      <Modal
        isOpen={showNewTaskModal}
        onClose={() => setShowNewTaskModal(false)}
        title="Create Housekeeping Task"
        subtitle="Schedule room cleaning or maintenance work order"
        maxWidth="md"
      >
        <form onSubmit={handleCreateTask} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
              Select Room *
            </label>
            <select
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-700 font-mono font-medium"
            >
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  Room {r.room_number} &bull; Floor {r.floor} &bull; {r.status}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                Task Type
              </label>
              <select
                value={taskType}
                onChange={(e) => setTaskType(e.target.value as any)}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg"
              >
                <option value="Daily Cleaning">Daily Cleaning</option>
                <option value="Deep Cleaning">Deep Cleaning</option>
                <option value="Linen Change">Linen Change</option>
                <option value="Inspection">Inspection</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
              Notes for Housekeeping
            </label>
            <textarea
              rows={3}
              placeholder="Guest requested extra bath towels, sanitize balcony, change bedsheets..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-200">
            <button
              type="button"
              onClick={() => setShowNewTaskModal(false)}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
            >
              {isSubmitting ? 'Creating...' : 'Assign Task'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
