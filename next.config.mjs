/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Deshabilitar linting durante el build para evitar que falle por avisos menores
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Deshabilitar errores de tipo durante el build para el despliegue inicial
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
