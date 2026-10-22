// Public Supabase credentials are safe in a browser bundle; private keys are not.
export function isPublicBookingKey(value) {
  if (typeof value !== 'string') return false;
  const key=value.trim();
  if(key.startsWith('sb_publishable_'))return key.length>'sb_publishable_'.length;
  try{
    const parts=key.split('.');
    return parts.length===3&&JSON.parse(atob(parts[1].replace(/-/g,'+').replace(/_/g,'/'))).role==='anon';
  }catch{return false;}
}
export function normalizeBookingUrl(value) {
  const url=value?.trim().replace(/\/+$/,'');
  return url&&/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url)?url:undefined;
}
