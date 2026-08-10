import nextConfig from "eslint-config-next";

const config = [
  { ignores: [".next/**", ".claude/**", "node_modules/**", "supabase/functions/**"] },
  ...nextConfig,
];

export default config;
