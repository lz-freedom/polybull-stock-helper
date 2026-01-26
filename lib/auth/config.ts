import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import Nodemailer from 'next-auth/providers/nodemailer';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { comparePasswords } from './session';
import { ROLES, type Role } from './roles';

// 扩展 NextAuth 类型
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role: Role;
    };
  }

  interface User {
    role?: Role;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  pages: {
    signIn: '/sign-in',
    error: '/sign-in',
  },

  providers: [
    // 1. Google OAuth
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),

    // 2. 邮箱密码登录
    Credentials({
      id: 'credentials',
      name: 'Email & Password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        // 查找用户
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (!user || !user.passwordHash) {
          return null;
        }

        // 验证密码
        const isValid = await comparePasswords(password, user.passwordHash);
        if (!isValid) {
          return null;
        }

        return {
          id: String(user.id),
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role as Role,
        };
      },
    }),

    // 3. Magic Link (邮箱验证码登录) - 仅在配置了邮件服务器时启用
    ...(process.env.EMAIL_SERVER
      ? [
          Nodemailer({
            id: 'email',
            name: 'Magic Link',
            server: process.env.EMAIL_SERVER,
            from: process.env.EMAIL_FROM || 'noreply@example.com',
          }),
        ]
      : []),
  ],

  callbacks: {
    // JWT 回调：在 JWT 中添加用户信息
    async jwt({ token, user, account, trigger, session }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user.role as Role) || ROLES.MEMBER;
      }

      // 处理会话更新
      if (trigger === 'update' && session) {
        if (session.name) token.name = session.name;
        if (session.role) token.role = session.role;
      }

      // 如果是 OAuth 登录，从数据库获取用户信息
      if (account && account.provider !== 'credentials' && token.email) {
        const [dbUser] = await db
          .select()
          .from(users)
          .where(eq(users.email, token.email))
          .limit(1);

        if (dbUser) {
          token.id = String(dbUser.id);
          token.role = dbUser.role as Role;
        } else {
          // 新用户通过 OAuth 登录，创建用户记录
          const [newUser] = await db
            .insert(users)
            .values({
              email: token.email,
              name: token.name || null,
              image: token.picture || null,
              role: ROLES.MEMBER,
            })
            .returning();

          if (newUser) {
            token.id = String(newUser.id);
            token.role = newUser.role as Role;
          }
        }
      }

      return token;
    },

    // Session 回调：将 JWT 信息传递到 session
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
      }
      return session;
    },

    // 登录回调：控制谁可以登录
    async signIn({ user, account }) {
      // 允许所有 OAuth 登录
      if (account?.provider !== 'credentials') {
        return true;
      }

      // Credentials 登录已在 authorize 中验证
      return !!user;
    },
  },

  events: {
    // 用户登录时的处理
    async signIn({ user, account }) {
      console.log('User signed in:', user.email, 'via', account?.provider);
    },
  },
});
