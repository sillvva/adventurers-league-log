import { authOptions as nextAuthOptions } from "$src/pages/api/auth/[...nextauth]";
import { prisma } from "$src/server/db/client";
import { parseError } from "$src/utils/misc";
import type { NextApiHandler } from "next";
import { getServerSession as getServerSession } from "next-auth";

const handler: NextApiHandler = async function (req, res) {
  const session = await getServerSession(req, res, nextAuthOptions);

  if (!session || !session.user) return res.status(401).send("Unauthorized");

  try {
    const dmLogs = await prisma.log.findMany({
      where: {
        dm: { uid: session.user.id },
        is_dm_log: true
      },
      orderBy: { date: "asc" },
      include: {
        magic_items_gained: true,
        story_awards_gained: true,
        character: true
      }
    });
    
    res.status(200).json(dmLogs);
  } catch (err) {
    return res.status(500).json({ error: parseError(err) });
  }
};

export default handler;
