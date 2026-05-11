const requiredServerEnv = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY"
] as const;

export function getPublicSupabaseEnv() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? ""
  };
}

export function getServerSupabaseEnv() {
  const missing = requiredServerEnv.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing Supabase environment variable(s): ${missing.join(", ")}`);
  }

  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY as string,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY as string
  };
}
