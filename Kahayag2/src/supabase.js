import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ekcdbwuhnkbxzwnzltak.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrY2Rid3VobmtieHp3bnpsdGFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxMzUwMjQsImV4cCI6MjA5MzcxMTAyNH0.K45QFC6mSz3tG5odimVmFrq5OTTqJkf5AxkG3kQKjUA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Upload image to Supabase Storage
export const uploadImage = async (file, bucket = 'gallery') => {
  const fileName = `${Date.now()}_${file.name.replace(/\s/g, '_')}`;
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(fileName, file, { cacheControl: '3600', upsert: false });

  if (error) throw error;

  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(fileName);

  return urlData.publicUrl;
};

// Delete image from Supabase Storage
export const deleteImage = async (url, bucket = 'gallery') => {
  const fileName = url.split('/').pop();
  const { error } = await supabase.storage.from(bucket).remove([fileName]);
  if (error) console.error('Delete error:', error);
};
