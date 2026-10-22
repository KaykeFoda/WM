import { defineConfig, loadEnv } from 'vite';
import { isPublicBookingKey, normalizeBookingUrl } from './src/lib/bookingConfig.js';

export default defineConfig(({mode})=>{
  const env=loadEnv(mode,process.cwd(),'VITE_');
  if(env.VITE_SUPABASE_ANON_KEY?.trim()&&!isPublicBookingKey(env.VITE_SUPABASE_ANON_KEY)){
    throw new Error('VITE_SUPABASE_ANON_KEY deve ser uma chave pública anon/publishable. Nunca use service_role ou sb_secret_ no frontend.');
  }
  if(env.VITE_SUPABASE_URL?.trim()&&!normalizeBookingUrl(env.VITE_SUPABASE_URL)){
    throw new Error('VITE_SUPABASE_URL deve ser a URL HTTPS do projeto Supabase, sem caminho adicional.');
  }
  return {};
});
