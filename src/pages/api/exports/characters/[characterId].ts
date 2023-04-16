import { authOptions as nextAuthOptions } from "$src/pages/api/auth/[...nextauth]";
import { prisma } from "$src/server/db/client";
import { getAll, getOne } from "$src/server/router/routers/characters";
import { parseError } from "$src/utils/misc";
import type { NextApiHandler } from "next";
import { getServerSession as getServerSession } from "next-auth";

const handler: NextApiHandler = async function (req, res) {
  const session = await getServerSession(req, res, nextAuthOptions);

  if (!session || !session.user) return res.status(401).send("Unauthorized");
  const { characterId } = req.query;

  try {
    if (characterId === "all") {
      const characters = await getAll(prisma, session.user.id);
      return res.status(200).json(characters);
    } else {
      if (typeof characterId !== "string") return res.status(400).json({ message: "Invalid characterId" });
      const character = await getOne(prisma, characterId);
      return res.status(200).json(character);
    }
  } catch (err) {
    return res.status(500).json({ error: parseError(err) });
  }
};

export default handler;
