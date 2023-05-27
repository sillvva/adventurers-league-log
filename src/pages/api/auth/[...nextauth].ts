// Prisma adapter for NextAuth, optional and can be removed
import { env } from "$src/env/server.mjs";
import { prisma } from "$src/server/db/client";
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

import { PrismaAdapter } from "@next-auth/prisma-adapter";

import type { NextAuthOptions } from "next-auth";

export const authOptions: NextAuthOptions = {
	// Include user.id on session
	callbacks: {
		session({ session, user }) {
			if (session.user) {
				session.user.id = user.id;
			}
			return session;
		}
	},
	// Configure one or more authentication providers
	adapter: PrismaAdapter(prisma),
	providers: [
		GoogleProvider({
			clientId: env.GOOGLE_CLIENT_ID,
			clientSecret: env.GOOGLE_CLIENT_SECRET
		})
		// ...add more providers here
	]
};

export default NextAuth(authOptions);
