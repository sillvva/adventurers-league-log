import type { NextPageWithLayout } from "../_app";
import type { GetServerSideProps } from "next";
import Head from "next/head";
import { trpc } from "$src/utils/trpc";
import { unstable_getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { authOptions } from "$src/pages/api/auth/[...nextauth]";
import Link from "next/link";
import Image from "next/image";

interface PageProps {
  session: Session;
}

const Characters: NextPageWithLayout<PageProps> = ({ session }) => {
  const { data: characters, isFetching } = trpc.useQuery(["characters.getAll", { userId: session.user?.id }], {
    enabled: !!session.user,
    refetchOnWindowFocus: false
  });

  return (
    <>
      <Head>{session.user ? <title>{session.user.name}&apos;s Characters</title> : <title>Characters</title>}</Head>
      <main className="container mx-auto flex justify-center p-4 max-w-5xl">
        <div className="overflow-x-auto w-full">
          <table className="table w-full">
            <thead>
              <tr>
                <th className="w-12"></th>
                <th>Name</th>
                <th>Campaign</th>
                <th className="text-center">Tier</th>
                <th className="text-center">Level</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {isFetching ? (
                <tr>
                  <td colSpan={6} className="text-center py-20">
                    Loading...
                  </td>
                </tr>
              ) : !characters || characters.length == 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-20">
                    <p className="mb-4">You have no characters.</p>
                    <p>
                      <a href="/characters/new" className="btn btn-primary">
                        Create one now
                      </a>
                    </p>
                  </td>
                </tr>
              ) : (
                characters.map(character => (
                  <Link key={character.id} href={`/characters/${character.id}`}>
                    <tr className="hover cursor-pointer">
                      <td>
                        <div className="avatar">
                          <div className="mask mask-squircle w-12 h-12 bg-primary">
                            <Image
                              src={character.image_url || ""}
                              width={48}
                              height={48}
                              layout="fill"
                              objectFit="cover"
                              objectPosition="center"
                              alt={character.name}
                            />
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-col">
                          <div className="text-2xl font-bold text-primary-content">{character.name}</div>
                          <div className="text-sm text-neutral-content mb-2">
                            {character.race} {character.class}
                          </div>
                        </div>
                      </td>
                      <td>{character.campaign}</td>
                      <td className="text-center">{character.tier}</td>
                      <td className="text-center">{character.total_level}</td>
                      <td></td>
                    </tr>
                  </Link>
                ))
              )}
            </tbody>
          </table>
        </div>
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
