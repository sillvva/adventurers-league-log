import type { NextPageWithLayout } from "../_app";
import type { GetServerSideProps } from "next";
import { trpc } from "$src/utils/trpc";
import { unstable_getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { authOptions } from "$src/pages/api/auth/[...nextauth]";
import { mdiHome } from "@mdi/js";
import Head from "next/head";
import Link from "next/link";
import Layout from "$src/layouts/main";
import Icon from "@mdi/react";
import { useAutoAnimate } from "@formkit/auto-animate/react";

interface PageProps {
  session: Session;
}

const Characters: NextPageWithLayout<PageProps> = ({ session }) => {
  const [parent] = useAutoAnimate<HTMLTableSectionElement>();
  const { data: characters, isFetching } = trpc.useQuery(["characters.getAll", { userId: session.user?.id || "" }], {
    enabled: !!session.user,
    refetchOnWindowFocus: false
  });

  // const testCharacters = [{
  //   id: "1",
  //   name: "Test Character 1",
  //   image_url: "",
  //   race: "Dwarf",
  //   class: "Fighter",
  //   campaign: "Forgotten Realms",
  //   total_level: 3,
  //   tier: 1
  // }]

  return (
    <>
      <Head>{session.user ? <title>{session.user.name}&apos;s Characters</title> : <title>Characters</title>}</Head>

      <div className="flex">
        <div className="text-sm breadcrumbs mb-4">
          <ul>
            <li>
              <Icon path={mdiHome} className="w-4" />
            </li>
            <li className="text-secondary">Characters</li>
          </ul>
        </div>
        {characters && characters.length > 0 && (
          <div className="flex-1 flex justify-end">
            <Link href="/characters/new">
              <a className="btn btn-primary btn-sm">New Character</a>
            </Link>
          </div>
        )}
      </div>

      <div className="overflow-x-auto w-full rounded-lg">
        <table className="table table-compact w-full">
          <thead className="hidden sm:table-header-group">
            <tr>
              <th className="w-12"></th>
              <th>Name</th>
              <th>Campaign</th>
              <th className="text-center">Tier</th>
              <th className="text-center">Level</th>
            </tr>
          </thead>
          <tbody ref={parent}>
            {isFetching ? (
              <tr>
                <td colSpan={5} className="text-center py-20">
                  Loading...
                </td>
              </tr>
            ) : !characters || characters.length == 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-20">
                  <p className="mb-4">You have no log sheets.</p>
                  <p>
                    <Link href="/characters/new">
                      <a className="btn btn-primary">Create one now</a>
                    </Link>
                  </p>
                </td>
              </tr>
            ) : (
              characters.map(character => (
                <Link key={character.id} href={`/characters/${character.id}`}>
                  <tr className="hover cursor-pointer img-grow">
                    <td className="w-12 pr-0 sm:pr-2 transition-colors">
                      <div className="avatar">
                        <div className="mask mask-squircle w-12 h-12 bg-primary">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={character.image_url || ""}
                            width={48}
                            height={48}
                            className="object-cover object-top hover:scale-125 transition-all"
                            alt={character.name}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="transition-colors">
                      <div className="flex flex-col">
                        <div className="text-base sm:text-xl font-bold text-primary-content">{character.name}</div>
                        <div className="text-xs sm:text-sm text-neutral-content mb-2">
                          {character.race} {character.class}
                          <span className="inline sm:hidden"> (Level {character.total_level})</span>
                        </div>
                        <div className="block sm:hidden text-xs">
                          <p>{character.campaign}</p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden sm:table-cell transition-colors">{character.campaign}</td>
                    <td className="text-center hidden sm:table-cell transition-colors">{character.tier}</td>
                    <td className="text-center hidden sm:table-cell transition-colors">{character.total_level}</td>
                  </tr>
                </Link>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
};

Characters.getLayout = page => {
  return <Layout>{page}</Layout>;
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
