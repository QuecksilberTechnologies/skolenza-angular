export interface SettingsData {
  brandIdentity: BrandIdentityData;
  appearance: AppearanceData;
  languageRegion: LanguageRegionData;
  notifications: NotificationsData;
}

export type LogoVariantKey = 'darkSmall' | 'darkLarge' | 'lightSmall' | 'lightLarge' | 'favicon';

export interface LogoVariant {
  url: string | null;
}

export interface BrandIdentityData {
  organizationName: string;
  logos: Record<LogoVariantKey, LogoVariant>;
}

export interface AppearanceData {
  accentColor: string;
  themeMode: 'light' | 'dark';
}

export interface LanguageRegionData {
  language: string;
  dateFormat: string;
  timeFormat: string;
  timezone: string;
}

export interface NotificationsData {
  approvals: boolean;
  recruitment: boolean;
  compliance: boolean;
  payroll: boolean;
}

export interface AccentColorOption {
  name: string;
  value: string;
}

export interface LanguageOption {
  name: string;
  code: string;
  countryCode: string;
}

export interface DateFormatOption {
  label: string;
  value: string;
}

export interface TimeFormatOption {
  label: string;
  value: string;
}

export interface TimezoneOption {
  label: string;
  value: string;
}

export const ACCENT_COLORS: AccentColorOption[] = [
  // Rendered inline in the Appearance panel — keep first and in this order.
  { name: 'Ocean Blue', value: '#4287f5' },
  { name: 'Graphite', value: '#475569' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Amber', value: '#f59e0b' },
  // Extended palette — available in the color picker popup.
  { name: 'Slate', value: '#64748b' },
  { name: 'Charcoal', value: '#334155' },
  { name: 'Cyan', value: '#22b8cf' },
  { name: 'Violet', value: '#6d28d9' },
  { name: 'Sky', value: '#0284c7' },
  { name: 'Fuchsia', value: '#ec0f73' },
  { name: 'Blue', value: '#2563eb' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Aqua', value: '#38bdf8' },
  { name: 'Purple', value: '#7c3aed' },
  { name: 'Royal Blue', value: '#1d4ed8' },
  { name: 'Magenta', value: '#c2185b' },
  { name: 'Lime', value: '#84cc16' },
  { name: 'Ink', value: '#111827' },
  { name: 'Yellow', value: '#facc15' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Salmon', value: '#f87171' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Maroon', value: '#991b1b' },
  { name: 'Pink', value: '#f472b6' },
  { name: 'Silver', value: '#d4d4d8' },
  { name: 'Bronze', value: '#c2740b' },
  { name: 'Teal', value: '#06b6d4' },
  { name: 'Forest', value: '#15803d' },
];

export const QUICK_ACCENT_COLORS: AccentColorOption[] = ACCENT_COLORS.slice(0, 6);

export const LANGUAGES: LanguageOption[] = [
  { name: 'English (United States)', code: 'en-US', countryCode: 'US' },
  { name: 'English (United Kingdom)', code: 'en-GB', countryCode: 'GB' },
  { name: 'Español', code: 'es', countryCode: 'ES' },
  { name: 'Français', code: 'fr', countryCode: 'FR' },
  { name: 'Deutsch', code: 'de', countryCode: 'DE' },
  { name: 'हिन्दी', code: 'hi', countryCode: 'IN' },
  { name: '中文', code: 'zh', countryCode: 'CN' },
  { name: 'العربية', code: 'ar', countryCode: 'AE' },
  { name: 'Português', code: 'pt', countryCode: 'BR' },
  { name: '日本語', code: 'ja', countryCode: 'JP' },
];

export const DATE_FORMATS: DateFormatOption[] = [
  { label: 'MM/DD/YYYY (12/31/2023)', value: 'MM/DD/YYYY' },
  { label: 'DD/MM/YYYY (31/12/2023)', value: 'DD/MM/YYYY' },
  { label: 'YYYY-MM-DD (2023-12-31)', value: 'YYYY-MM-DD' },
];

export const TIME_FORMATS: TimeFormatOption[] = [
  { label: '12-hour (2:30 PM)', value: '12h' },
  { label: '24-hour (14:30)', value: '24h' },
];

export const TIMEZONES: TimezoneOption[] = [
  { label: '(UTC-08:00) Pacific Time (US & Canada)', value: 'America/Los_Angeles' },
  { label: '(UTC-05:00) Eastern Time (US & Canada)', value: 'America/New_York' },
  { label: '(UTC+00:00) London, Edinburgh, Dublin', value: 'Europe/London' },
  { label: '(UTC+01:00) Paris, Berlin, Rome', value: 'Europe/Paris' },
  { label: '(UTC+05:30) Mumbai, New Delhi', value: 'Asia/Kolkata' },
  { label: '(UTC+08:00) Singapore, Perth', value: 'Asia/Singapore' },
];

export const MOCK_SETTINGS: SettingsData = {
  brandIdentity: {
    organizationName: 'Acme Corporation',
    logos: {
      darkSmall: { url: null },
      darkLarge: { url: null },
      lightSmall: { url: null },
      lightLarge: { url: null },
      favicon: { url: null },
    },
  },
  appearance: {
    accentColor: '#4287f5',
    themeMode: 'light',
  },
  languageRegion: {
    language: 'en-US',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
    timezone: 'America/New_York',
  },
  notifications: {
    approvals: true,
    recruitment: true,
    compliance: false,
    payroll: true,
  },
};

export interface LogoVariantConfig {
  key: LogoVariantKey;
  label: string;
  description: string;
  bgClass: string;
  accept?: string;
}

export interface SettingsTab {
  route: string;
  label: string;
  icon: string;
  description: string;
  pro?: boolean;
  /** Org-wide configuration — hidden from everyone but a super admin. */
  superAdminOnly?: boolean;
  /** Each control saves itself, so the shared Save/Discard footer does not apply. */
  autoSave?: boolean;
}
