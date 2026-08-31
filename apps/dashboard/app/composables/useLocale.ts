import { computed, ref } from 'vue'

/**
 * Interface language, without an i18n framework.
 *
 * No route prefixes and no extra module: the dashboard is behind a login, so
 * there is nothing to index per language and no reason to fork every URL. The
 * choice lives in one place and the pages read from it.
 *
 * Falls back key-by-key to English rather than per language, so a half-finished
 * translation shows English for what it is missing instead of nothing.
 */

export const LOCALES = ['nl', 'en', 'de', 'fr'] as const
export type Locale = (typeof LOCALES)[number]

export const LOCALE_LABELS: Record<Locale, string> = {
  nl: 'Nederlands',
  en: 'English',
  de: 'Deutsch',
  fr: 'Français',
}

const STORAGE_KEY = 'dashboard.locale'
const FALLBACK: Locale = 'en'

type Messages = Record<string, Partial<Record<Locale, string>> & { en: string }>

const MESSAGES: Messages = {
  'auth.signIn.title': { en: 'Sign in', nl: 'Inloggen', de: 'Anmelden', fr: 'Connexion' },
  'auth.signIn.blurb': {
    en: 'Manage websites and commerce in one place.',
    nl: 'Beheer websites en verkoop op één plek.',
    de: 'Websites und Handel an einem Ort verwalten.',
    fr: 'Gérez sites et commerce au même endroit.',
  },
  'auth.register.title': {
    en: 'Create your workspace',
    nl: 'Maak je werkomgeving',
    de: 'Arbeitsbereich erstellen',
    fr: 'Créez votre espace',
  },
  'auth.register.blurb': {
    en: 'One account can own multiple websites. Sign up with Google asks for Business Profile, Search Console, Analytics, Ads and Gmail so the workspace is ready — rename anytime in Settings.',
    nl: 'Eén account kan meerdere websites hebben. Aanmelden met Google vraagt om Bedrijfsprofiel, Search Console, Analytics, Ads en Gmail, zodat de werkomgeving meteen klaarstaat — de naam wijzig je later in Instellingen.',
    de: 'Ein Konto kann mehrere Websites besitzen. Die Anmeldung mit Google fragt Unternehmensprofil, Search Console, Analytics, Ads und Gmail ab, damit der Arbeitsbereich bereit ist — Umbenennen jederzeit in den Einstellungen.',
    fr: 'Un compte peut posséder plusieurs sites. L’inscription avec Google demande Profil d’établissement, Search Console, Analytics, Ads et Gmail pour préparer l’espace — renommez-le à tout moment dans les Réglages.',
  },
  'auth.google.signIn': {
    en: 'Continue with Google', nl: 'Doorgaan met Google',
    de: 'Weiter mit Google', fr: 'Continuer avec Google',
  },
  'auth.google.signUp': {
    en: 'Sign up with Google', nl: 'Aanmelden met Google',
    de: 'Mit Google registrieren', fr: 'S’inscrire avec Google',
  },
  'auth.or': { en: 'OR', nl: 'OF', de: 'ODER', fr: 'OU' },
  'auth.field.name': { en: 'Your name', nl: 'Je naam', de: 'Dein Name', fr: 'Votre nom' },
  'auth.field.company': { en: 'Company name', nl: 'Bedrijfsnaam', de: 'Firmenname', fr: 'Nom de l’entreprise' },
  'auth.field.companyHint': {
    en: 'Optional. You can rename the workspace later in Settings.',
    nl: 'Optioneel. Je kunt de werkomgeving later hernoemen in Instellingen.',
    de: 'Optional. Du kannst den Arbeitsbereich später umbenennen.',
    fr: 'Facultatif. Vous pourrez renommer l’espace plus tard.',
  },
  'auth.field.email': { en: 'E-mail', nl: 'E-mailadres', de: 'E-Mail', fr: 'E-mail' },
  'auth.field.password': { en: 'Password', nl: 'Wachtwoord', de: 'Passwort', fr: 'Mot de passe' },
  'auth.field.passwordHint': {
    en: 'At least 12 characters. Length beats symbols.',
    nl: 'Minimaal 12 tekens. Lengte telt zwaarder dan tekens.',
    de: 'Mindestens 12 Zeichen. Länge schlägt Sonderzeichen.',
    fr: 'Au moins 12 caractères. La longueur prime.',
  },
  'auth.submit.signIn': { en: 'Sign in', nl: 'Inloggen', de: 'Anmelden', fr: 'Se connecter' },
  'auth.submit.register': {
    en: 'Create workspace', nl: 'Werkomgeving aanmaken',
    de: 'Arbeitsbereich erstellen', fr: 'Créer l’espace',
  },
  'auth.switch.toRegister': { en: 'No account yet?', nl: 'Nog geen account?', de: 'Noch kein Konto?', fr: 'Pas encore de compte ?' },
  'auth.switch.toSignIn': { en: 'Already have an account?', nl: 'Heb je al een account?', de: 'Schon ein Konto?', fr: 'Déjà un compte ?' },
  'auth.switch.createOne': { en: 'Create one', nl: 'Maak er een', de: 'Erstellen', fr: 'En créer un' },
  'auth.switch.signIn': { en: 'Sign in', nl: 'Inloggen', de: 'Anmelden', fr: 'Se connecter' },
  'auth.language': { en: 'Language', nl: 'Taal', de: 'Sprache', fr: 'Langue' },
}

function isLocale(value: string | null | undefined): value is Locale {
  return LOCALES.some((candidate) => candidate === value)
}

function detect(): Locale {
  if (typeof window === 'undefined') return FALLBACK
  const stored = window.localStorage?.getItem(STORAGE_KEY)
  if (isLocale(stored)) return stored
  const preferred = navigator.language?.slice(0, 2).toLowerCase()
  return isLocale(preferred) ? preferred : FALLBACK
}

const current = ref<Locale>(FALLBACK)
let detected = false

export function useLocale() {
  // Detection runs in the browser only; on the server every visitor would share
  // whatever the first request happened to set.
  if (!detected && typeof window !== 'undefined') {
    current.value = detect()
    detected = true
  }

  function setLocale(locale: Locale) {
    current.value = locale
    try {
      window.localStorage?.setItem(STORAGE_KEY, locale)
    } catch {
      // Private windows refuse storage; the choice still applies to this visit.
    }
  }

  function t(key: keyof typeof MESSAGES | string): string {
    const entry = MESSAGES[key]
    if (!entry) return String(key)
    return entry[current.value] ?? entry.en
  }

  return { locale: computed(() => current.value), setLocale, t }
}
