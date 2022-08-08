import type { NextPageWithLayout } from "../_app";
import Head from "next/head";
import { trpc } from "$src/utils/trpc";
import { useSession } from "next-auth/react";

const Characters: NextPageWithLayout = () => {
  const session = useSession();
  const { data: characters, isFetching } = trpc.useQuery(["characters.getAll", { userId: session.data?.user?.id }]);

  return (
    <>
      <Head>
        {session.data?.user ? (
          <title>{session.data.user.name}&apos;s Characters</title>
        ) : (
          <title>Characters</title>
        )}
      </Head>
      <main className="container mx-auto flex flex-col items-center justify-center min-h-screen p-4">
        {isFetching ? (
          <p>Loading...</p>
        ) : !characters || characters.length == 0 ? (
          <p>No characters found</p>
        ) : (
          <pre>{JSON.stringify(characters, null, 2)}</pre>
        )}
      </main>
    </>
  );
};

Characters.getLayout = page => {
  return page;
};

export default Characters;
