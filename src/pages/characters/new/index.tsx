import type { NextPageWithLayout } from "$src/pages/_app";
import Head from "next/head";
import { useSession } from "next-auth/react";

const NewCharacter: NextPageWithLayout = () => {
  const session = useSession();

  return (
    <>
      <Head>{session.data?.user ? <title>{session.data.user.name}&apos;s Characters</title> : <title>Characters</title>}</Head>
      <main className="container mx-auto flex flex-col items-center justify-center min-h-screen p-4">New Character</main>
    </>
  );
};

NewCharacter.getLayout = page => {
  return page;
};

export default NewCharacter;
