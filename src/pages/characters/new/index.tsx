import type { NextPageWithLayout } from "$src/pages/_app";
import type { GetServerSideProps } from "next";
import Head from "next/head";
import { unstable_getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { authOptions } from "$src/pages/api/auth/[...nextauth]";

interface PageProps {
  session: Session;
}

const NewCharacter: NextPageWithLayout<PageProps> = ({ session }) => {
  return (
    <>
      <Head>
        <title>New Character</title>
      </Head>
      <main className="container mx-auto flex flex-col items-center justify-center min-h-screen p-4">New Character</main>
    </>
  );
};

NewCharacter.getLayout = page => {
  return page;
};

export default NewCharacter;

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
