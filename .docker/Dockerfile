# syntax=docker/dockerfile:1

# ========================================
# Base image with Node.js 20
# ========================================
FROM node:20-alpine AS base

# Install dependencies only when needed
RUN apk add --no-cache libc6-compat

# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# ========================================
# Dependencies stage
# ========================================
FROM base AS deps

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# ========================================
# Build stage
# ========================================
FROM base AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Disable Next.js telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1

# Build arguments for environment variables needed at build time
ARG POSTGRES_URL
ARG AUTH_SECRET
ARG BASE_URL
ARG STRIPE_SECRET_KEY
ARG STRIPE_WEBHOOK_SECRET
ARG OPENROUTER_API_KEY
ARG OAUTH_GOOGLE_CLIENT_ID
ARG OAUTH_GOOGLE_CLIENT_SECRET

# Set environment variables for build
ENV POSTGRES_URL=${POSTGRES_URL}
ENV AUTH_SECRET=${AUTH_SECRET}
ENV BASE_URL=${BASE_URL}
ENV STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
ENV STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET}
ENV OPENROUTER_API_KEY=${OPENROUTER_API_KEY}
ENV OAUTH_GOOGLE_CLIENT_ID=${OAUTH_GOOGLE_CLIENT_ID}
ENV OAUTH_GOOGLE_CLIENT_SECRET=${OAUTH_GOOGLE_CLIENT_SECRET}

# Build the application
RUN pnpm build

# ========================================
# Production stage
# ========================================
FROM base AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public assets
COPY --from=builder /app/public ./public

# Set correct permissions for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Copy standalone build output
# Next.js outputs standalone build when output: 'standalone' is set
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy messages for i18n (next-intl needs these at runtime)
COPY --from=builder --chown=nextjs:nodejs /app/messages ./messages

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Set hostname
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

# Start the application
CMD ["node", "server.js"]
