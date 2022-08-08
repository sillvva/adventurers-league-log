import type { NextPageWithLayout } from "../_app";
import Head from "next/head";
import { useRouter } from "next/router";
import { z } from "zod";
import { qsParse } from "../../utils/misc";
import { trpc } from "../../utils/trpc";

const Characters: NextPageWithLayout = () => {
  const router = useRouter();

  const { data: params } = qsParse(
    router.query,
    z.object({
      userId: z.string()
    })
  );

  const { data: characters } = trpc.useQuery(["characters.getAll", { userId: params.userId }], {
    ssr: true
  });

  if (!characters || !characters[0]) return null;

  return (
    <>
      <Head>
        <title>{characters[0].user.name}&apos;s Characters</title>
        <meta name="description" content="" />
      </Head>

      <main className="container mx-auto flex flex-col items-center justify-center min-h-screen p-4">
        <pre>{JSON.stringify(characters, null, 2)}</pre>
      </main>
    </>
  );
};

Characters.getLayout = page => {
  return page;
};

export default Characters;
