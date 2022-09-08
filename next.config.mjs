
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
    domains: ["lh1.googleusercontent.com", "lh2.googleusercontent.com", "lh3.googleusercontent.com", "lh4.googleusercontent.com"]
  },
});
