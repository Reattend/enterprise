import { normalizeGmail } from './gmail'
import { normalizeGoogleDrive } from './google-drive'
import { normalizeSlack } from './slack'
import { normalizeNotion } from './notion'
import { normalizeConfluence } from './confluence'
import type { NangoNormalizer } from '../normalize'

// Lookup: providerConfigKey (as registered in Nango) → normalizer.
// Missing keys fall through to the generic passthrough normalizer.
const byProviderConfigKey: Record<string, NangoNormalizer> = {
  'google-mail': normalizeGmail,
  'gmail': normalizeGmail,
  'google-drive': normalizeGoogleDrive,
  'slack': normalizeSlack,
  'notion': normalizeNotion,
  'confluence': normalizeConfluence,
}

export function getNormalizer(providerConfigKey: string): NangoNormalizer | null {
  return byProviderConfigKey[providerConfigKey] ?? null
}
