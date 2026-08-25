import type { SupabaseClient } from '@supabase/supabase-js'
import type { AppSettings } from '@/types'

const DEFAULT_TARGET_DOMAIN = 'expertiseaccelerated.com'

export async function getAppSettings(supabase: SupabaseClient): Promise<AppSettings> {
  const { data } = await supabase.from('app_settings').select('*').eq('id', true).maybeSingle()
  if (data) return data as unknown as AppSettings
  return {
    id: true,
    target_domain: DEFAULT_TARGET_DOMAIN,
    gsc_site_url: null,
    ga4_property_id: null,
    updated_by: null,
    updated_at: new Date(0).toISOString(),
  }
}
