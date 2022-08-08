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
      id: z.string()
    })
  );

  const { data: character } = trpc.useQuery(["characters.getOne", { id: params.id }], {
    ssr: true
  });

  if (!character) return null;

  return (
    <>
      <Head>
        <title>{character.name}</title>
        <meta name="description" content="" />
      </Head>

      <main className="container mx-auto flex flex-col items-center justify-center min-h-screen p-4">
        <pre>{JSON.stringify(character, null, 2)}</pre>
      </main>
    </>
  );
};

Characters.getLayout = page => {
  return page;
};

export default Characters;
