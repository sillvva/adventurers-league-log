import type { NextPageWithLayout } from "../_app";
import type { GetServerSideProps } from "next";
import Head from "next/head";
import { trpc } from "$src/utils/trpc";
import { unstable_getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { authOptions } from "$src/pages/api/auth/[...nextauth]";

interface CharactersProps {
  session: Session;
}

const Characters: NextPageWithLayout<CharactersProps> = ({ session }) => {
  const { data: characters, isFetching } = trpc.useQuery(["characters.getAll", { userId: session.user?.id }], {
    enabled: !!session.user,
    refetchOnWindowFocus: false
  });

  return (
    <>
      <Head>
        {session.user ? (
          <title>{session.user.name}&apos;s Characters</title>
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

export const getServerSideProps: GetServerSideProps = async context => {
  const session = await unstable_getServerSession(context.req, context.res, authOptions);

  if (!session) {
    return {
      redirect: {
        destination: "/",
        permanent: false
      }
    };
  }

  return {
    props: {
      session
    }
  };
};