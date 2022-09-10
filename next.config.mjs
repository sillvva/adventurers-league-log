
/**
 * Don't be scared of the generics here.
 * All they do is to give us autocompletion when using this.
 *
 * @template {import('next').NextConfig} T
 * @param {T} config - A generic parameter that flows through to the return type
 * @constraint {{import('next').NextConfig}}
 */
function defineNextConfig(config) {
  return config;
}

export default defineNextConfig({
  reactStrictMode: true,
  swcMinify: true,
	experimental: {
    newNextLinkBehavior: true
	},
  images: {
    remotePatterns: [
      {
        // The `src` property hostname must end with `.googleusercontent.com`,
        // otherwise the API will respond with 400 Bad Request.
        protocol: 'https',
        hostname: '**.googleusercontent.com',
      },
    ],
  },
});
