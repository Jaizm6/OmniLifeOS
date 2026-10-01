import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  Cloud,
  CloudOff,
  Database,
  Moon,
  Sun,
  ShieldCheck,
  RefreshCw,
  User,
  CheckCircle2,
  Sliders,
  Palette,
  Sparkles,
  Check,
  Quote,
  LayoutGrid,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PWAInstallButton } from '../pwa/PWAInstallButton';
import { OmniLogo } from '../common/OmniLogo';
import { AccentTone } from '../../types';
import { DEFAULT_AVATAR_PHOTO } from '../../utils/initialData';

export const Navbar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    theme,
    setTheme,
    themeStyle,
    setThemeStyle,
    accentTone,
    setAccentTone,
    isOnline,
    syncStatus,
    syncWithCloud,
    syncEmail,
    unreadNotificationsCount,
    setIsNotificationDrawerOpen,
    setIsBackupModalOpen,
    setIsAuthModalOpen,
    setIsWidgetModalOpen,
    setIsAIChatOpen,
    profile,
    isSidebarCollapsed,
    toggleSidebar,
  } = useApp();

  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const [hoveredTone, setHoveredTone] = useState<string | null>(null);
  const themeMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (themeMenuRef.current && !themeMenuRef.current.contains(event.target as Node)) {
        setIsThemeMenuOpen(false);
      }
    };
    if (isThemeMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isThemeMenuOpen]);

  const toneOptions: { id: AccentTone; label: string; desc: string; color: string }[] = [
    { id: 'indigo', label: 'Indigo', desc: 'Royal Blue', color: '#6366f1' },
    { id: 'emerald', label: 'Emerald', desc: 'Forest Green', color: '#10b981' },
    { id: 'violet', label: 'Violet', desc: 'Deep Purple', color: '#8b5cf6' },
    { id: 'rose', label: 'Rose', desc: 'Ruby Crimson', color: '#f43f5e' },
    { id: 'amber', label: 'Amber', desc: 'Warm Gold', color: '#f59e0b' },
    { id: 'cyan', label: 'Cyan', desc: 'Ocean Teal', color: '#06b6d4' },
  ];

  const activeOption = toneOptions.find(t => t.id === (hoveredTone || accentTone)) || toneOptions[0];

  return (
    <header className="sticky top-0 z-40 w-full max-w-full overflow-x-clip border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors shadow-2xs">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 h-12 sm:h-12.5 flex items-center justify-between gap-1 sm:gap-1.5 min-w-0">
        {/* Brand / Title & Desktop Sidebar Toggle */}
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 shrink">
          {/* Desktop/Tablet Sidebar Toggle Button */}
          <button
            id="btn-toggle-sidebar"
            type="button"
            onClick={toggleSidebar}
            title={isSidebarCollapsed ? "Expand Sidebar (Ctrl+B)" : "Collapse Sidebar to full width (Ctrl+B)"}
            className="hidden md:flex p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer shrink-0"
          >
            {isSidebarCollapsed ? (
              <PanelLeftOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            ) : (
              <PanelLeftClose className="w-4 h-4 text-slate-500 hover:text-slate-700 dark:text-slate-300" />
            )}
          </button>

          <OmniLogo
            size="sm"
            subtitle="All-in-One Unified Life Log"
            className="hover:opacity-95 transition"
          />
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* AI Assistant Button (Positioned right before Synced button) */}
          <button
            id="btn-nav-ai"
            onClick={() => setIsAIChatOpen(true)}
            title="Open AI Assistant"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-indigo-500/15 via-purple-500/15 to-pink-500/15 border border-indigo-500/40 text-indigo-600 dark:text-indigo-400 hover:from-indigo-500/25 hover:to-purple-500/25 transition shrink-0 cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>AI</span>
          </button>

          {/* Cloud Sync Status Indicator */}
          <button
            id="btn-cloud-sync"
            onClick={() => syncWithCloud()}
            title={isOnline ? `Sync with Cloud (${syncStatus}) · Account: ${syncEmail}` : 'Offline - local cache active'}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0"
          >
            {isOnline ? (
              syncStatus === 'syncing' ? (
                <>
                  <RefreshCw className="w-3 h-3 text-indigo-500 animate-spin" />
                  <span className="hidden sm:inline text-indigo-600 dark:text-indigo-400">Syncing...</span>
                </>
              ) : syncStatus === 'synced' ? (
                <>
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  <span className="hidden sm:inline text-emerald-600 dark:text-emerald-400">Synced</span>
                </>
              ) : (
                <>
                  <Cloud className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                  <span className="hidden sm:inline text-slate-600 dark:text-slate-300">Sync</span>
                </>
              )
            ) : (
              <>
                <CloudOff className="w-3 h-3 text-amber-500" />
                <span className="hidden sm:inline text-amber-600 dark:text-amber-400">Offline</span>
              </>
            )}
            <span className="hidden xl:inline text-[9.5px] text-slate-400 dark:text-slate-500 font-mono border-l border-slate-200 dark:border-slate-700 pl-1.5 max-w-[120px] truncate" title={`Sync target: ${syncEmail}`}>
              {syncEmail}
            </span>
          </button>

          {/* Backup & Cloud Storage (GDrive / Open Source / Restore) */}
          <button
            id="btn-cloud-backup"
            onClick={() => setIsBackupModalOpen(true)}
            title={`Cloud Backup & Storage · Account: ${syncEmail}`}
            className="hidden sm:flex px-2 py-0.5 rounded-full text-[11px] font-medium border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition items-center gap-1 shrink-0"
          >
            <Database className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span className="hidden md:inline">Cloud Backup</span>
          </button>

          {/* Direct Quotes Page Link - Mobile shows icon/logo only to save space */}
          <button
            id="btn-nav-quotes"
            onClick={() => setActiveTab('quotes')}
            title="Quotes Section (2,800+ Wisdom Library, Add/Edit/Delete)"
            className={`flex p-1.5 sm:px-2.5 sm:py-1 rounded-full text-xs font-semibold border transition items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'quotes'
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold shadow-2xs'
                : 'border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
            }`}
          >
            <Quote className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span className="hidden sm:inline">Quotes</span>
          </button>

          {/* Settings Button */}
          <button
            id="btn-nav-settings"
            onClick={() => setActiveTab('settings')}
            title="System Settings & Cloud Sync"
            className={`flex p-1.5 sm:px-2.5 sm:py-1 rounded-full text-xs font-semibold border transition items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'settings'
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold shadow-2xs'
                : 'border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
            }`}
          >
            <Settings className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
            <span className="hidden sm:inline">Settings</span>
          </button>

          {/* PWA Install Button */}
          <div className="hidden sm:block shrink-0">
            <PWAInstallButton compact={true} />
          </div>

          {/* Theme & Glassmorphism & Tone Appearance Popover */}
          <div className="relative shrink-0" ref={themeMenuRef}>
            <button
              type="button"
              id="btn-appearance-menu"
              onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
              title="Theme, Glassmorphic & Color Accents"
              className="p-1.5 sm:p-2 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-1 cursor-pointer"
            >
              <Palette className="w-4 h-4 text-indigo-500" />
            </button>

            {isThemeMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-24px)] p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 mb-2.5">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Appearance & Themes</span>
                  </h4>
                </div>

                {/* Light vs Dark */}
                <div className="mb-3">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1.5">
                    Display Mode
                  </span>
                  <div className="grid grid-cols-2 gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    <button
                      type="button"
                      id="theme-btn-light"
                      onClick={() => setTheme('light')}
                      className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-lg transition ${
                        theme === 'light'
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      <Sun className="w-3.5 h-3.5 text-amber-500" />
                      <span>White</span>
                    </button>
                    <button
                      type="button"
                      id="theme-btn-dark"
                      onClick={() => setTheme('dark')}
                      className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-lg transition ${
                        theme === 'dark'
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      <Moon className="w-3.5 h-3.5 text-indigo-400" />
                      <span>AMOLED Dark</span>
                    </button>
                  </div>
                </div>

                {/* Surface Style / Aesthetic Themes (Supporting User Uploaded Neumorphism, Pastel Clay, and Mint Styleguide) */}
                <div className="mb-3">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1.5">
                    Surface & Visual Style
                  </span>
                  <div className="flex flex-col gap-1.5 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl">
                    {/* Bento Studio (Default Theme: Merged Standard + Bento + Refined Tactile) */}
                    <button
                      type="button"
                      id="style-btn-bento"
                      onClick={() => setThemeStyle('bento')}
                      className={`flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition ${
                        themeStyle === 'bento'
                          ? 'bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 shadow-xs font-bold'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <LayoutGrid className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                        <div className="text-left">
                          <div className="font-semibold">🍱 Bento Studio (Default)</div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">Modern tactile cards & ambient bloom</div>
                        </div>
                      </div>
                      {themeStyle === 'bento' && <Check className="w-3.5 h-3.5 text-orange-500 shrink-0" />}
                    </button>

                    {/* Apple Glass (Liquid Gaussian Blur) */}
                    <button
                      type="button"
                      id="style-btn-glass"
                      onClick={() => setThemeStyle('glass')}
                      className={`flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition ${
                        themeStyle === 'glass'
                          ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <div className="text-left">
                          <div className="font-semibold">🪟 Apple Glass</div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">Liquid Gaussian blur & specular sheen</div>
                        </div>
                      </div>
                      {themeStyle === 'glass' && <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0" />}
                    </button>
                  </div>
                </div>

                {/* Multi-tone Color Accent Selector with Clear Naming & Real-Time Swatch Matching */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      Accent Palette
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-2xs">
                      <span
                        className="w-2 h-2 rounded-full inline-block shrink-0 shadow-xs"
                        style={{ backgroundColor: activeOption.color }}
                      />
                      <span>{activeOption.label}</span>
                      <span className="text-[9px] font-normal text-slate-400 dark:text-slate-500">
                        ({activeOption.desc})
                      </span>
                    </span>
                  </div>
                  <div className="grid grid-cols-6 gap-1.5">
                    {toneOptions.map(t => (
                      <button
                        key={t.id}
                        type="button"
                        id={`accent-btn-${t.id}`}
                        onClick={() => setAccentTone(t.id)}
                        onMouseEnter={() => setHoveredTone(t.id)}
                        onMouseLeave={() => setHoveredTone(null)}
                        title={`${t.label} (${t.desc}) Accent`}
                        className={`w-7 h-7 rounded-full flex items-center justify-center transition hover:scale-110 relative ${
                          accentTone === t.id
                            ? 'ring-2 ring-offset-2 ring-slate-800 dark:ring-white dark:ring-offset-slate-900 scale-105 shadow-sm'
                            : 'opacity-90 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: t.color }}
                      >
                        {accentTone === t.id && (
                          <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Notification Center */}
          <button
            id="btn-notifications-drawer"
            onClick={() => setIsNotificationDrawerOpen(true)}
            title="Notification Center & Reminder Scheduler"
            className="relative p-1 sm:p-1.5 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0 cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
            )}
          </button>

          {/* User Account / Profile Identity */}
          <button
            id="btn-user-account"
            onClick={() => setIsAuthModalOpen(true)}
            title={`Account: ${profile.nickname ? `${profile.nickname} (${profile.name})` : profile.name} • ${profile.identifier}`}
            className="flex items-center gap-1.5 p-0.5 sm:px-2 sm:py-0.5 rounded-full border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-[11px] text-slate-700 dark:text-slate-300 shrink-0 cursor-pointer shadow-2xs"
          >
            {profile.avatarPhoto || DEFAULT_AVATAR_PHOTO ? (
              <img
                src={profile.avatarPhoto || DEFAULT_AVATAR_PHOTO}
                alt={profile.nickname || profile.name}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  // Fallback if image fails to render
                  (e.currentTarget as HTMLElement).style.display = 'none';
                  const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = 'flex';
                }}
                className="w-5 h-5 rounded-full object-cover shrink-0 ring-1.5 ring-emerald-500/60 shadow-2xs"
              />
            ) : null}
            <div
              style={{ display: profile.avatarPhoto || DEFAULT_AVATAR_PHOTO ? 'none' : 'flex' }}
              className="w-5 h-5 rounded-full bg-indigo-600 text-white items-center justify-center font-bold text-[10px] shrink-0 shadow-2xs"
            >
              {profile.nickname ? profile.nickname[0].toUpperCase() : (profile.name ? profile.name[0].toUpperCase() : <User className="w-3 h-3" />)}
            </div>
            <span className="hidden sm:inline max-w-[90px] truncate font-semibold">
              {profile.nickname || profile.name.split(' ')[0]}
            </span>
            {profile.twoFactorEnabled && (
              <span title="2FA Active" className="hidden sm:inline">
                <ShieldCheck className="w-3 h-3 text-emerald-500" />
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
