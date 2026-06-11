import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'
import { checkLoginRateLimit, resetLoginAttempts } from './ratelimit'

// Compared against when the email doesn't exist, so unknown accounts take the
// same time to reject as wrong passwords (prevents user enumeration by timing).
const DUMMY_HASH = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null

        const forwarded = req?.headers?.['x-forwarded-for'] as string | undefined
        const ip =
          forwarded?.split(',')[0]?.trim() ||
          (req?.headers?.['x-real-ip'] as string | undefined) ||
          'unknown'

        const { allowed } = checkLoginRateLimit(ip)
        if (!allowed) return null

        let user
        try {
          user = await prisma.user.findUnique({
            where: { email: credentials.email },
          })
        } catch (err) {
          console.error('[auth] DB error during login:', err)
          return null
        }

        const valid = await bcrypt.compare(credentials.password, user?.password ?? DUMMY_HASH)
        if (!user || !valid) return null

        resetLoginAttempts(ip)

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          hotelId: user.hotelId,
        }
      },
    }),
  ],
  session: { strategy: 'jwt', maxAge: 24 * 60 * 60 },
  pages: { signIn: '/login' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
        token.hotelId = (user as any).hotelId
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id
        ;(session.user as any).role = token.role
        ;(session.user as any).hotelId = token.hotelId
      }
      return session
    },
  },
}
