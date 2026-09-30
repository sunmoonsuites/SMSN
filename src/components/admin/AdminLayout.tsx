import React, { useState, useEffect } from 'react';
import { StaffUser, Hotel } from '../../types';
import { getSupabaseConfig } from '../../lib/supabase';
import { Modal } from '../common/Modal';
import {
  LayoutDashboard,
  ConciergeBell,
  CalendarDays,
  Grid3X3,
  BedDouble,
  Sparkles,
  Users,
  FileText,
  CreditCard,
  Receipt,
  PartyPopper,
  Tag,
  Image,
  Inbox,
  BarChart3,
  ShieldCheck,
  History,
  Settings,
  LogOut,
  Globe,
  Database,
  Menu,
  X,
  Keyboard,
  PlusCircle,
  Bell,
  CheckCheck,
  Trash2,
  Volume2,
  VolumeX,
  LogIn,
  Wrench,
  ArrowRight,
  Sun,
  Moon,
  BookOpen,
} from 'lucide-react';
import { usePMSTheme } from '../../services/themeService';
import {
  PMSNotification,
  PMSNotificationType,
  subscribeToPMSNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  clearAllNotifications,
  emitPMSNotification,
  isNotificationSoundEnabled,
  setNotificationSoundEnabled,
} from '../../services/notificationService';

export type AdminTab =
  | 'dashboard'
  | 'frontdesk'
  | 'reservations'
  | 'calendar'
  | 'rooms'
  | 'housekeeping'
  | 'guests'
  | 'billing'
  | 'payments'
  | 'expenses'
  | 'banquet'
  | 'offers'
  | 'gallery'
  | 'insights'
  | 'enquiries'
  | 'reports'
  | 'staff'
  | 'audit'
  | 'settings';

interface AdminLayoutProps {
  currentUser: StaffUser;
  hotel: Hotel | null;
  activeTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  onOpenNewBooking: () => void;
  onLogout: () => void;
  onViewWebsite: () => void;
  onOpenSupabaseConfig: () => void;
  children: React.ReactNode;
}

interface NavItemConfig {
  id: AdminTab;
  label: string;
  icon: React.ReactNode;
  allowedRoles: string[];
  shortcutKey?: string;
  shortcutLabel?: string;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  currentUser,
  hotel,
  activeTab,
  onSelectTab,
  onOpenNewBooking,
  onLogout,
  onViewWebsite,
  onOpenSupabaseConfig,
  children,
}) => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [shortcutToast, setShortcutToast] = useState<string | null>(null);
  const { theme, isDark, toggleTheme } = usePMSTheme(true);

  // Real-Time Notification System State
  const [notifications, setNotifications] = useState<PMSNotification[]>([]);
  const [activeToasts, setActiveToasts] = useState<PMSNotification[]>([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [notifFilter, setNotifFilter] = useState<'all' | PMSNotificationType>('all');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => isNotificationSoundEnabled());

  const dbConfig = getSupabaseConfig();
  const isDbConnected = Boolean(dbConfig.url && dbConfig.anonKey);

  const role = currentUser.role;

  // Role-based navigation items with keyboard shortcuts
  const allNavItems: NavItemConfig[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-4 h-4" />,
      allowedRoles: ['SUPER ADMIN', 'ADMIN', 'FRONT DESK', 'HOUSEKEEPING', 'ACCOUNTS'],
      shortcutKey: 'd',
      shortcutLabel: 'Ctrl+D',
    },
    {
      id: 'frontdesk',
      label: 'Front Desk Operations',
      icon: <ConciergeBell className="w-4 h-4" />,
      allowedRoles: ['SUPER ADMIN', 'ADMIN', 'FRONT DESK'],
      shortcutKey: 'f',
      shortcutLabel: 'Ctrl+F',
    },
    {
      id: 'reservations',
      label: 'Reservations',
      icon: <CalendarDays className="w-4 h-4" />,
      allowedRoles: ['SUPER ADMIN', 'ADMIN', 'FRONT DESK'],
      shortcutKey: 'r',
      shortcutLabel: 'Ctrl+R',
    },
    {
      id: 'calendar',
      label: '30-Room Calendar Matrix',
      icon: <Grid3X3 className="w-4 h-4" />,
      allowedRoles: ['SUPER ADMIN', 'ADMIN', 'FRONT DESK', 'HOUSEKEEPING'],
      shortcutKey: 'm',
      shortcutLabel: 'Ctrl+M',
    },
    {
      id: 'rooms',
      label: 'Rooms Inventory (30)',
      icon: <BedDouble className="w-4 h-4" />,
      allowedRoles: ['SUPER ADMIN', 'ADMIN', 'FRONT DESK', 'HOUSEKEEPING'],
      shortcutKey: 'i',
      shortcutLabel: 'Ctrl+I',
    },
    {
      id: 'housekeeping',
      label: 'Housekeeping Board',
      icon: <Sparkles className="w-4 h-4" />,
      allowedRoles: ['SUPER ADMIN', 'ADMIN', 'HOUSEKEEPING', 'FRONT DESK'],
      shortcutKey: 'h',
      shortcutLabel: 'Ctrl+H',
    },
    {
      id: 'guests',
      label: 'Guest Directory',
      icon: <Users className="w-4 h-4" />,
      allowedRoles: ['SUPER ADMIN', 'ADMIN', 'FRONT DESK'],
      shortcutKey: 'g',
      shortcutLabel: 'Ctrl+G',
    },
    {
      id: 'billing',
      label: 'Invoicing & GST Bills',
      icon: <FileText className="w-4 h-4" />,
      allowedRoles: ['SUPER ADMIN', 'ADMIN', 'FRONT DESK', 'ACCOUNTS'],
      shortcutKey: 'b',
      shortcutLabel: 'Ctrl+B',
    },
    {
      id: 'payments',
      label: 'Payment Transactions',
      icon: <CreditCard className="w-4 h-4" />,
      allowedRoles: ['SUPER ADMIN', 'ADMIN', 'FRONT DESK', 'ACCOUNTS'],
      shortcutKey: 'p',
      shortcutLabel: 'Ctrl+P',
    },
    {
      id: 'expenses',
      label: 'Hotel Expenses',
      icon: <Receipt className="w-4 h-4" />,
      allowedRoles: ['SUPER ADMIN', 'ADMIN', 'ACCOUNTS'],
      shortcutKey: 'e',
      shortcutLabel: 'Ctrl+E',
    },
    {
      id: 'banquet',
      label: 'Banquet Hall',
      icon: <PartyPopper className="w-4 h-4" />,
      allowedRoles: ['SUPER ADMIN', 'ADMIN', 'FRONT DESK'],
    },
    {
      id: 'offers',
      label: 'Offers & Promo Codes',
      icon: <Tag className="w-4 h-4" />,
      allowedRoles: ['SUPER ADMIN', 'ADMIN'],
    },
    {
      id: 'gallery',
      label: 'Photo Gallery',
      icon: <Image className="w-4 h-4" />,
      allowedRoles: ['SUPER ADMIN', 'ADMIN'],
    },
    {
      id: 'insights',
      label: 'Noida Insights & Blog',
      icon: <BookOpen className="w-4 h-4" />,
      allowedRoles: ['SUPER ADMIN', 'ADMIN'],
    },
    {
      id: 'enquiries',
      label: 'Enquiries Inbox',
      icon: <Inbox className="w-4 h-4" />,
      allowedRoles: ['SUPER ADMIN', 'ADMIN', 'FRONT DESK'],
    },
    {
      id: 'reports',
      label: 'Reports & Analytics',
      icon: <BarChart3 className="w-4 h-4" />,
      allowedRoles: ['SUPER ADMIN', 'ADMIN', 'ACCOUNTS'],
    },
    {
      id: 'staff',
      label: 'Staff & Roles (RBAC)',
      icon: <ShieldCheck className="w-4 h-4" />,
      allowedRoles: ['SUPER ADMIN', 'ADMIN'],
    },
    {
      id: 'audit',
      label: 'Audit Trail Logs',
      icon: <History className="w-4 h-4" />,
      allowedRoles: ['SUPER ADMIN'],
    },
    {
      id: 'settings',
      label: 'Website CMS & Settings',
      icon: <Settings className="w-4 h-4" />,
      allowedRoles: ['SUPER ADMIN', 'ADMIN'],
      shortcutKey: 's',
      shortcutLabel: 'Ctrl+S',
    },
  ];

  const visibleNavItems = allNavItems.filter((item) => item.allowedRoles.includes(role));

  const triggerToast = (message: string) => {
    setShortcutToast(message);
  };

  useEffect(() => {
    if (!shortcutToast) return;
    const timer = setTimeout(() => setShortcutToast(null), 2400);
    return () => clearTimeout(timer);
  }, [shortcutToast]);

  // Subscribe to Real-Time PMS Notifications (SSE + Supabase Realtime + BroadcastChannel)
  useEffect(() => {
    const unsubscribe = subscribeToPMSNotifications((list, latestToast) => {
      setNotifications(list);
      if (latestToast) {
        setActiveToasts((prev) => {
          if (prev.some((t) => t.id === latestToast.id)) return prev;
          return [latestToast, ...prev].slice(0, 4);
        });
      }
    });
    return () => unsubscribe();
  }, []);

  // Auto-dismiss each toast alert after 7 seconds
  useEffect(() => {
    if (activeToasts.length === 0) return;
    const timer = setTimeout(() => {
      setActiveToasts((prev) => prev.slice(0, -1));
    }, 7000);
    return () => clearTimeout(timer);
  }, [activeToasts]);

  const dismissToast = (id: string) => {
    setActiveToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    setNotificationSoundEnabled(next);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;
  const filteredNotifications =
    notifFilter === 'all'
      ? notifications
      : notifications.filter((n) => n.type === notifFilter);

  const handleTriggerSampleAlert = async (type: PMSNotificationType) => {
    if (type === 'checkin') {
      const rooms = ['102', '105', '201', '206', '302'];
      const guests = ['Ananya Verma', 'Siddharth Kapoor', 'Meera Nair', 'Rohan Deshmukh'];
      const rm = rooms[Math.floor(Math.random() * rooms.length)];
      const guest = guests[Math.floor(Math.random() * guests.length)];
      const ref = `SM-${Math.floor(10000 + Math.random() * 89999)}`;
      await emitPMSNotification({
        type: 'checkin',
        title: `New Guest Check-In • Room ${rm}`,
        message: `${guest} (${ref}) completed front desk verification and checked into Room ${rm}.`,
        targetTab: 'frontdesk',
        meta: { roomNumber: rm, guestName: guest, bookingRef: ref },
      });
    } else if (type === 'enquiry') {
      const callers = [
        { name: 'Karan Singhania', contact: '+91 98180 55412', msg: 'Enquiring about Banquet Hall + 8 Deluxe Rooms for wedding guests next month.' },
        { name: 'Neha Joshi', contact: '+91 99204 77123', msg: 'Need early check-in at 9:00 AM tomorrow for 2 Executive Suite bookings.' },
      ];
      const pick = callers[Math.floor(Math.random() * callers.length)];
      await emitPMSNotification({
        type: 'enquiry',
        title: `Incoming Enquiry • ${pick.name}`,
        message: `${pick.name} (${pick.contact}): "${pick.msg}"`,
        targetTab: 'enquiries',
        meta: { guestName: pick.name, contact: pick.contact },
      });
    } else {
      const issues = [
        { rm: '208', note: 'Smart keycard lock battery low & geyser thermostat replacement required urgently.' },
        { rm: '304', note: 'Split AC drain pipe leakage reported by housekeeping supervisor.' },
      ];
      const pick = issues[Math.floor(Math.random() * issues.length)];
      await emitPMSNotification({
        type: 'maintenance',
        title: `Urgent Maintenance Request • Room ${pick.rm}`,
        message: pick.note,
        targetTab: 'housekeeping',
        meta: { roomNumber: pick.rm, priority: 'Urgent' },
      });
    }
  };

  // Global PMS Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();
      const isEditable =
        tagName === 'input' ||
        tagName === 'textarea' ||
        tagName === 'select' ||
        target?.isContentEditable;

      const key = e.key.toLowerCase();
      const hasCommandModifier = e.ctrlKey || e.metaKey || e.altKey;

      // '?' or 'Ctrl+K' or 'Ctrl+/' opens Keyboard Shortcuts Modal
      if (
        ((e.ctrlKey || e.metaKey) && (key === 'k' || key === '/')) ||
        (!isEditable && !hasCommandModifier && e.key === '?')
      ) {
        e.preventDefault();
        setShowShortcutsModal((prev) => !prev);
        return;
      }

      if (!hasCommandModifier) return;

      // Do not override standard clipboard/undo shortcuts inside input fields
      if (isEditable && ['a', 'c', 'v', 'x', 'z', 'y'].includes(key)) {
        return;
      }

      // Ctrl+N or Alt+N -> New Booking Modal
      if (key === 'n') {
        e.preventDefault();
        e.stopPropagation();
        onOpenNewBooking();
        triggerToast('New Booking Modal Opened (Ctrl+N)');
        return;
      }

      // Match navigation tab shortcuts (e.g., Ctrl+F for Front Desk, Ctrl+D for Dashboard)
      const matchedItem = visibleNavItems.find((item) => item.shortcutKey === key);
      if (matchedItem) {
        // Avoid hijacking Ctrl+S if user is inside a form input in Settings
        if (key === 's' && isEditable) {
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        onSelectTab(matchedItem.id);
        setMobileSidebarOpen(false);
        triggerToast(`${matchedItem.label} (${matchedItem.shortcutLabel})`);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visibleNavItems, onOpenNewBooking, onSelectTab]);

  const handleNav = (tab: AdminTab) => {
    onSelectTab(tab);
    setMobileSidebarOpen(false);
  };

  return (
    <div
      data-theme={theme}
      className={`pms-portal min-h-screen flex flex-col font-sans transition-colors duration-200 ${
        isDark ? 'pms-dark dark bg-stone-950 text-stone-100' : 'bg-stone-100 text-stone-900'
      }`}
    >
      {/* Top Bar */}
      <header className="bg-stone-900 text-white h-16 px-4 sm:px-6 flex items-center justify-between border-b border-stone-800 z-20 shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="lg:hidden p-2 text-stone-300 hover:text-white rounded-lg hover:bg-stone-800"
          >
            {mobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-serif font-bold text-base sm:text-lg text-white tracking-wide">
                {hotel?.name || 'Sun Moon Suites'}
              </h2>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                PMS
              </span>
            </div>
            <p className="text-[10px] text-stone-400 hidden sm:block">
              {hotel?.city || 'Sector 117, Noida'} &bull; {hotel?.total_rooms || 30} Rooms across 3 Floors
            </p>
          </div>
        </div>

        {/* Right Header: Quick Actions, Shortcuts, DB indicator, User role */}
        <div className="flex items-center gap-2.5">
          {/* Quick New Booking Button (Ctrl+N) */}
          <button
            type="button"
            onClick={onOpenNewBooking}
            title="Create New Walk-In / Reservation (Ctrl+N or Alt+N)"
            className="px-3 py-1.5 bg-amber-700 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span className="hidden md:inline">New Booking</span>
            <kbd className="hidden xl:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-amber-900/70 text-amber-200 rounded border border-amber-500/30">
              Ctrl+N
            </kbd>
          </button>

          {/* Keyboard Shortcuts Reference Button (Ctrl+K) */}
          <button
            type="button"
            onClick={() => setShowShortcutsModal(true)}
            title="Keyboard Shortcuts (Ctrl+K or ?)"
            className="px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium rounded-lg flex items-center gap-1.5 border border-stone-700 transition-colors cursor-pointer"
          >
            <Keyboard className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden xl:inline">Shortcuts</span>
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-stone-900 text-stone-400 rounded border border-stone-700">
              Ctrl+K
            </kbd>
          </button>

          {/* Real-Time Notification Center Bell */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowNotifPanel((prev) => !prev)}
              title="Real-Time PMS Alerts (Check-Ins, Enquiries & Urgent Maintenance)"
              className={`relative px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition-colors cursor-pointer ${
                showNotifPanel
                  ? 'bg-amber-700 text-white border-amber-500'
                  : 'bg-stone-800 hover:bg-stone-700 text-stone-200 border-stone-700'
              }`}
            >
              <Bell className="w-4 h-4 text-amber-400" />
              <span className="hidden xl:inline">Live Alerts</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 bg-rose-600 text-white text-[10px] font-bold rounded-full min-w-[18px] text-center shadow-xs">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifPanel && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setShowNotifPanel(false)}
                />
                <div className="fixed sm:absolute right-2 sm:right-0 mt-2 w-[94vw] sm:w-[420px] bg-white text-stone-900 rounded-2xl shadow-2xl border border-stone-200 z-40 overflow-hidden">
                  {/* Header */}
                  <div className="p-3.5 bg-stone-900 text-white flex items-center justify-between border-b border-stone-800">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <div>
                        <h3 className="text-xs font-bold tracking-wide uppercase">
                          Real-Time Operations Feed
                        </h3>
                        <p className="text-[10px] text-stone-400">
                          Live Check-Ins, Website Enquiries &amp; Urgent Maintenance
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={handleToggleSound}
                        title={soundEnabled ? 'Mute Alert Chime' : 'Unmute Alert Chime'}
                        className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 cursor-pointer"
                      >
                        {soundEnabled ? (
                          <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <VolumeX className="w-3.5 h-3.5 text-stone-500" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => markAllNotificationsRead()}
                        title="Mark all as read"
                        className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 cursor-pointer"
                      >
                        <CheckCheck className="w-3.5 h-3.5 text-amber-400" />
                      </button>
                      <button
                        type="button"
                        onClick={() => clearAllNotifications()}
                        title="Clear all notifications"
                        className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-rose-400 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Filter Tabs */}
                  <div className="px-3 pt-2.5 pb-2 bg-stone-50 border-b border-stone-200 flex items-center gap-1.5 overflow-x-auto">
                    {(
                      [
                        { id: 'all', label: `All (${notifications.length})` },
                        {
                          id: 'checkin',
                          label: `Check-Ins (${notifications.filter((n) => n.type === 'checkin').length})`,
                        },
                        {
                          id: 'enquiry',
                          label: `Enquiries (${notifications.filter((n) => n.type === 'enquiry').length})`,
                        },
                        {
                          id: 'maintenance',
                          label: `Maintenance (${notifications.filter((n) => n.type === 'maintenance').length})`,
                        },
                      ] as const
                    ).map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setNotifFilter(tab.id)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                          notifFilter === tab.id
                            ? 'bg-amber-800 text-white'
                            : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Quick Test / Dispatch Bar */}
                  <div className="px-3 py-2 bg-amber-50/70 border-b border-amber-200/70 flex items-center justify-between gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900">
                      Test Live Toast:
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleTriggerSampleAlert('checkin')}
                        className="px-2 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-white text-[10px] font-semibold cursor-pointer"
                      >
                        + Check-In
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTriggerSampleAlert('enquiry')}
                        className="px-2 py-1 rounded bg-sky-700 hover:bg-sky-600 text-white text-[10px] font-semibold cursor-pointer"
                      >
                        + Enquiry
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTriggerSampleAlert('maintenance')}
                        className="px-2 py-1 rounded bg-rose-700 hover:bg-rose-600 text-white text-[10px] font-semibold cursor-pointer"
                      >
                        + Maintenance
                      </button>
                    </div>
                  </div>

                  {/* Notification List */}
                  <div className="max-h-80 overflow-y-auto divide-y divide-stone-100">
                    {filteredNotifications.length === 0 ? (
                      <div className="py-10 px-4 text-center text-xs text-stone-400">
                        No notifications in this category yet.
                      </div>
                    ) : (
                      filteredNotifications.map((item) => {
                        const isCheckin = item.type === 'checkin';
                        const isEnquiry = item.type === 'enquiry';
                        return (
                          <div
                            key={item.id}
                            onClick={() => {
                              markNotificationRead(item.id);
                              setShowNotifPanel(false);
                              handleNav(item.targetTab);
                            }}
                            className={`p-3.5 hover:bg-stone-50 transition-colors cursor-pointer flex items-start gap-3 ${
                              !item.read ? 'bg-amber-50/30' : 'bg-white'
                            }`}
                          >
                            <div
                              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                                isCheckin
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : isEnquiry
                                  ? 'bg-sky-100 text-sky-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {isCheckin ? (
                                <LogIn className="w-4 h-4" />
                              ) : isEnquiry ? (
                                <Inbox className="w-4 h-4" />
                              ) : (
                                <Wrench className="w-4 h-4" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-bold text-stone-900 truncate">
                                  {item.title}
                                </span>
                                {!item.read && (
                                  <span className="w-2 h-2 rounded-full bg-amber-600 shrink-0" />
                                )}
                              </div>
                              <p className="text-[11px] text-stone-600 mt-0.5 line-clamp-2">
                                {item.message}
                              </p>
                              <div className="flex items-center justify-between mt-1.5 text-[10px] text-stone-400">
                                <span>
                                  {new Date(item.created_at).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                                <span className="font-semibold text-amber-800 flex items-center gap-0.5">
                                  Open {item.targetTab === 'frontdesk' ? 'Front Desk' : item.targetTab === 'enquiries' ? 'Enquiries' : 'Housekeeping'}
                                  <ArrowRight className="w-3 h-3" />
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Quick Theme Switcher Button in Header */}
          <button
            type="button"
            onClick={() => {
              const next = toggleTheme();
              triggerToast(
                next === 'dark'
                  ? 'Night-Shift Dark Mode Enabled'
                  : 'Day-Shift Light Mode Enabled'
              );
            }}
            title={
              isDark
                ? 'Switch to Day-Shift Light Mode'
                : 'Switch to Night-Shift Dark Mode'
            }
            aria-label="Quick Theme Switch"
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition-colors cursor-pointer ${
              isDark
                ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/40'
                : 'bg-stone-800 hover:bg-stone-700 text-stone-200 border-stone-700'
            }`}
          >
            {isDark ? (
              <Moon className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Sun className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span className="hidden 2xl:inline">{isDark ? 'Night Shift' : 'Day Shift'}</span>
          </button>

          {/* Supabase Status Pill */}
          <button
            type="button"
            onClick={onOpenSupabaseConfig}
            className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              isDbConnected
                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 hover:bg-emerald-900'
                : 'bg-amber-950/80 text-amber-300 border border-amber-800/80 hover:bg-amber-900'
            }`}
          >
            <Database className="w-3 h-3" />
            <span className="hidden lg:inline">
              {isDbConnected ? 'Supabase Connected' : 'Local + Cloud Sync'}
            </span>
          </button>

          {/* User Profile info */}
          <div className="hidden sm:flex flex-col text-right pl-1">
            <span className="text-xs font-semibold text-stone-200">{currentUser.full_name}</span>
            <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
              {currentUser.role}
            </span>
          </div>

          {/* Public Website Button */}
          <button
            type="button"
            onClick={onViewWebsite}
            className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Website</span>
          </button>

          {/* Logout Button */}
          <button
            type="button"
            onClick={onLogout}
            title="Log out from PMS"
            className="p-1.5 text-stone-400 hover:text-rose-300 hover:bg-stone-800 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Container: Sidebar + Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-stone-200 shrink-0 select-none">
          <div className="p-3 border-b border-stone-100 flex items-center justify-between text-xs text-stone-500 font-semibold uppercase tracking-wider">
            <span>Property Operations</span>
            <span className="text-[10px] bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded">
              {currentUser.role}
            </span>
          </div>

          <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {visibleNavItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNav(item.id)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left cursor-pointer ${
                    isActive
                      ? 'bg-amber-800 text-white font-semibold shadow-2xs'
                      : 'text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={isActive ? 'text-white' : 'text-stone-500'}>{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.shortcutLabel && (
                    <kbd
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 ${
                        isActive
                          ? 'bg-amber-900/80 text-amber-100 border border-amber-600/40'
                          : 'bg-stone-100 text-stone-400 border border-stone-200'
                      }`}
                    >
                      {item.shortcutLabel}
                    </kbd>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="p-3 border-t border-stone-200 flex items-center justify-between text-[11px] text-stone-400">
            <span>Press ? for Shortcuts</span>
            <button
              type="button"
              onClick={() => setShowShortcutsModal(true)}
              className="text-amber-800 hover:underline font-semibold cursor-pointer"
            >
              View All
            </button>
          </div>
        </aside>

        {/* Mobile Sidebar Drawer */}
        {mobileSidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-40 flex">
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-xs"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <aside className="relative w-64 bg-white border-r border-stone-200 flex flex-col z-50">
              <div className="p-4 border-b border-stone-200 flex items-center justify-between">
                <div>
                  <h3 className="font-serif font-bold text-stone-900 text-sm">PMS Navigation</h3>
                  <span className="text-[10px] text-amber-800 font-bold">{currentUser.role}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileSidebarOpen(false)}
                  className="p-1 rounded-md text-stone-400 hover:text-stone-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto p-2 space-y-1">
                {visibleNavItems.map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleNav(item.id)}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left ${
                        isActive
                          ? 'bg-amber-800 text-white font-semibold shadow-2xs'
                          : 'text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={isActive ? 'text-white' : 'text-stone-500'}>{item.icon}</span>
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.shortcutLabel && (
                        <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-100 text-stone-500">
                          {item.shortcutLabel}
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </nav>
            </aside>
          </div>
        )}

        {/* Main Content Viewport */}
        <main className="flex-1 overflow-y-auto bg-stone-100 p-4 sm:p-6 lg:p-8 relative">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>

      {/* Real-Time Toast Alert Stack (Check-Ins, Website Enquiries & Urgent Maintenance) */}
      {activeToasts.length > 0 && (
        <div className="fixed top-20 right-5 z-50 flex flex-col gap-3 w-[92vw] sm:w-96 pointer-events-none">
          {activeToasts.map((toast) => {
            const isCheckin = toast.type === 'checkin';
            const isEnquiry = toast.type === 'enquiry';
            const accentBorder = isCheckin
              ? 'border-l-4 border-l-emerald-600 border-emerald-200'
              : isEnquiry
              ? 'border-l-4 border-l-sky-600 border-sky-200'
              : 'border-l-4 border-l-rose-600 border-rose-200';

            const badgeClass = isCheckin
              ? 'bg-emerald-100 text-emerald-900'
              : isEnquiry
              ? 'bg-sky-100 text-sky-900'
              : 'bg-rose-100 text-rose-900';

            const badgeLabel = isCheckin
              ? 'NEW GUEST CHECK-IN'
              : isEnquiry
              ? 'INCOMING ENQUIRY'
              : 'URGENT MAINTENANCE';

            return (
              <div
                key={toast.id}
                className={`pointer-events-auto bg-white rounded-xl shadow-2xl border ${accentBorder} p-4 transition-all duration-200`}
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`p-1.5 rounded-lg ${
                        isCheckin
                          ? 'bg-emerald-600 text-white'
                          : isEnquiry
                          ? 'bg-sky-600 text-white'
                          : 'bg-rose-600 text-white'
                      }`}
                    >
                      {isCheckin ? (
                        <LogIn className="w-3.5 h-3.5" />
                      ) : isEnquiry ? (
                        <Inbox className="w-3.5 h-3.5" />
                      ) : (
                        <Wrench className="w-3.5 h-3.5" />
                      )}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${badgeClass}`}>
                      {badgeLabel}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => dismissToast(toast.id)}
                    className="text-stone-400 hover:text-stone-700 p-1 rounded-md cursor-pointer"
                    title="Dismiss alert"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <h4 className="text-xs font-bold text-stone-900 mt-2">{toast.title}</h4>
                <p className="text-[11px] text-stone-600 mt-1 leading-relaxed">
                  {toast.message}
                </p>

                <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-center justify-between">
                  <span className="text-[10px] text-stone-400 font-medium">
                    Just now &bull; Live PMS Alert
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      markNotificationRead(toast.id);
                      dismissToast(toast.id);
                      handleNav(toast.targetTab);
                    }}
                    className="text-xs font-bold text-amber-800 hover:text-amber-900 flex items-center gap-1 cursor-pointer"
                  >
                    <span>
                      {isCheckin
                        ? 'Open Front Desk'
                        : isEnquiry
                        ? 'View Enquiry'
                        : 'Dispatch Housekeeping'}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Subtle Bottom-Right Shortcut Toast Indicator */}
      {shortcutToast && (
        <div className="fixed bottom-5 right-5 z-50 bg-stone-900 text-white px-4 py-2.5 rounded-xl shadow-lg border border-stone-700 flex items-center gap-2.5 text-xs font-medium">
          <Keyboard className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{shortcutToast}</span>
        </div>
      )}

      {/* Keyboard Shortcuts Reference & Quick Jump Modal */}
      <Modal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
        title="PMS Global Keyboard Shortcuts"
        subtitle="Speed up high-volume Front Desk & Hotel Operations (supports both Ctrl+Key and Alt+Key)"
        maxWidth="lg"
      >
        <div className="space-y-5">
          {/* Primary High-Volume Actions */}
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-amber-800 mb-2.5">
              Instant Front Desk Actions
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setShowShortcutsModal(false);
                  onOpenNewBooking();
                }}
                className="flex items-center justify-between p-3 rounded-xl border border-amber-200 bg-amber-50/70 hover:bg-amber-100/80 transition-colors text-left cursor-pointer"
              >
                <div>
                  <div className="text-xs font-bold text-stone-900">New Walk-In / Booking</div>
                  <div className="text-[11px] text-stone-500">Open reservation wizard from anywhere</div>
                </div>
                <div className="flex items-center gap-1">
                  <kbd className="px-2 py-1 text-[11px] font-mono font-bold bg-white text-amber-900 rounded border border-amber-300 shadow-2xs">
                    Ctrl+N
                  </kbd>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowShortcutsModal(false);
                  handleNav('frontdesk');
                }}
                className="flex items-center justify-between p-3 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 transition-colors text-left cursor-pointer"
              >
                <div>
                  <div className="text-xs font-bold text-stone-900">Front Desk Operations</div>
                  <div className="text-[11px] text-stone-500">Arrivals, Check-In &amp; Departures</div>
                </div>
                <kbd className="px-2 py-1 text-[11px] font-mono font-bold bg-white text-stone-800 rounded border border-stone-300 shadow-2xs">
                  Ctrl+F
                </kbd>
              </button>
            </div>
          </div>

          {/* Module Navigation Shortcuts */}
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-2.5">
              Module Navigation Shortcuts (Click any row or press shortcut)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {visibleNavItems
                .filter((item) => item.shortcutLabel)
                .map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setShowShortcutsModal(false);
                      handleNav(item.id);
                    }}
                    className="flex items-center justify-between px-3 py-2 rounded-lg border border-stone-200 hover:bg-stone-50 text-xs transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2 font-medium text-stone-800">
                      <span className="text-stone-500">{item.icon}</span>
                      <span>{item.label}</span>
                    </span>
                    <kbd className="px-2 py-0.5 text-[10px] font-mono font-semibold bg-stone-100 text-stone-700 rounded border border-stone-300">
                      {item.shortcutLabel}
                    </kbd>
                  </button>
                ))}
            </div>
          </div>

          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-[11px] text-stone-600 flex items-center justify-between">
            <span>
              Tip: You can use either <strong className="text-stone-800">Ctrl + Key</strong> (e.g.{' '}
              <code className="font-mono">Ctrl+N</code>, <code className="font-mono">Ctrl+F</code>) or{' '}
              <strong className="text-stone-800">Alt + Key</strong> (if your browser reserves Ctrl+N).
            </span>
            <kbd className="px-2 py-0.5 font-mono text-[10px] bg-white border border-stone-300 rounded">
              ? / Ctrl+K
            </kbd>
          </div>
        </div>
      </Modal>
    </div>
  );
};
