import Layout from "$src/layouts/main";
import { authOptions } from "$src/pages/api/auth/[...nextauth]";
import { inferQueryOutput, trpc } from "$src/utils/trpc";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { mdiDotsHorizontal, mdiHome } from "@mdi/js";
import Icon from "@mdi/react";
import MiniSearch from "minisearch";
import type { GetServerSideProps } from "next";
import type { Session } from "next-auth";
import { unstable_getServerSession } from "next-auth";
import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { NextPageWithLayout } from "../_app";

const minisearch = new MiniSearch({
  fields: ["characterName", "campaign", "race", "class", "magicItems"],
  idField: "characterId",
  searchOptions: {
    boost: { characterName: 2 },
    prefix: true
  }
});

interface PageProps {
  session: Session;
}

const Characters: NextPageWithLayout<PageProps> = ({ session }) => {
  const [parent] = useAutoAnimate<HTMLTableSectionElement>();
  const [search, setSearch] = useState("");
  const [indexed, setIndexed] = useState<{ characterId: string; characterName: string; race: string; class: string; campaign: string; magicItems: string }[]>(
    []
  );
  const [results, setResults] = useState<inferQueryOutput<"characters.getAll">>([]);
  const { data: characters, isFetching } = trpc.useQuery(["characters.getAll", { userId: session.user?.id || "" }], {
    enabled: !!session.user,
    refetchOnWindowFocus: false
  });

  useEffect(() => {
    if (characters) {
      setIndexed(
        characters.map(character => ({
          characterId: character.id,
          characterName: character.name,
          campaign: character.campaign || "",
          race: character.race || "",
          class: character.class || "",
          magicItems: character.logs
            .reduce((acc, log) => {
              if (!log.magic_items_gained.length) return acc;
              const itemNames = [...acc, ...log.magic_items_gained.map(item => item.name)];
              log.magic_items_lost.forEach(item => {
                const index = itemNames.indexOf(item.name);
                if (index > -1) itemNames.splice(index, 1);
              });
              return itemNames;
            }, [] as string[])
            .join(", ")
        }))
      );
    }
  }, [characters]);

  useEffect(() => {
    if (indexed.length) minisearch.addAll(indexed);
    return () => minisearch.removeAll();
  }, [indexed]);

  useEffect(() => {
    if (characters && indexed.length) {
      if (search.length) {
        const results = minisearch.search(search);
        setResults(
          characters
            .filter(character => results.find(result => result.id === character.id))
            .map(character => ({ ...character, score: results.find(result => result.id === character.id)?.score || character.name }))
            .sort((a, b) => (b.score > a.score ? 1 : -1))
        );
      } else {
        setResults(characters.sort((a, b) => (b.name > a.name ? 1 : -1)));
      }
    } else {
      setResults([]);
    }
  }, [indexed, search, characters]);

  return (
    <>
      <Head>{session.user ? <title>{session.user.name}&apos;s Characters</title> : <title>Characters</title>}</Head>

      <div className="flex flex-col gap-4">
        <div className="flex gap-4">
          <div className="text-sm breadcrumbs">
            <ul>
              <li>
                <Icon path={mdiHome} className="w-4" />
              </li>
              <li className="text-secondary drop-shadow-md">Characters</li>
            </ul>
          </div>
          {characters && characters.length > 0 && (
            <div className="flex-1 flex justify-end">
              <Link href="/characters/new">
                <a className="btn btn-primary btn-sm">New Character</a>
              </Link>
            </div>
          )}
          <div className="dropdown dropdown-end">
            <label tabIndex={1} className="btn btn-sm">
              <Icon path={mdiDotsHorizontal} size={1} />
            </label>
            <ul tabIndex={1} className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52">
              <li>
                <a download={`dm.json`} href={`/api/exports/characters/all`} target="_blank" rel="noreferrer noopener">
                  Export
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex gap-4">
          <input type="text" placeholder="Search" onChange={e => setSearch(e.target.value)} className="input input-bordered input-sm w-full max-w-xs" />
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
                results.map(character => (
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
