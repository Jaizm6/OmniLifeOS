import React, { useState, useEffect, useMemo } from 'react';
import {
  BookLock,
  Lock,
  Plus,
  Key,
  Star,
  Trash2,
  Edit3,
  Search,
  Tag,
  Calendar as CalendarIcon,
  Smile,
  ShieldCheck,
  Eye,
  EyeOff,
  Check,
  X,
  FileText,
  CalendarDays,
  ListFilter,
  ChevronLeft,
  ChevronRight,
  Download,
  Share2,
  ExternalLink,
  Copy,
  Sparkles,
  Fingerprint,
  KeyRound,
  Unlock,
  Heart,
  TrendingUp,
  BarChart3,
  Paintbrush,
  Brain,
  PenTool,
  ChevronDown,
  MoreHorizontal,
  Mic,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { JournalEntry, MoodType, CBTRecord } from '../../types';
import { encryptText, decryptText } from '../../utils/crypto';
import { NoteLockModal } from './NoteLockModal';
import { JournalReportSection } from './JournalReportSection';
import { ReflectionPromptCard } from './ReflectionPromptCard';
import { GuidedTemplatesDeck } from './GuidedTemplatesDeck';
import { QuoteBanner } from '../common/QuoteBanner';
import { JournalDrawingModal } from './JournalDrawingModal';
import { CBTThoughtModal } from './CBTThoughtModal';
import { JournalVoiceDictation } from './JournalVoiceDictation';

export const JournalManager: React.FC = () => {
  const {
    journalEntries,
    addJournalEntry,
    updateJournalEntry,
    deleteJournalEntry,
    toggleFavoriteJournal,
    masterPassphrase,
    setMasterPassphrase,
    isJournalLocked,
    setIsJournalLocked,
    pushNotification,
    soundEngine,
  } = useApp();

  // View mode: 'calendar' | 'timeline' | 'reports'
  const [viewMode, setViewMode] = useState<'calendar' | 'timeline' | 'reports'>('calendar');

  // Calendar state & appearance
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [calendarSize, setCalendarSize] = useState<'compact' | 'standard'>('standard');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Sync / Export Modal
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [copiedFeedUrl, setCopiedFeedUrl] = useState(false);

  // Note Lock & Unlock modal states
  const [unlockedNoteIds, setUnlockedNoteIds] = useState<Record<string, boolean>>({});
  const [lockModalTarget, setLockModalTarget] = useState<{
    entry: JournalEntry;
    mode: 'lock' | 'unlock';
  } | null>(null);

  // Common filters & states
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [selectedMoodFilter, setSelectedMoodFilter] = useState<string>('all');
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [showPassphraseModal, setShowPassphraseModal] = useState(false);
  const [passphraseInput, setPassphraseInput] = useState('');
  const [passphraseError, setPassphraseError] = useState('');

  // Editor form state
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mood, setMood] = useState<MoodType>('calm');
  const [tagsInput, setTagsInput] = useState('Reflection');
  const [entryDate, setEntryDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [encryptThisEntry, setEncryptThisEntry] = useState(false);
  // Drawing & CBT Modal states
  const [showDrawingModal, setShowDrawingModal] = useState(false);
  const [currentDrawing, setCurrentDrawing] = useState<string | undefined>(undefined);
  const [showCBTModal, setShowCBTModal] = useState(false);
  const [showMoreTools, setShowMoreTools] = useState(false);

  // Voice Dictation states
  const [autoStartVoice, setAutoStartVoice] = useState(false);
  const [showVoiceDictationPanel, setShowVoiceDictationPanel] = useState(true);

  // Decrypted contents cache (entryId -> decrypted text)
  const [decryptedCache, setDecryptedCache] = useState<Record<string, string>>({});

  // Quick Gratitude & Prompts state
  const [quickGratitudeInput, setQuickGratitudeInput] = useState('');
  const PROMPTS = [
    '✨ What made you smile today?',
    '✨ What challenge did you navigate?',
    '✨ What are you genuinely grateful for?',
    '✨ Name one thing you learned today.',
    '✨ How did you nurture yourself today?',
  ];

  // Auto-select first entry if none selected in timeline mode
  useEffect(() => {
    if (!selectedEntryId && journalEntries.length > 0) {
      setSelectedEntryId(journalEntries[0].id);
    }
  }, [journalEntries, selectedEntryId]);

  const moods: { type: MoodType; emoji: string; label: string; score: number }[] = [
    { type: 'great', emoji: '🤩', label: 'Great', score: 5 },
    { type: 'good', emoji: '😊', label: 'Good', score: 4 },
    { type: 'okay', emoji: '😐', label: 'Okay', score: 3 },
    { type: 'bad', emoji: '😔', label: 'Bad', score: 2 },
    { type: 'awful', emoji: '😢', label: 'Awful', score: 1 },
    { type: 'ecstatic', emoji: '🤩', label: 'Ecstatic', score: 5 },
    { type: 'calm', emoji: '😌', label: 'Calm', score: 4 },
    { type: 'anxious', emoji: '😰', label: 'Anxious', score: 2 },
    { type: 'down', emoji: '😔', label: 'Down', score: 2 },
  ];

  const primaryMoods = moods.slice(0, 5);

  // Quick Mood Log handler for selectedCalendarDate
  const handleQuickMoodLog = (moodType: MoodType) => {
    const existing = journalEntries.find(
      e => (e.date || e.createdAt.split('T')[0]) === selectedCalendarDate
    );
    if (existing) {
      updateJournalEntry({
        ...existing,
        mood: moodType,
      });
      soundEngine.playSuccessChime();
      pushNotification('Mood Logged', `Updated mood to ${moodType} for ${selectedCalendarDate}`, 'journal');
    } else {
      addJournalEntry({
        title: `Reflection - ${new Date(selectedCalendarDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        content: '',
        mood: moodType,
        tags: ['DailyMood'],
        date: selectedCalendarDate,
        isEncrypted: false,
      });
      soundEngine.playSuccessChime();
      pushNotification('Mood Logged', `Recorded mood as ${moodType} for ${selectedCalendarDate}`, 'journal');
    }
  };

  // Add gratitude item to selected date
  const handleAddGratitude = () => {
    if (!quickGratitudeInput.trim()) return;
    const text = quickGratitudeInput.trim();
    const existing = journalEntries.find(
      e => (e.date || e.createdAt.split('T')[0]) === selectedCalendarDate
    );
    if (existing) {
      const currentList = existing.gratitudeList || [];
      updateJournalEntry({
        ...existing,
        gratitudeList: [...currentList, text],
      });
    } else {
      addJournalEntry({
        title: `Gratitude & Reflection - ${selectedCalendarDate}`,
        content: '',
        mood: 'good',
        tags: ['Gratitude'],
        date: selectedCalendarDate,
        gratitudeList: [text],
        isEncrypted: false,
      });
    }
    setQuickGratitudeInput('');
    soundEngine.playSuccessChime();
  };

  // Remove gratitude item from an entry
  const handleRemoveGratitude = (entryId: string, itemIdx: number) => {
    const entry = journalEntries.find(e => e.id === entryId);
    if (entry && entry.gratitudeList) {
      const updated = entry.gratitudeList.filter((_, idx) => idx !== itemIdx);
      updateJournalEntry({
        ...entry,
        gratitudeList: updated,
      });
    }
  };

  // Mood Statistics calculations
  const moodStats = useMemo(() => {
    const entriesWithMood = journalEntries.filter(e => !!e.mood);
    if (entriesWithMood.length === 0) {
      return { avgScore: 4.0, totalLogged: 0, breakdown: [] };
    }
    let totalScore = 0;
    const counts: Record<string, number> = { great: 0, good: 0, okay: 0, bad: 0, awful: 0 };

    entriesWithMood.forEach(e => {
      const mObj = moods.find(m => m.type === e.mood);
      totalScore += mObj ? mObj.score : 3;
      const normalizedType =
        e.mood === 'ecstatic' ? 'great' :
        e.mood === 'calm' ? 'good' :
        e.mood === 'anxious' || e.mood === 'down' ? 'bad' :
        e.mood;
      if (counts[normalizedType] !== undefined) {
        counts[normalizedType]++;
      }
    });

    const avgScore = Number((totalScore / entriesWithMood.length).toFixed(1));
    const breakdown = [
      { type: 'great', label: 'Great', emoji: '🤩', count: counts['great'] },
      { type: 'good', label: 'Good', emoji: '😊', count: counts['good'] },
      { type: 'okay', label: 'Okay', emoji: '😐', count: counts['okay'] },
      { type: 'bad', label: 'Bad', emoji: '😔', count: counts['bad'] },
      { type: 'awful', label: 'Awful', emoji: '😢', count: counts['awful'] },
    ];

    return { avgScore, totalLogged: entriesWithMood.length, breakdown };
  }, [journalEntries]);

  // Passphrase Unlock / Setup
  const handlePassphraseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passphraseInput.trim()) return;

    try {
      setMasterPassphrase(passphraseInput.trim());
      setIsJournalLocked(false);
      setShowPassphraseModal(false);
      setPassphraseError('');
      pushNotification('Vault Unlocked', 'End-to-end encrypted journal decrypted.', 'journal');

      // Attempt decrypting all encrypted entries with this key
      const newCache: Record<string, string> = {};
      for (const entry of journalEntries) {
        if (entry.isEncrypted && entry.cipherText && entry.iv && entry.salt) {
          try {
            const dec = await decryptText(
              { cipherText: entry.cipherText, iv: entry.iv, salt: entry.salt },
              passphraseInput.trim()
            );
            newCache[entry.id] = dec;
          } catch {
            // Decryption failure for that entry
          }
        }
      }
      setDecryptedCache(prev => ({ ...prev, ...newCache }));
    } catch {
      setPassphraseError('Invalid passphrase. Unable to unlock.');
    }
  };

  const handleLockVault = () => {
    setIsJournalLocked(true);
    setDecryptedCache({});
    pushNotification('Vault Locked', 'Journal entries are securely encrypted in memory.', 'journal');
  };

  const openNewEntry = (
    presetDate?: string,
    templateType?: 'morning' | 'evening' | 'positive' | 'cbt' | 'reflection' | 'freeform',
    customTitle?: string,
    customContent?: string,
    startVoiceImmediately: boolean = false
  ) => {
    setEditId(null);
    setCurrentDrawing(undefined);
    setTitle(customTitle || '');
    setContent(customContent || '');
    setMood('calm');
    setTagsInput(templateType ? `Reflection, ${templateType.toUpperCase()}` : 'Reflection, Focus');
    setEntryDate(presetDate || selectedCalendarDate || new Date().toISOString().split('T')[0]);
    setEncryptThisEntry(false);
    setAutoStartVoice(startVoiceImmediately);
    setShowVoiceDictationPanel(true);
    setShowEditorModal(true);
  };

  const openNewEntryWithVoice = (presetDate?: string) => {
    openNewEntry(
      presetDate,
      'freeform',
      `Voice Reflection - ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
      '',
      true
    );
    soundEngine?.playSuccessChime?.();
  };

  // Template selection handler
  const handleSelectTemplate = (
    templateType: 'daily_reflection' | 'notes' | 'dream_journal' | 'morning' | 'evening' | 'positive' | 'cbt'
  ) => {
    if (templateType === 'cbt') {
      setShowCBTModal(true);
      return;
    }

    if (templateType === 'daily_reflection') {
      const content = `### 📖 Daily Reflection\nWhat went well today? What challenges did I navigate and what did I learn?\n`;
      openNewEntry(undefined, 'reflection', 'Daily Reflection', content);
    } else if (templateType === 'notes') {
      const content = `### 📝 Notes & Ideas\n- \n`;
      openNewEntry(undefined, 'freeform', 'Notes', content);
    } else if (templateType === 'dream_journal') {
      const content = `### ✨ Dream Journal\nWhat did I dream about? Key symbols and feelings upon waking:\n`;
      openNewEntry(undefined, 'reflection', 'Dream Journal', content);
    } else if (templateType === 'morning') {
      const morningContent = `### ☀️ Morning Intentions\nWhat energy and intention do I want to bring to today?\n\n### 🎯 Top 3 Priorities\n1. \n2. \n3. \n\n### 🙏 Early Gratitude\n- \n- \n`;
      openNewEntry(undefined, 'morning', 'Morning Journal & Intentions', morningContent);
    } else if (templateType === 'evening') {
      const eveningContent = `### 🌙 Daily Wins & Accomplishments\nWhat went well today? What am I proud of?\n\n### 🕊️ Moments of Peace & Savoring\n\n### 💡 Lessons Learned\nWhat would I handle differently next time?\n`;
      openNewEntry(undefined, 'evening', 'Evening Journal & Review', eveningContent);
    } else if (templateType === 'positive') {
      const positiveContent = `### ⭐ Positive Moments & Micro-Joys\nSmall joys that made me smile or feel good today:\n- \n- \n\n### 💖 What Made Me Feel Valued\n\n### 🌻 Compliment To Myself\n`;
      openNewEntry(undefined, 'positive', 'Journal of Positive Moments', positiveContent);
    }
  };

  // Daily prompt answer handler (Screenshot 6)
  const handleAnswerPrompt = (promptText: string) => {
    const promptContent = `> "${promptText}"\n\n### My Reflection\n`;
    openNewEntry(undefined, 'reflection', `Reflection: ${promptText.slice(0, 36)}...`, promptContent);
  };

  // CBT Reframing Save handler (Screenshot 5)
  const handleSaveCBT = (cbtData: {
    title: string;
    content: string;
    cbtRecord: CBTRecord;
    mood: MoodType;
    tags: string[];
    date: string;
  }) => {
    addJournalEntry({
      title: cbtData.title,
      content: cbtData.content,
      cbtRecord: cbtData.cbtRecord,
      mood: cbtData.mood,
      tags: cbtData.tags,
      date: cbtData.date,
      templateType: 'cbt',
      isEncrypted: false,
    });
    pushNotification('CBT Record Saved', 'Negative situation reframed successfully.', 'journal');
  };

  // Permanent Decryption Handler (replaces encrypted cipher with plaintext)
  const handlePermanentlyDecrypt = (entry: JournalEntry) => {
    const plain = decryptedCache[entry.id] || entry.content;
    if (!plain || plain.startsWith('🔒 [AES-256 Encrypted')) {
      setShowPassphraseModal(true);
      setPassphraseError('Unlock vault first before decrypting this entry.');
      return;
    }
    updateJournalEntry({
      ...entry,
      isEncrypted: false,
      isLocked: false,
      content: plain,
      cipherText: undefined,
      iv: undefined,
      salt: undefined,
    });
    pushNotification('Note Decrypted', `"${entry.title}" is now permanently unencrypted.`, 'journal');
  };

  // Note Lock Handlers (PIN, Passcode, Fingerprint)
  const handleConfirmNoteLock = (
    entryId: string,
    lockType: 'pin' | 'passcode' | 'biometric',
    passcode?: string
  ) => {
    const target = journalEntries.find(e => e.id === entryId);
    if (!target) return;
    updateJournalEntry({
      ...target,
      isLocked: true,
      lockType,
      itemPasscode: passcode,
    });
    setUnlockedNoteIds(prev => ({ ...prev, [entryId]: false }));
    pushNotification('Note Protected', `"${target.title}" is locked with ${lockType}.`, 'journal');
  };

  const handleSuccessNoteUnlock = (entryId: string) => {
    setUnlockedNoteIds(prev => ({ ...prev, [entryId]: true }));
    pushNotification('Note Unlocked', 'Private note unlocked for this session.', 'journal');
  };

  const handleRemoveNoteLock = (entry: JournalEntry) => {
    updateJournalEntry({
      ...entry,
      isLocked: false,
      lockType: undefined,
      itemPasscode: undefined,
    });
    setUnlockedNoteIds(prev => {
      const copy = { ...prev };
      delete copy[entry.id];
      return copy;
    });
    pushNotification('Lock Removed', `"${entry.title}" is now unlocked.`, 'journal');
  };

  const openEditEntry = (entry: JournalEntry) => {
    setEditId(entry.id);
    setTitle(entry.title);
    const text = entry.isEncrypted ? decryptedCache[entry.id] || entry.content : entry.content;
    setContent(text);
    setMood(entry.mood);
    setTagsInput(entry.tags.join(', '));
    setEntryDate(entry.date || entry.createdAt.split('T')[0]);
    setEncryptThisEntry(entry.isEncrypted);
    setCurrentDrawing(entry.drawingUrl);
    setShowEditorModal(true);
  };

  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const parsedTags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    const targetDate = entryDate || new Date().toISOString().split('T')[0];

    let cipherText: string | undefined;
    let iv: string | undefined;
    let salt: string | undefined;
    const isEncrypted = encryptThisEntry;

    if (isEncrypted) {
      if (!masterPassphrase) {
        setShowPassphraseModal(true);
        setPassphraseError('You must set a master passphrase before creating encrypted entries.');
        return;
      }
      try {
        const encrypted = await encryptText(content, masterPassphrase);
        cipherText = encrypted.cipherText;
        iv = encrypted.iv;
        salt = encrypted.salt;
      } catch (err) {
        console.error('Encryption failed:', err);
        return;
      }
    }

    if (editId) {
      const existing = journalEntries.find(j => j.id === editId);
      if (!existing) return;

      updateJournalEntry({
        ...existing,
        title: title.trim(),
        content: isEncrypted ? '🔒 [AES-256 Encrypted Private Entry]' : content,
        mood,
        tags: parsedTags,
        date: targetDate,
        drawingUrl: currentDrawing,
        isEncrypted,
        cipherText,
        iv,
        salt,
      });

      if (isEncrypted) {
        setDecryptedCache(prev => ({ ...prev, [editId]: content }));
      }
    } else {
      const newId = `entry_${Date.now()}`;
      addJournalEntry({
        title: title.trim(),
        content: isEncrypted ? '🔒 [AES-256 Encrypted Private Entry]' : content,
        mood,
        tags: parsedTags,
        date: targetDate,
        drawingUrl: currentDrawing,
        isEncrypted,
        cipherText,
        iv,
        salt,
      });
      if (isEncrypted) {
        setDecryptedCache(prev => ({ ...prev, [newId]: content }));
      }
    }

    setShowEditorModal(false);
  };

  // Group entries by date
  const entriesByDate = useMemo(() => {
    const map: Record<string, JournalEntry[]> = {};
    for (const entry of journalEntries) {
      const d = entry.date || entry.createdAt.split('T')[0];
      if (!map[d]) map[d] = [];
      map[d].push(entry);
    }
    return map;
  }, [journalEntries]);

  // Selected Day's entries
  const selectedDayEntries = useMemo(() => {
    return entriesByDate[selectedCalendarDate] || [];
  }, [entriesByDate, selectedCalendarDate]);

  // Calendar calculations
  const year = calendarMonth.getFullYear();
  const month = calendarMonth.getMonth(); // 0-11
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const calendarDays = useMemo(() => {
    const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean; isToday: boolean }[] = [];
    const todayStr = new Date().toISOString().split('T')[0];

    // Padding for previous month
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      const dStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      days.push({ dateStr: dStr, dayNum, isCurrentMonth: false, isToday: dStr === todayStr });
    }

    // Days in current month
    for (let d = 1; d <= daysInMonth; d++) {
      const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ dateStr: dStr, dayNum: d, isCurrentMonth: true, isToday: dStr === todayStr });
    }

    // Trailing days for grid completion (multiple of 7)
    const totalCells = Math.ceil(days.length / 7) * 7;
    const remaining = totalCells - days.length;
    for (let d = 1; d <= remaining; d++) {
      const nextMonth = month === 11 ? 0 : month + 1;
      const nextYear = month === 11 ? year + 1 : year;
      const dStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ dateStr: dStr, dayNum: d, isCurrentMonth: false, isToday: dStr === todayStr });
    }

    return days;
  }, [year, month, firstDayOfMonth, daysInMonth, daysInPrevMonth]);

  const handlePrevMonth = () => {
    setCalendarMonth(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCalendarMonth(new Date(year, month + 1, 1));
  };

  const handleJumpToday = () => {
    const today = new Date();
    setCalendarMonth(today);
    setSelectedCalendarDate(today.toISOString().split('T')[0]);
  };

  // Export .ICS calendar file for Google Calendar, Notion Calendar, Apple Calendar
  const handleDownloadIcs = () => {
    const lines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//OmniLifeOS//Journal Calendar v2.0//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:OmniLifeOS Journal & Reflections',
      'X-WR-TIMEZONE:UTC',
    ];

    journalEntries.forEach(entry => {
      const cleanDate = (entry.date || entry.createdAt.split('T')[0]).replace(/-/g, '');
      const dtStart = `${cleanDate}T080000Z`;
      const dtEnd = `${cleanDate}T083000Z`;
      const text = entry.isEncrypted
        ? decryptedCache[entry.id] || '[AES-256 Encrypted Private Reflection]'
        : entry.content;
      const sanitizedDesc = text.replace(/[\r\n]+/g, ' ').replace(/,/g, '\\,').slice(0, 300);

      lines.push(
        'BEGIN:VEVENT',
        `UID:journal-${entry.id}@omnilifeos.app`,
        `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
        `DTSTART:${dtStart}`,
        `DTEND:${dtEnd}`,
        `SUMMARY:[Journal] ${entry.title.replace(/,/g, '\\,')} (${entry.mood})`,
        `DESCRIPTION:${sanitizedDesc}`,
        `CATEGORIES:Journal,Reflection,${entry.tags.join(',')}`,
        'STATUS:CONFIRMED',
        'END:VEVENT'
      );
    });

    lines.push('END:VCALENDAR');
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `OmniLifeOS_Journal_Calendar_${new Date().toISOString().split('T')[0]}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    pushNotification('Calendar Exported', 'Downloaded .ics file ready for Google or Notion Calendar.', 'calendar');
  };

  // 1-Click Open in Google Calendar
  const handleOpenGoogleCalendar = (entry?: JournalEntry) => {
    const target = entry || journalEntries[0];
    if (!target) return;
    const dateStr = (target.date || target.createdAt.split('T')[0]).replace(/-/g, '');
    const titleParam = encodeURIComponent(`[Journal] ${target.title}`);
    const detailsParam = encodeURIComponent(
      `Daily Reflection from OmniLifeOS\nMood: ${target.mood}\nTags: ${target.tags.join(', ')}`
    );
    const gCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${titleParam}&dates=${dateStr}T090000Z/${dateStr}T093000Z&details=${detailsParam}`;
    window.open(gCalUrl, '_blank', 'noopener,noreferrer');
  };

  // Filtered entries for timeline view
  const allTags = Array.from(new Set(journalEntries.flatMap(e => e.tags)));
  const filteredEntries = journalEntries.filter(entry => {
    const matchesSearch =
      entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesTag = selectedTag === 'all' || entry.tags.includes(selectedTag);
    const matchesMood = selectedMoodFilter === 'all' || entry.mood === selectedMoodFilter;
    return matchesSearch && matchesTag && matchesMood;
  });

  const selectedEntry = journalEntries.find(e => e.id === selectedEntryId);

  return (
    <div className="space-y-3.5 sm:space-y-4 animate-in fade-in duration-200">
      {/* Journal Title Bar (Consistent with Tasks & Master Calendar Pattern) */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/10 dark:bg-indigo-400/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 shadow-2xs">
            <BookLock className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                Journal & Private Reflections
              </h2>
              <span className="text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 shrink-0">
                <ShieldCheck className="w-3 h-3" />
                <span>AES-256 GCM</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Private reflections, daily prompts, CBT reframing, and sketch notes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
          {/* View Mode Switcher: Calendar vs Timeline vs Reports */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition ${
                viewMode === 'calendar'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Calendar</span>
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition ${
                viewMode === 'timeline'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Timeline</span>
            </button>
            <button
              onClick={() => setViewMode('reports')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition ${
                viewMode === 'reports'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reports</span>
            </button>
          </div>

          {/* Consolidated Journal Tools Menu */}
          <div className="relative">
            <button
              id="btn-journal-more-tools"
              onClick={() => setShowMoreTools(!showMoreTools)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition shadow-2xs"
              title="More reflection tools and privacy vault controls"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
              <span>Tools</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showMoreTools && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setShowMoreTools(false)}
                />
                <div className="absolute right-0 mt-1 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg z-30 py-1 text-xs divide-y divide-slate-100 dark:divide-slate-800">
                  <div className="p-1 space-y-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCBTModal(true);
                        setShowMoreTools(false);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-purple-50 dark:hover:bg-purple-950/40 hover:text-purple-600 dark:hover:text-purple-400 transition text-left"
                    >
                      <Brain className="w-3.5 h-3.5 text-purple-500" />
                      <span>CBT Thought Diary</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowDrawingModal(true);
                        setShowMoreTools(false);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-pink-50 dark:hover:bg-pink-950/40 hover:text-pink-600 dark:hover:text-pink-400 transition text-left"
                    >
                      <Paintbrush className="w-3.5 h-3.5 text-pink-500" />
                      <span>Draw & Paint Canvas</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowSyncModal(true);
                        setShowMoreTools(false);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-400 transition text-left"
                    >
                      <CalendarIcon className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Sync & Export (.ics)</span>
                    </button>
                  </div>

                  <div className="p-1">
                    {isJournalLocked ? (
                      <button
                        type="button"
                        id="btn-unlock-vault"
                        onClick={() => {
                          setShowPassphraseModal(true);
                          setShowMoreTools(false);
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition text-left font-semibold"
                      >
                        <Key className="w-3.5 h-3.5 text-amber-500" />
                        <span>{masterPassphrase ? 'Unlock Encrypted Vault' : 'Set Master Key'}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        id="btn-lock-vault"
                        onClick={() => {
                          handleLockVault();
                          setShowMoreTools(false);
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left"
                      >
                        <Lock className="w-3.5 h-3.5 text-slate-500" />
                        <span>Lock Vault Now</span>
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          <button
            id="btn-voice-dictate-entry"
            type="button"
            onClick={() => openNewEntryWithVoice()}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs transition active:scale-95 shrink-0 whitespace-nowrap cursor-pointer"
            title="Dictate journal entry using your microphone"
          >
            <Mic className="w-3.5 h-3.5" />
            <span className="hidden xs:inline sm:inline">Voice Dictate</span>
            <span className="xs:hidden sm:hidden">Dictate</span>
          </button>

          <button
            id="btn-new-journal-entry"
            onClick={() => openNewEntry()}
            className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition active:scale-95 shrink-0 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Entry</span>
          </button>
        </div>
      </div>

      {/* Daily Wisdom Widget (Positioned under the top journal header) */}
      <QuoteBanner />

      {/* COMBINED MOOD TRACKER & MOOD ANALYTICS BAR (Combined with Journal per request) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Smile className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                How are you feeling {selectedCalendarDate === new Date().toISOString().split('T')[0] ? 'today' : 'on this date'}?
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              1-tap mood logging synced seamlessly with your reflections ({selectedCalendarDate})
            </p>
          </div>

          {/* 5-Tier Emoji Mood Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {primaryMoods.map(m => {
              const dateEntry = journalEntries.find(
                e => (e.date || e.createdAt.split('T')[0]) === selectedCalendarDate
              );
              const isSelectedMood = dateEntry?.mood === m.type;

              return (
                <button
                  key={m.type}
                  type="button"
                  onClick={() => handleQuickMoodLog(m.type)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border text-xs font-bold transition-all active:scale-90 ${
                    isSelectedMood
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 ring-2 ring-amber-500/30 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 hover:border-amber-300 text-slate-700 dark:text-slate-300 bg-slate-50/60 dark:bg-slate-800/40'
                  }`}
                >
                  <span className="text-base">{m.emoji}</span>
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Mood Stats Mini Bar */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Avg Mood:</span>
              <span className="font-bold text-amber-600 dark:text-amber-400 font-mono">
                ⭐ {moodStats.avgScore} / 5.0
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Days Logged:</span>
              <span className="font-bold text-slate-900 dark:text-white font-mono">
                {moodStats.totalLogged} days
              </span>
            </div>
          </div>

          {/* Mini 5-bar distribution */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400">Distribution:</span>
            <div className="flex items-center gap-1">
              {moodStats.breakdown.map(b => (
                <div
                  key={b.type}
                  title={`${b.label}: ${b.count} entries`}
                  className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-600 dark:text-slate-300"
                >
                  <span>{b.emoji}</span>
                  <span className="font-mono">{b.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* GUIDED TEMPLATES & DAILY REFLECTION PROMPTS */}
      <div className="space-y-4">
        <ReflectionPromptCard onAnswerPrompt={handleAnswerPrompt} />
        <GuidedTemplatesDeck onSelectTemplate={handleSelectTemplate} />
      </div>

      {/* VIEW MODE 1: CALENDAR VIEW */}
      {viewMode === 'calendar' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Calendar Grid (6 cols) */}
          <div className="lg:col-span-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-xs space-y-3.5">
            {/* Calendar Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-slate-900 dark:text-white">
                  {monthNames[month]} {year}
                </span>
                <button
                  onClick={handleJumpToday}
                  className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition"
                >
                  Today
                </button>
              </div>

              <div className="flex items-center gap-2">
                {/* Compact / Normal Size Switcher */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={handlePrevMonth}
                    aria-label="Previous Month"
                    className="p-1 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleNextMonth}
                    aria-label="Next Month"
                    className="p-1 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Weekday Names (Clean, single-letter, zero font leaking) */}
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-slate-400 py-1.5 border-b border-slate-100 dark:border-slate-800">
              <span>S</span>
              <span>M</span>
              <span>T</span>
              <span>W</span>
              <span>T</span>
              <span>F</span>
              <span>S</span>
            </div>

            {/* Days Grid (aspect-square leak-free layout) */}
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {calendarDays.map((day, idx) => {
                const dayEntries = entriesByDate[day.dateStr] || [];
                const isSelected = selectedCalendarDate === day.dateStr;
                const hasEntries = dayEntries.length > 0;
                const dominantMood = hasEntries ? dayEntries[0].mood : null;
                const moodObj = moods.find(m => m.type === dominantMood);
                const isFavorited = dayEntries.some(e => e.isFavorite);

                return (
                  <button
                    key={`journal-day-${day.dateStr}-${idx}`}
                    type="button"
                    onClick={() => setSelectedCalendarDate(day.dateStr)}
                    className={`${calendarSize === 'compact' ? 'aspect-square p-0.5' : 'aspect-square p-2'} w-full rounded-2xl flex flex-col items-center justify-center relative border transition-all ${
                      isSelected
                        ? 'ring-2 ring-indigo-500 border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/60 font-bold'
                        : hasEntries
                        ? 'border-slate-200/80 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/40 hover:border-indigo-400'
                        : 'border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30'
                    } ${!day.isCurrentMonth ? 'opacity-30' : ''}`}
                  >
                    <span
                      className={`${calendarSize === 'compact' ? 'text-[10px] w-5 h-5' : 'text-xs sm:text-sm w-6 h-6'} font-semibold rounded-full flex items-center justify-center ${
                        day.isToday
                          ? 'bg-indigo-600 text-white font-bold shadow-xs'
                          : 'text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {day.dayNum}
                    </span>

                    <div className={`flex items-center justify-center mt-0.5 ${calendarSize === 'compact' ? 'h-3' : 'h-4'}`}>
                      {hasEntries ? (
                        <span className={`${calendarSize === 'compact' ? 'text-xs' : 'text-sm'} leading-none`}>{moodObj?.emoji || '📝'}</span>
                      ) : (
                        <span className="w-1 h-1 rounded-full bg-transparent" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Calendar Footer Legend */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                  <span>Today</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs">😊</span>
                  <span>Daily Mood</span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                  <span>Starred</span>
                </div>
              </div>
              <span className="font-mono text-[11px]">{journalEntries.length} total reflections</span>
            </div>
          </div>

          {/* Selected Date Detail Panel (6 cols) */}
          <div className="lg:col-span-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-xs flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-indigo-500" />
                    <span>
                      {new Date(selectedCalendarDate + 'T00:00:00').toLocaleDateString(undefined, {
                        weekday: 'long',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedDayEntries.length} reflection{selectedDayEntries.length === 1 ? '' : 's'} recorded
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => openNewEntryWithVoice(selectedCalendarDate)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-semibold shadow-2xs transition"
                    title="Dictate reflection with microphone"
                  >
                    <Mic className="w-3.5 h-3.5" />
                    <span>Dictate</span>
                  </button>
                  <button
                    onClick={() => openNewEntry(selectedCalendarDate)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Write</span>
                  </button>
                </div>
              </div>

              {/* Gratitude & Guided Reflection Prompts Section */}
              <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 space-y-3">
                {/* Gratitude input */}
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-indigo-900 dark:text-indigo-300 mb-1.5">
                    <span className="flex items-center gap-1">
                      <Heart className="w-3.5 h-3.5 text-rose-500" />
                      Daily Gratitude List
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="I am grateful for..."
                      value={quickGratitudeInput}
                      onChange={e => setQuickGratitudeInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddGratitude();
                        }
                      }}
                      className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={handleAddGratitude}
                      className="px-3 py-1.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-2xs"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Gratitude Chips from selected day entries */}
                {selectedDayEntries.some(e => e.gratitudeList && e.gratitudeList.length > 0) && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {selectedDayEntries.map(entry =>
                      (entry.gratitudeList || []).map((item, idx) => (
                        <span
                          key={`${entry.id}_grat_${idx}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                        >
                          <span>🙏 {item}</span>
                          <button
                            onClick={() => handleRemoveGratitude(entry.id, idx)}
                            className="text-slate-400 hover:text-rose-500"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                )}

                {/* Guided Reflection Prompts */}
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                    Prompt Inspiration
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {PROMPTS.slice(0, 3).map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => {
                          setContent(prev => (prev ? `${prev}\n\n${p}\n` : `${p}\n`));
                          openNewEntry(selectedCalendarDate);
                        }}
                        className="text-[11px] px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Day's Entries List */}
              <div className="space-y-3 mt-4 max-h-[460px] overflow-y-auto pr-1">
                {selectedDayEntries.length === 0 ? (
                  <div className="py-12 text-center space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-500 mx-auto flex items-center justify-center">
                      <FileText className="w-6 h-6 opacity-60" />
                    </div>
                    <p className="text-xs text-slate-500">No reflections recorded for this date.</p>
                    <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
                      <button
                        onClick={() => openNewEntry(selectedCalendarDate)}
                        className="px-3.5 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 text-xs font-semibold hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition"
                      >
                        + Write for this day
                      </button>
                      <button
                        type="button"
                        onClick={() => openNewEntryWithVoice(selectedCalendarDate)}
                        className="px-3.5 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 text-xs font-semibold hover:bg-purple-100 dark:hover:bg-purple-900/40 transition inline-flex items-center gap-1.5"
                      >
                        <Mic className="w-3.5 h-3.5" />
                        <span>Dictate with voice</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  selectedDayEntries.map(entry => {
                    const moodObj = moods.find(m => m.type === entry.mood);
                    const isNoteLocked = entry.isLocked && !unlockedNoteIds[entry.id];
                    const isDecrypted = !entry.isEncrypted || !!decryptedCache[entry.id];
                    const displayText = isNoteLocked
                      ? null
                      : entry.isEncrypted
                      ? decryptedCache[entry.id] || '🔒 [AES-256 Encrypted. Click to Unlock.]'
                      : entry.content;

                    return (
                      <div
                        key={entry.id}
                        className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-2.5 transition hover:border-indigo-300 dark:hover:border-indigo-700"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-lg">{moodObj?.emoji || '📝'}</span>
                            <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                              {entry.title}
                            </h4>
                            {entry.isLocked && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 flex items-center gap-0.5">
                                <Lock className="w-2.5 h-2.5" />
                                <span>{entry.lockType || 'Locked'}</span>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {/* Star */}
                            <button
                              onClick={() => toggleFavoriteJournal(entry.id)}
                              aria-label="Star reflection"
                              className="p-1 text-slate-400 hover:text-amber-500"
                            >
                              <Star
                                className={`w-3.5 h-3.5 ${
                                  entry.isFavorite ? 'text-amber-500 fill-amber-500' : ''
                                }`}
                              />
                            </button>

                            {/* Edit */}
                            {!isNoteLocked && (
                              <button
                                onClick={() => openEditEntry(entry)}
                                aria-label="Edit reflection"
                                className="p-1 text-slate-400 hover:text-indigo-600"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Delete */}
                            <button
                              onClick={() => deleteJournalEntry(entry.id)}
                              aria-label="Delete reflection"
                              className="p-1 text-slate-400 hover:text-rose-500"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Note locked placeholder vs. Content */}
                        {isNoteLocked ? (
                          <div className="p-3 rounded-xl border border-dashed border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300">
                              {entry.lockType === 'biometric' ? (
                                <Fingerprint className="w-4 h-4 text-amber-600" />
                              ) : (
                                <KeyRound className="w-4 h-4 text-amber-600" />
                              )}
                              <span>Locked note ({entry.lockType || 'Private'})</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setLockModalTarget({ entry, mode: 'unlock' })}
                              className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-[11px] transition"
                            >
                              Unlock
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-4 leading-relaxed font-sans whitespace-pre-wrap">
                              {displayText}
                            </p>

                            {/* Attached Drawing thumbnail (Screenshot 3) */}
                            {entry.drawingUrl && (
                              <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white p-1 max-w-[200px] shadow-2xs">
                                <img
                                  src={entry.drawingUrl}
                                  alt="Attached doodle"
                                  className="w-full h-auto rounded-lg object-contain max-h-32"
                                />
                              </div>
                            )}

                            {/* CBT Insight pill if present (Screenshot 5) */}
                            {entry.cbtRecord && (
                              <div className="p-2 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/60 text-[11px] space-y-1">
                                <div className="flex items-center gap-1 font-bold text-purple-800 dark:text-purple-300">
                                  <Brain className="w-3 h-3" />
                                  <span>CBT Thought Reframed</span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {entry.cbtRecord.distortions?.map((d: string) => (
                                    <span
                                      key={d}
                                      className="px-1.5 py-0.2 rounded text-[10px] bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-medium"
                                    >
                                      {d}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Tags, Security & Lock action controls */}
                        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] pt-1">
                          <div className="flex flex-wrap gap-1">
                            {entry.tags.map(t => (
                              <span
                                key={t}
                                className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium border border-slate-200 dark:border-slate-600"
                              >
                                #{t}
                              </span>
                            ))}
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Decrypt option for encrypted entries */}
                            {entry.isEncrypted && (
                              <button
                                type="button"
                                onClick={() => handlePermanentlyDecrypt(entry)}
                                className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5"
                                title="Permanently decrypt and save plaintext"
                              >
                                <Unlock className="w-3 h-3" />
                                <span>Decrypt</span>
                              </button>
                            )}

                            {/* Lock / Protect option */}
                            {entry.isLocked ? (
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveNoteLock(entry)}
                                  className="text-[10px] font-semibold text-slate-500 hover:text-rose-500 flex items-center gap-0.5"
                                  title="Remove PIN/Passcode protection"
                                >
                                  <Unlock className="w-3 h-3" />
                                  <span>Remove Lock</span>
                                </button>
                                {!isNoteLocked && (
                                  <button
                                    type="button"
                                    onClick={() => setUnlockedNoteIds(prev => ({ ...prev, [entry.id]: false }))}
                                    className="text-[10px] font-semibold text-amber-600 flex items-center gap-0.5"
                                    title="Lock now"
                                  >
                                    <Lock className="w-3 h-3" />
                                    <span>Lock</span>
                                  </button>
                                )}
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setLockModalTarget({ entry, mode: 'lock' })}
                                className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
                                title="Protect this note with PIN, passcode or fingerprint"
                              >
                                <Lock className="w-3 h-3" />
                                <span>Lock Note</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Quick Actions at bottom */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <button
                onClick={() => handleOpenGoogleCalendar(selectedDayEntries[0])}
                className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-semibold"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Google Calendar</span>
              </button>
              <button
                onClick={handleDownloadIcs}
                className="text-slate-600 dark:text-slate-400 hover:text-slate-900 flex items-center gap-1 font-semibold"
              >
                <Download className="w-3 h-3" />
                <span>Export .ics</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: TIMELINE VIEW */}
      {viewMode === 'timeline' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[500px]">
          {/* Left Column: List & Filters (5 cols) */}
          <div className="lg:col-span-5 flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
            {/* Search bar */}
            <div className="relative mb-3">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search entries, tags, or reflections..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400"
              />
            </div>

            {/* Tags & Mood filters */}
            <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-2 text-xs">
              <button
                onClick={() => setSelectedTag('all')}
                className={`px-2.5 py-1 rounded-lg shrink-0 transition ${
                  selectedTag === 'all'
                    ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold'
                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                All Tags
              </button>
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag)}
                  className={`px-2.5 py-1 rounded-lg shrink-0 transition flex items-center gap-1 ${
                    selectedTag === tag
                      ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold'
                      : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Tag className="w-3 h-3" />
                  <span>{tag}</span>
                </button>
              ))}
            </div>

            {/* Entries list */}
            <div className="space-y-2 flex-1 overflow-y-auto max-h-[520px]">
              {filteredEntries.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  No entries match your search.
                </div>
              ) : (
                filteredEntries.map(entry => {
                  const isSelected = selectedEntry?.id === entry.id;
                  const moodMeta = moods.find(m => m.type === entry.mood);

                  return (
                    <div
                      key={entry.id}
                      onClick={() => setSelectedEntryId(entry.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition text-left ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40'
                          : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-base">{moodMeta?.emoji}</span>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {entry.title}
                          </h4>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {entry.isFavorite && (
                            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                          )}
                          {entry.isEncrypted && (
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                          )}
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                        {entry.isEncrypted
                          ? decryptedCache[entry.id] || '🔒 [Encrypted Private Entry]'
                          : entry.content}
                      </p>

                      <div className="flex items-center justify-between mt-2 text-[10px] text-slate-400">
                        <span>{entry.date || entry.createdAt.split('T')[0]}</span>
                        <div className="flex items-center gap-1">
                          {entry.tags.slice(0, 2).map(t => (
                            <span key={t} className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                              #{t}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Markdown Reader / Details (7 cols) */}
          <div className="lg:col-span-7 flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs">
            {selectedEntry ? (
              <div className="flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-4">
                  {/* Top Bar with metadata and actions */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl shrink-0">
                          {moods.find(m => m.type === selectedEntry.mood)?.emoji}
                        </span>
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white break-words">
                          {selectedEntry.title}
                        </h3>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1 text-xs text-slate-400">
                        <span className="whitespace-nowrap font-medium text-slate-600 dark:text-slate-300">
                          {selectedEntry.date || selectedEntry.createdAt.split('T')[0]}
                        </span>
                        <span>•</span>
                        <span className="capitalize whitespace-nowrap">{selectedEntry.mood} mood</span>
                        {selectedEntry.isEncrypted && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-500 font-mono flex items-center gap-1 whitespace-nowrap">
                              <ShieldCheck className="w-3 h-3" />
                              AES-256
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center flex-wrap gap-1.5 shrink-0 self-start sm:self-auto">
                      {/* Decrypt Permanently button if encrypted */}
                      {selectedEntry.isEncrypted && (
                        <button
                          type="button"
                          onClick={() => handlePermanentlyDecrypt(selectedEntry)}
                          title="Permanently decrypt and save plaintext"
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold hover:bg-emerald-100 transition"
                        >
                          <Unlock className="w-3.5 h-3.5" />
                          <span>Decrypt</span>
                        </button>
                      )}

                      {/* Lock / Unlock Note controls */}
                      {selectedEntry.isLocked ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleRemoveNoteLock(selectedEntry)}
                            title="Remove PIN/Passcode lock"
                            className="flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 text-xs font-semibold transition"
                          >
                            <Unlock className="w-3.5 h-3.5" />
                            <span>Remove Lock</span>
                          </button>
                          {unlockedNoteIds[selectedEntry.id] && (
                            <button
                              type="button"
                              onClick={() => setUnlockedNoteIds(prev => ({ ...prev, [selectedEntry.id]: false }))}
                              title="Re-lock note"
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-500 transition"
                            >
                              <Lock className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setLockModalTarget({ entry: selectedEntry, mode: 'lock' })}
                          title="Protect this note with PIN, passcode or fingerprint"
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 text-xs font-semibold transition"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>Lock Note</span>
                        </button>
                      )}

                      <button
                        onClick={() => toggleFavoriteJournal(selectedEntry.id)}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition"
                      >
                        <Star
                          className={`w-4 h-4 ${
                            selectedEntry.isFavorite ? 'text-amber-500 fill-amber-500' : ''
                          }`}
                        />
                      </button>
                      <button
                        onClick={() => openEditEntry(selectedEntry)}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteJournalEntry(selectedEntry.id)}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-rose-50 text-rose-500 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Reflection Body */}
                  <div className="text-xs leading-relaxed text-slate-700 dark:text-slate-300 font-sans whitespace-pre-wrap">
                    {selectedEntry.isLocked && !unlockedNoteIds[selectedEntry.id] ? (
                      <div className="p-8 rounded-2xl border border-dashed border-indigo-300 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/20 text-center space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center">
                          {selectedEntry.lockType === 'biometric' ? (
                            <Fingerprint className="w-6 h-6" />
                          ) : (
                            <KeyRound className="w-6 h-6" />
                          )}
                        </div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                          Locked Private Note
                        </h4>
                        <p className="text-slate-500 max-w-xs mx-auto">
                          This entry is locked with {selectedEntry.lockType === 'biometric' ? 'fingerprint / biometric sensor' : selectedEntry.lockType === 'pin' ? 'a 4-digit PIN' : 'a passcode'}.
                        </p>
                        <button
                          type="button"
                          onClick={() => setLockModalTarget({ entry: selectedEntry, mode: 'unlock' })}
                          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-xs transition active:scale-95"
                        >
                          Unlock Note
                        </button>
                      </div>
                    ) : selectedEntry.isEncrypted && isJournalLocked && !decryptedCache[selectedEntry.id] ? (
                      <div className="p-8 rounded-2xl border border-dashed border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 text-center space-y-3">
                        <Lock className="w-8 h-8 text-amber-500 mx-auto" />
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                          Encrypted Reflection
                        </h4>
                        <p className="text-slate-500 max-w-xs mx-auto">
                          Unlock with your master passphrase to read or edit this entry.
                        </p>
                        <button
                          onClick={() => setShowPassphraseModal(true)}
                          className="px-4 py-1.5 rounded-xl bg-amber-500 text-white font-semibold text-xs"
                        >
                          Unlock Vault
                        </button>
                      </div>
                    ) : selectedEntry.isEncrypted ? (
                      decryptedCache[selectedEntry.id] || selectedEntry.content
                    ) : (
                      <div className="space-y-4">
                        <p>{selectedEntry.content}</p>

                        {/* Attached Drawing Preview (Screenshot 3) */}
                        {selectedEntry.drawingUrl && (
                          <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white p-2 max-w-sm shadow-2xs">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                              <Paintbrush className="w-3 h-3 text-pink-500" />
                              <span>Attached Doodle / Sketch</span>
                            </div>
                            <img
                              src={selectedEntry.drawingUrl}
                              alt="Attached doodle"
                              className="w-full h-auto rounded-xl object-contain max-h-64"
                            />
                          </div>
                        )}

                        {/* CBT Record Breakdown (Screenshot 5) */}
                        {selectedEntry.cbtRecord && (
                          <div className="p-4 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 space-y-2 text-xs">
                            <div className="flex items-center gap-2 font-bold text-purple-900 dark:text-purple-200">
                              <Brain className="w-4 h-4 text-purple-600" />
                              <span>CBT Thought Reframing Record</span>
                            </div>
                            <div className="space-y-1.5 text-slate-700 dark:text-slate-300">
                              <div>
                                <span className="font-semibold text-slate-900 dark:text-white">Situation: </span>
                                <span>{selectedEntry.cbtRecord.situation}</span>
                              </div>
                              <div>
                                <span className="font-semibold text-rose-600 dark:text-rose-400">Automatic Thought: </span>
                                <span>{selectedEntry.cbtRecord.automaticThoughts}</span>
                              </div>
                              <div className="flex flex-wrap gap-1 py-0.5">
                                {selectedEntry.cbtRecord.distortions?.map((d: string) => (
                                  <span
                                    key={d}
                                    className="px-2 py-0.5 rounded-md text-[10px] bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200 font-semibold"
                                  >
                                    {d}
                                  </span>
                                ))}
                              </div>
                              <div className="pt-1.5 border-t border-purple-200/60 dark:border-purple-800/60">
                                <span className="font-semibold text-emerald-600 dark:text-emerald-400">Rational Reframe: </span>
                                <span>{selectedEntry.cbtRecord.rationalReframe}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer tags */}
                <div className="flex flex-wrap gap-1.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                  {selectedEntry.tags.map(t => (
                    <span
                      key={t}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-xs text-slate-400">
                <FileText className="w-10 h-10 mb-2 opacity-40" />
                <span>Select a reflection from the left to read or edit.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW MODE 3: REPORTS & ANALYTICS VIEW */}
      {viewMode === 'reports' && (
        <JournalReportSection entries={journalEntries} />
      )}

      {/* Editor Modal */}
      {showEditorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BookLock className="w-4 h-4 text-amber-500" />
                {editId ? 'Edit Reflection' : 'New Private Journal Entry'}
              </h3>
              <button
                onClick={() => setShowEditorModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEntry} className="mt-4 space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Daily Review, Focus Milestone"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={entryDate}
                    onChange={e => setEntryDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              {/* Mood selector */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  Daily Mood
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {primaryMoods.map(m => (
                    <button
                      key={m.type}
                      type="button"
                      onClick={() => setMood(m.type)}
                      className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition ${
                        mood === m.type
                          ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/60 font-bold'
                          : 'border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <span>{m.emoji}</span>
                      <span className="capitalize">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Markdown Content & Microphone Voice Dictation */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-slate-700 dark:text-slate-300 font-medium">
                    Reflection Content (Markdown Supported)
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowVoiceDictationPanel(prev => !prev)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-900/60 border border-purple-200 dark:border-purple-800 transition cursor-pointer"
                  >
                    <Mic className="w-3.5 h-3.5" />
                    <span>{showVoiceDictationPanel ? 'Hide Dictation' : 'Voice Dictate'}</span>
                  </button>
                </div>

                {/* Voice-to-Text Recording Panel */}
                {showVoiceDictationPanel && (
                  <JournalVoiceDictation
                    onAppendContent={newChunk => {
                      setContent(prev => {
                        if (!prev) return newChunk;
                        const separator = prev.endsWith('\n') ? '' : prev.endsWith(' ') ? '' : ' ';
                        return prev + separator + newChunk;
                      });
                    }}
                    onSetTitle={newTitle => setTitle(newTitle)}
                    currentContent={content}
                    soundEngine={soundEngine}
                    autoStart={autoStartVoice}
                  />
                )}

                <textarea
                  rows={8}
                  required
                  placeholder="Express your thoughts, progress, health observations, or speak using the voice dictation panel above..."
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-sans leading-relaxed"
                />
              </div>

              {/* Draw and Paint Canvas Attachment (Screenshot 3) */}
              <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Paintbrush className="w-4 h-4 text-pink-500" />
                    <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                      Handwritten Sketch & Stickers
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowDrawingModal(true)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-pink-50 dark:bg-pink-950 text-pink-600 dark:text-pink-400 border border-pink-200 dark:border-pink-800 hover:bg-pink-100 text-xs font-semibold transition"
                  >
                    <PenTool className="w-3.5 h-3.5" />
                    <span>{currentDrawing ? 'Edit Drawing' : 'Draw / Paint'}</span>
                  </button>
                </div>

                {currentDrawing ? (
                  <div className="flex items-center gap-3 pt-1">
                    <div className="w-20 h-16 rounded-xl border border-slate-200 dark:border-slate-700 bg-white overflow-hidden p-1 shrink-0">
                      <img
                        src={currentDrawing}
                        alt="Canvas thumbnail"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] text-slate-600 dark:text-slate-400">
                        Custom sketch attached to this entry.
                      </p>
                      <button
                        type="button"
                        onClick={() => setCurrentDrawing(undefined)}
                        className="text-[10px] font-semibold text-rose-500 hover:underline"
                      >
                        Remove drawing
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500">
                    Add quick visual doodles, color pens, highlight strokes, or emotional stickers.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Health, Gratitude, Deep Work"
                  value={tagsInput}
                  onChange={e => setTagsInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              {/* Encryption toggle */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      End-to-End Encryption (AES-256)
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Encrypted in browser before disk or cloud storage
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={encryptThisEntry}
                  onChange={e => setEncryptThisEntry(e.target.checked)}
                  className="w-4 h-4 accent-indigo-600 rounded"
                />
              </div>

              <div className="mt-5 pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditorModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs active:scale-95 transition"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Calendar Sync & Integration Modal */}
      {showSyncModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Calendar Sync & Export
                </h3>
              </div>
              <button
                onClick={() => setShowSyncModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Sync your private reflections and daily journaling habits directly with Google Calendar, Notion Calendar, Apple Calendar, or any standard iCal application.
            </p>

            <div className="space-y-3">
              {/* Option 1: Download Standard .ICS */}
              <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-white">
                    <Download className="w-4 h-4 text-emerald-500" />
                    <span>Download iCalendar (.ics)</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Standard RFC 5545 calendar file. Import once into Google Calendar or Notion Calendar.
                  </p>
                </div>
                <button
                  onClick={handleDownloadIcs}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shrink-0 transition"
                >
                  Download .ics
                </button>
              </div>

              {/* Option 2: 1-Click Google Calendar */}
              <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-white">
                    <ExternalLink className="w-4 h-4 text-indigo-500" />
                    <span>Google Calendar Event</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Open Google Calendar in a new tab to create a recurring daily reflection slot.
                  </p>
                </div>
                <button
                  onClick={() => handleOpenGoogleCalendar()}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shrink-0 transition"
                >
                  Add to G-Cal
                </button>
              </div>

              {/* Option 3: Notion Calendar instructions */}
              <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-white">
                  <Sparkles className="w-4 h-4 text-violet-500" />
                  <span>Notion Calendar Setup Guide</span>
                </div>
                <ol className="list-decimal list-inside text-[11px] text-slate-500 space-y-1 pl-1">
                  <li>Download the <strong>.ics file</strong> using the button above.</li>
                  <li>Import it into your Google Calendar under <em>Settings &gt; Import &amp; Export</em>.</li>
                  <li>In <strong>Notion Calendar</strong>, connect your Google Calendar account to see all reflections synced automatically.</li>
                </ol>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowSyncModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vault Passphrase Modal */}
      {showPassphraseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-500" />
                Master Vault Passphrase
              </h3>
              <button
                onClick={() => setShowPassphraseModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePassphraseSubmit} className="mt-4 space-y-3 text-xs">
              <p className="text-slate-600 dark:text-slate-400 text-xs">
                Enter your secret master passphrase to derive the AES-256 cryptographic key:
              </p>
              <input
                type="password"
                required
                placeholder="Enter passphrase (e.g. secret-vault-123)"
                value={passphraseInput}
                onChange={e => setPassphraseInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
              {passphraseError && (
                <p className="text-rose-500 font-medium text-[11px]">{passphraseError}</p>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPassphraseModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold"
                >
                  Unlock Vault
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Note Lock & Unlock Modal */}
      <NoteLockModal
        isOpen={!!lockModalTarget}
        entry={lockModalTarget?.entry || null}
        mode={lockModalTarget?.mode || 'lock'}
        onClose={() => setLockModalTarget(null)}
        onConfirmLock={handleConfirmNoteLock}
        onSuccessUnlock={handleSuccessNoteUnlock}
      />

      {/* Draw and Paint Modal (Screenshot 3) */}
      <JournalDrawingModal
        isOpen={showDrawingModal}
        initialDrawing={currentDrawing}
        onClose={() => setShowDrawingModal(false)}
        onSave={(dataUrl) => {
          setCurrentDrawing(dataUrl);
          setShowDrawingModal(false);
          // If editor is not open, open it so user can save or describe the sketch
          if (!showEditorModal) {
            setShowEditorModal(true);
            setTitle(prev => prev || 'Visual Sketch & Reflection');
          }
        }}
      />

      {/* CBT Thought Record Modal (Screenshot 5) */}
      <CBTThoughtModal
        isOpen={showCBTModal}
        onClose={() => setShowCBTModal(false)}
        onSaveCBT={handleSaveCBT}
      />
    </div>
  );
};
