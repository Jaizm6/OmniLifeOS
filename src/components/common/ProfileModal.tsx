import React, { useState, useRef } from 'react';
import {
  X,
  User,
  Camera,
  Upload,
  Trash2,
  Check,
  Shield,
  Smartphone,
  Sparkles,
  Calendar,
  Activity,
  Heart,
  Mail,
  IndianRupee,
  DollarSign,
  Cloud,
  Flame,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { compressProfilePhoto, formatFileSize } from '../../utils/imageCompressor';
import { SupportedCurrency } from '../../types';
import { DEFAULT_AVATAR_PHOTO } from '../../utils/initialData';

export const ProfileModal: React.FC = () => {
  const {
    isAuthModalOpen,
    setIsAuthModalOpen,
    userProfile,
    updateUserProfile,
    pushNotification,
    setIsBackupModalOpen,
    currency,
    setCurrency,
    firebaseUser,
    loginWithGoogle,
  } = useApp();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states initialized from userProfile
  const [fullName, setFullName] = useState(userProfile.name || 'Jaiprakash');
  const [nickname, setNickname] = useState(userProfile.nickname || 'Jaiz');
  const [email, setEmail] = useState(userProfile.identifier || 'jaiprakashog@gmail.com');
  const [bio, setBio] = useState(userProfile.bio || 'Productive, mindful, and focused every day.');
  const [dob, setDob] = useState(userProfile.dateOfBirth || '1998-05-15');
  const [heightCm, setHeightCm] = useState(userProfile.heightCm || 175);
  const [weightKg, setWeightKg] = useState(userProfile.weightKg || 68);
  const [gender, setGender] = useState<'male' | 'female' | 'other' | 'unspecified'>(
    userProfile.gender || 'male'
  );
  const [avatarPhoto, setAvatarPhoto] = useState<string>(userProfile.avatarPhoto || '');
  const [twoFactor, setTwoFactor] = useState(userProfile.twoFactorEnabled);
  const [selectedCurrency, setSelectedCurrency] = useState<SupportedCurrency>(
    ((userProfile.preferredCurrency || currency || 'INR') as SupportedCurrency)
  );

  // Compression status feedback
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionStats, setCompressionStats] = useState<{
    original: string;
    compressed: string;
    reduction: number;
  } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isAuthModalOpen) return null;

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (JPG, PNG, WebP).');
      return;
    }

    try {
      setIsCompressing(true);
      setErrorMsg('');
      const res = await compressProfilePhoto(file, 256, 0.82);
      setAvatarPhoto(res.dataUrl);
      setCompressionStats({
        original: formatFileSize(res.originalSizeBytes),
        compressed: formatFileSize(res.compressedSizeBytes),
        reduction: res.reductionPercentage,
      });
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to compress image.');
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemovePhoto = () => {
    setAvatarPhoto('');
    setCompressionStats(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    updateUserProfile({
      name: fullName.trim() || 'Jaiprakash',
      nickname: nickname.trim() || 'Jaiz',
      identifier: email.trim() || 'jaiprakashog@gmail.com',
      avatarPhoto,
      bio: bio.trim(),
      dateOfBirth: dob,
      heightCm: Number(heightCm) || 175,
      weightKg: Number(weightKg) || 68,
      gender,
      twoFactorEnabled: twoFactor,
      preferredCurrency: selectedCurrency,
    });

    if (setCurrency && selectedCurrency) {
      setCurrency(selectedCurrency);
    }

    setSaveSuccess(true);
    pushNotification(
      'Profile Updated',
      `Saved details for ${nickname.trim() || fullName.trim()}.`,
      'system'
    );

    setTimeout(() => {
      setSaveSuccess(false);
      setIsAuthModalOpen(false);
    }, 900);
  };

  const displayName = nickname.trim() || fullName.trim().split(' ')[0] || 'User';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs p-3 sm:p-4 md:p-6 flex min-h-full items-center justify-center animate-in fade-in duration-150">
      <div className="w-full max-w-2xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                User Profile & Identity
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Personalize your display name, avatar photo, biometric 2FA, and health preferences
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsAuthModalOpen(false)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSave} className="p-4 sm:p-6 space-y-5 overflow-y-auto">
          {/* Avatar Photo Upload & Compression Banner */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/70 flex flex-col sm:flex-row items-center gap-4">
            {/* Avatar Preview */}
            <div className="relative group shrink-0">
              {avatarPhoto ? (
                <img
                  src={avatarPhoto}
                  alt={fullName}
                  className="w-20 h-20 rounded-full object-cover ring-3 ring-indigo-500/60 shadow-md"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-2xl shadow-md ring-3 ring-indigo-300 dark:ring-indigo-700">
                  {nickname ? nickname[0].toUpperCase() : fullName[0]?.toUpperCase() || 'U'}
                </div>
              )}

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isCompressing}
                title="Upload & compress photo"
                className="absolute bottom-0 right-0 p-1.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition border-2 border-white dark:border-slate-900 cursor-pointer active:scale-95"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Photo Details & Controls */}
            <div className="flex-1 text-center sm:text-left space-y-1.5">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  Profile Photo
                </h4>
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full">
                  Auto-Compressed &bull; Ultra-Lightweight
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Photos are automatically cropped to square, resized to 256&times;256, and compressed to ~15–25 KB so your data stays nimble and loads instantly.
              </p>

              {/* Compression feedback indicator */}
              {compressionStats && (
                <div className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-indigo-500" />
                  <span>
                    Compressed: {compressionStats.original} &rarr; <strong>{compressionStats.compressed}</strong> ({compressionStats.reduction}% lighter)
                  </span>
                </div>
              )}

              <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isCompressing}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isCompressing ? 'Compressing...' : 'Choose Photo'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAvatarPhoto(DEFAULT_AVATAR_PHOTO);
                    setCompressionStats(null);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 font-semibold text-xs border border-emerald-200 dark:border-emerald-800 transition flex items-center gap-1 cursor-pointer"
                  title="Use default illustrated avatar"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Preset</span>
                </button>

                {avatarPhoto && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-950 dark:hover:text-rose-400 text-slate-700 dark:text-slate-200 font-semibold text-xs transition flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 text-xs border border-rose-200 dark:border-rose-800">
              {errorMsg}
            </div>
          )}

          {/* Core Names Grid: Full Name & Nickname / Display Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Jaiprakash"
                className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-[10px] text-slate-400">Formal legal name on records</span>
            </div>

            {/* Nickname / Display Name */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Nickname / Display Name
                </label>
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-1.5 py-0.2 rounded">
                  Active in UI
                </span>
              </div>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="e.g. Jaiz"
                className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-indigo-300 dark:border-indigo-700 text-slate-900 dark:text-white font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500 ring-1 ring-indigo-500/20"
              />
              <span className="text-[10px] text-indigo-600 dark:text-indigo-400">
                Shown in top navbar, greeting &ldquo;Hello {displayName}&rdquo;, and AI companion
              </span>
            </div>
          </div>

          {/* Email & Bio */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>Account Email</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jaiprakashog@gmail.com"
                className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-slate-400" />
                <span>Personal Bio / Focus Mantra</span>
              </label>
              <input
                type="text"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="e.g. Focus, execute, conquer the day"
                className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Physical Stats & Currency Section */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700/70 bg-slate-50/60 dark:bg-slate-800/30 space-y-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-emerald-500" />
              <span>Health Metrics & Currency Preferences</span>
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                  Birthdate
                </label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                  Gender
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="unspecified">Unspecified</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                  Height (cm)
                </label>
                <input
                  type="number"
                  value={heightCm}
                  onChange={(e) => setHeightCm(Number(e.target.value))}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                  Weight (kg)
                </label>
                <input
                  type="number"
                  value={weightKg}
                  onChange={(e) => setWeightKg(Number(e.target.value))}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-mono"
                />
              </div>
            </div>

            {/* Currency Selector */}
            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                  Preferred Currency
                </span>
                <span className="text-[10px] text-slate-500">
                  Used for Bills, Subscriptions &amp; Expense tracking
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {[
                  { code: 'INR' as const, label: '₹ INR (Rupee)' },
                  { code: 'USD' as const, label: '$ USD' },
                  { code: 'EUR' as const, label: '€ EUR' },
                  { code: 'GBP' as const, label: '£ GBP' },
                ].map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => setSelectedCurrency(c.code)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                      selectedCurrency === c.code
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 2FA Security Row */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  Two-Factor Authentication (2FA)
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Require one-time TOTP verification code for account logins
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={twoFactor}
              onChange={(e) => setTwoFactor(e.target.checked)}
              className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
            />
          </div>

          {/* Firebase Cloud Sync & Google Auth */}
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  Firebase Cloud Database &amp; Auth
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {firebaseUser
                    ? `Connected as ${firebaseUser.email || firebaseUser.displayName} (UID: ${firebaseUser.uid.slice(0, 8)}...)`
                    : 'Sign in with Google to enable real-time bi-directional mobile & web cloud sync'}
                </p>
              </div>
            </div>
            {!firebaseUser ? (
              <button
                type="button"
                onClick={async () => {
                  await loginWithGoogle();
                }}
                className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold shadow-xs transition flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Flame className="w-3.5 h-3.5 text-amber-500" />
                <span>Connect Google</span>
              </button>
            ) : (
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold border border-emerald-500/25 shrink-0 flex items-center gap-1">
                <Check className="w-3 h-3" />
                <span>Cloud Connected</span>
              </span>
            )}
          </div>

          {/* Link to Cloud Backup */}
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
            <span className="flex items-center gap-1.5">
              <Cloud className="w-3.5 h-3.5 text-indigo-500" />
              <span>Target Sync Account: <strong>{email}</strong></span>
            </span>
            <button
              type="button"
              onClick={() => {
                setIsAuthModalOpen(false);
                setIsBackupModalOpen(true);
              }}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              <span>Manage Backups &amp; Snapshots &rarr;</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5 active:scale-95"
            >
              {saveSuccess ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>Saved!</span>
                </>
              ) : (
                <span>Save Profile</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
