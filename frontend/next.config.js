// Save as: frontend/next.config.js

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost', 'oaidalleapiprodscus.blob.core.windows.net'],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
  },
}

module.exports = nextConfig