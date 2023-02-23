// src/server/router/context.ts
import * as trpc from "@trpc/server";
import * as trpcNext from "@trpc/server/adapters/next";
import { getServerSession as getServerSession } from "next-auth";

import { authOptions as nextAuthOptions } from "$src/pages/api/auth/[...nextauth]";
import { prisma } from "../db/client";

export const createContext = async (
  opts?: trpcNext.CreateNextContextOptions,
) => {
  const req = opts?.req;
  const res = opts?.res;

  const session =
    req && res && (await getServerSession(req, res, nextAuthOptions));

  return {
    req,
    res,
    session,
    prisma,
  };
};

type Context = trpc.inferAsyncReturnType<typeof createContext>;

export const createRouter = () => trpc.router<Context>();
