# AGENTS.md - iVibeFinance

## Project Overview

Full-stack SaaS application built with **Next.js 15 (App Router)**, featuring multi-language support (i18n), role-based permissions, and admin dashboard.

| Stack | Technology |
|-------|------------|
| Framework | Next.js 15 (App Router, Turbopack, PPR) |
| Language | TypeScript (strict mode) |
| Database | PostgreSQL + Drizzle ORM |
| Auth | Auth.js v5 (Google OAuth, Credentials, Magic Link) |
| i18n | next-intl (en, zh, ja) |
| Payments | Stripe |
| UI | shadcn/ui (new-york) + Tailwind CSS 4 |
| Package Manager | pnpm |

---

## Build/Lint/Test Commands

```bash
pnpm dev          # Start dev server with Turbopack
pnpm build        # Build for production
pnpm start        # Start production server

# Database
pnpm db:setup     # Run database setup script
pnpm db:seed      # Seed test data
pnpm db:generate  # Generate Drizzle migrations
pnpm db:migrate   # Run Drizzle migrations
pnpm db:studio    # Open Drizzle Studio
```

**Note:** No ESLint/Prettier configured. Follow existing code patterns.

---

## Project Structure

```
app/
├── [locale]/              # i18n routes (en, zh, ja)
│   ├── (auth)/            # Sign-in/sign-up
│   ├── (dashboard)/       # User dashboard
│   ├── (marketing)/       # Marketing pages
│   └── admin/             # Admin panel
├── api/                   # API routes
components/
├── admin/                 # Admin components
├── auth/                  # Auth components
├── common/                # Shared (LocaleSwitcher)
├── providers/             # Context providers
└── ui/                    # shadcn/ui components
lib/
├── auth/                  # Auth config, guards, middleware
├── db/                    # Drizzle schema, queries
└── payments/              # Stripe integration
messages/                  # Translation files (en.json, zh.json, ja.json)
```

---

## Code Style Guidelines

### Import Order

1. External packages first
2. Internal modules with `@/` alias
3. Group by category (components, lib, types)

```typescript
// External
import { z } from 'zod';
import { eq } from 'drizzle-orm';

// Internal
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Files | kebab-case | `admin-guard.ts`, `locale-switcher.tsx` |
| Components | PascalCase | `LoginForm`, `AdminSidebar` |
| Functions | camelCase | `getUser`, `signIn` |
| Constants | UPPER_SNAKE_CASE | `ROLES`, `SALT_ROUNDS` |
| Types/Interfaces | PascalCase | `User`, `TeamDataWithMembers` |
| Enums | PascalCase + UPPER values | `ActivityType.SIGN_IN` |

### TypeScript Patterns

**Infer types from Drizzle schema:**
```typescript
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
```

**Const assertions for enums:**
```typescript
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MEMBER: 'member',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];
```

### Component Patterns

**Server Components (default):**
```typescript
export const dynamic = 'force-dynamic';

import { setRequestLocale, getTranslations } from 'next-intl/server';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function Page({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('namespace');
  // ...
}
```

**Client Components:**
```typescript
'use client';

import { useTranslations } from 'next-intl';

export function Component({ locale }: { locale: string }) {
  const t = useTranslations('namespace');
  // ...
}
```

### Server Actions Pattern

```typescript
'use server';

import { z } from 'zod';
import { validatedAction } from '@/lib/auth/middleware';
import { redirect } from 'next/navigation';

const schema = z.object({
  email: z.string().email(),
});

export const myAction = validatedAction(schema, async (data, formData) => {
  // Return error object on failure (don't throw)
  if (error) {
    return { error: 'Error message', ...data };
  }
  redirect('/success');
});
```

### API Route Pattern

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 400 });
  }
}
```

### Error Handling

- **Server Actions:** Return error objects, never throw
- **API Routes:** Try-catch with `console.error` and JSON response
- **Guards:** Redirect on failure

```typescript
// Server Action
return { error: 'Invalid credentials', email, password };

// Guard
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user) redirect('/sign-in');
  if (!isAdmin(session.user.role)) redirect('/dashboard');
  return session;
}
```

### Database Queries (Drizzle ORM)

```typescript
// Select with joins
const result = await db
  .select({ user: users, team: teams })
  .from(users)
  .leftJoin(teamMembers, eq(users.id, teamMembers.userId))
  .where(eq(users.email, email));

// Insert with returning
const [created] = await db.insert(users).values(data).returning();

// Update
await db.update(teams).set({ ...data, updatedAt: new Date() }).where(eq(teams.id, id));
```

### Styling

Use `cn()` utility for conditional classes:
```typescript
import { cn } from '@/lib/utils';

<div className={cn(
  'flex items-center gap-3 px-3 py-2 rounded-lg',
  isActive ? 'bg-orange-600 text-white' : 'text-gray-300 hover:bg-gray-800'
)} />
```

### Internationalization

**Server:** `getTranslations()` from `next-intl/server`
**Client:** `useTranslations()` from `next-intl`

Always call `setRequestLocale(locale)` at the top of server components.

---

## Authentication & Authorization

**Roles:** `super_admin` > `admin` > `member`

**Guards (use in server components/actions):**
```typescript
await requireAuth();       // Must be logged in
await requireAdmin();      // admin or super_admin
await requireSuperAdmin(); // super_admin only
```

---

## Environment Variables

Required in `.env.local`:
```
POSTGRES_URL=postgresql://...
AUTH_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
BASE_URL=http://localhost:3000
```

---

## Key Conventions for Agents

1. **Use `@/` path alias** for all imports
2. **Prefer server components** - add `'use client'` only when needed
3. **Validate with Zod** - use `validatedAction` wrapper for server actions
4. **Return errors, don't throw** in server actions
5. **Always handle i18n** - use `setRequestLocale()` in page components
6. **Follow shadcn/ui patterns** for new UI components
7. **Use Drizzle relations** for complex queries
8. **Type everything** - infer from schema when possible
