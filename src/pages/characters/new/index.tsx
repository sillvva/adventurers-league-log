import type { NextPageWithLayout } from "$src/pages/_app";
import type { GetServerSideProps } from "next";
import { unstable_getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { authOptions } from "$src/pages/api/auth/[...nextauth]";
import { mdiHome } from "@mdi/js";
import Head from "next/head";
import Link from "next/link";
import Layout from "$src/layouts/main";
import Icon from "@mdi/react";

interface PageProps {
  session: Session;
}

const NewCharacter: NextPageWithLayout<PageProps> = ({ session }) => {
  return (
    <>
      <Head>
        <title>New Character</title>
      </Head>

      <div className="text-sm breadcrumbs mb-4">
        <ul>
          <li><Icon path={mdiHome} className="w-4" /></li>
          <li>
            <Link href="/characters">
              <a className="text-neutral-content">Characters</a>
            </Link>
          </li>
          <li className="text-secondary">New</li>
        </ul>
      </div>

      <main className="container mx-auto flex justify-center p-4">New Character</main>
    </>
  );
};

NewCharacter.getLayout = page => {
  return <Layout>{page}</Layout>;
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
