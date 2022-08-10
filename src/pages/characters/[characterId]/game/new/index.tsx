import type { NextPageWithLayout } from "$src/pages/_app";
import type { GetServerSideProps } from "next";
import { unstable_getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { useRouter } from "next/router";
import type { FormEventHandler } from "react";
import { useState } from "react";
import { authOptions } from "$src/pages/api/auth/[...nextauth]";
import { useForm } from "react-hook-form";
import { mdiHome, mdiTrashCan } from "@mdi/js";
import Icon from "@mdi/react";
import Head from "next/head";
import Link from "next/link";
import Layout from "$src/layouts/main";
import { inferQueryOutput, trpc } from "$src/utils/trpc";
import { z } from "zod";
import { concatenate } from "$src/utils/misc";
import { useQueryString } from "$src/utils/hooks";
import type { DungeonMaster, MagicItem } from "@prisma/client";

interface PageProps {
  session: Session;
}

export const gameSchema = z.object({
  characterId: z.string(),
  gameId: z.string().default(""),
  name: z.string().min(1),
  date: z
    .string()
    .regex(
      /^(-?(?:[1-9][0-9]*)?[0-9]{4})-(1[0-2]|0[1-9])-(3[01]|0[1-9]|[12][0-9])T(2[0-3]|[01][0-9]):([0-5][0-9]):([0-5][0-9])(\.[0-9]+)?(Z|[+-](?:2[0-3]|[01][0-9]):[0-5][0-9])?$/,
      "Not a valid date"
    ),
  experience: z.number().default(0),
  acp: z.number().default(0),
  tcp: z.number().default(0),
  level: z.number().default(0),
  gold: z.number().default(0),
  description: z.string().default(""),
  dm: z.object({
    id: z.string().default(""),
    name: z.string().min(1),
    DCI: z.number().nullable().default(null)
  }),
  magic_items_gained: z
    .array(
      z.object({
        id: z.string().default(""),
        name: z.string().min(1),
        description: z.string().default("")
      })
    )
    .default([]),
  magic_items_lost: z.array(z.string().min(1)).default([]),
  story_awards_gained: z
    .array(
      z.object({
        id: z.string().default(""),
        name: z.string().min(1),
        description: z.string().default("")
      })
    )
    .default([]),
  story_awards_lost: z.array(z.string().min(1)).default([])
});

const NewCharacter: NextPageWithLayout<PageProps> = ({ session }) => {
  const router = useRouter();
  const { data: params } = useQueryString(
    z.object({
      characterId: z.string()
    })
  );

  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    clearErrors,
    formState: { errors },
    getValues,
    setValue,
    setError
  } = useForm<z.infer<typeof gameSchema>>();

  const [season, setSeason] = useState<1 | 8 | 9>(9);
  const [magicItemsGained, setMagicItemsGained] = useState<z.infer<typeof gameSchema.shape.magic_items_gained>>([]);
  const [magicItemsLost, setMagicItemsLost] = useState<z.infer<typeof gameSchema.shape.magic_items_lost>>([]);
  const [storyAwardsGained, setStoryAwardsGained] = useState<z.infer<typeof gameSchema.shape.story_awards_gained>>([]);
  const [storyAwardsLost, setStoryAwardsLost] = useState<z.infer<typeof gameSchema.shape.story_awards_lost>>([]);

  const { data: character } = trpc.useQuery(["characters.getOne", { id: params.characterId }], {
    ssr: true,
    refetchOnWindowFocus: false
  });

  const mutation = trpc.useMutation(["_games.save"], {
    onSuccess() {
      router.push(`/characters/${params.characterId}`);
    }
  });

  const handleSubmit: FormEventHandler<HTMLFormElement> = e => {
    e.preventDefault();

    clearErrors();
    let errors = [];

    const values = getValues();

    try {
      if (!values.date) errors.push(setError("date", { message: "Required" }));
      else values.date = new Date(values.date.replace("T", " ")).toISOString();

      values.dm.DCI = values.dm.DCI ? parseInt(values.dm.DCI.toString()) : null;

      values.magic_items_gained = magicItemsGained;
      values.magic_items_lost = magicItemsLost;
      values.story_awards_gained = storyAwardsGained;
      values.story_awards_lost = storyAwardsLost;
    } catch (err) {
      console.error(err);
    }

    const result = gameSchema.safeParse(values);
    if (result.success) {
      setSubmitting(true);
      mutation.mutate(values);
    } else {
      result.error.issues.forEach(issue => {
        if (["date", "name", "dm.name", "description", "characterId", "experience", "acp", "tcp", "level", "gold"].includes(issue.path.join("."))) {
          setError(issue.path.join(".") as "date" | "name" | "dm.name" | "description" | "characterId" | "experience" | "acp" | "tcp" | "level" | "gold", {
            message: issue.message
          });
        }
        if (issue.path[0] == "magic_items_gained" && typeof issue.path[1] == "number" && issue.path[2] == "name") {
          setError(`magic_items_gained.${issue.path[1]}.name`, { message: issue.message });
        }
        if (issue.path[0] == "story_awards_gained" && typeof issue.path[1] == "number" && issue.path[2] == "name") {
          setError(`story_awards_gained.${issue.path[1]}.name`, { message: issue.message });
        }
      });
    }
  };

  const addMagicItem = () => setMagicItemsGained([...magicItemsGained, { id: "", name: "", description: "" }]);
  const removeMagicItem = (index: number) => setMagicItemsGained(magicItemsGained.filter((_, i) => i !== index));
  const addLostMagicItem = () => setMagicItemsLost([...magicItemsLost, ""]);
  const removeLostMagicItem = (index: number) => setMagicItemsLost(magicItemsLost.filter((_, i) => i !== index));

  const addStoryAward = () => setStoryAwardsGained([...storyAwardsGained, { id: "", name: "", description: "" }]);
  const removeStoryAward = (index: number) => setStoryAwardsGained(storyAwardsGained.filter((_, i) => i !== index));
  const addLostStoryAward = () => setStoryAwardsLost([...storyAwardsLost, ""]);
  const removeLostStoryAward = (index: number) => setStoryAwardsLost(storyAwardsLost.filter((_, i) => i !== index));

  const [dms, setDMs] = useState<DungeonMaster[]>([]);
  const getDMs = (prop: "name" | "DCI", value: string | number | null) => {
    if (!character || !value) return setDMs([]);

    const dms: DungeonMaster[] = [];
    character.games.forEach(game => {
      if (dms.find(dm => dm.id === game.dm.id)) return;
      const match = game.dm[prop]?.toString().includes(value.toString());
      if (match) dms.push(game.dm);
    });

    setDMs(dms);
  };

  const setDM = (dm: DungeonMaster) => {
    setValue("dm.id", dm.id);
    setValue("dm.name", dm.name);
    setValue("dm.DCI", dm.DCI);
  };

  if (!character)
    return (
      <Head>
        <title>New Game</title>
      </Head>
    );

  return (
    <>
      <Head>
        <title>New Game - {character.name}</title>
      </Head>

      <div className="text-sm breadcrumbs mb-4">
        <ul>
          <li>
            <Icon path={mdiHome} className="w-4" />
          </li>
          <li>
            <Link href="/characters">
              <a className="text-neutral-content">Characters</a>
            </Link>
          </li>
          <li>
            <Link href={`/characters/${params.characterId}`}>
              <a className="text-neutral-content">{character.name}</a>
            </Link>
          </li>
          <li className="text-secondary">New Game</li>
        </ul>
      </div>

      <form onSubmit={handleSubmit}>
        <input type="hidden" {...register("characterId", { value: params.characterId })} />
        <div className="grid grid-cols-12 gap-4">
          <div className="form-control col-span-12 sm:col-span-6">
            <label className="label">
              <span className="label-text">
                Title
                <span className="text-error">*</span>
              </span>
            </label>
            <input type="text" {...register("name", { required: true })} className="input input-bordered focus:border-primary w-full" />
            <label className="label">
              <span className="label-text-alt text-error">{errors.name?.message}</span>
            </label>
          </div>
          <div className="form-control col-span-12 sm:col-span-6">
            <label className="label">
              <span className="label-text">
                Date
                <span className="text-error">*</span>
              </span>
            </label>
            <input type="datetime-local" {...register("date", { required: true })} className="input input-bordered focus:border-primary w-full" />
            <label className="label">
              <span className="label-text-alt text-error">{errors.date?.message}</span>
            </label>
          </div>
          <input type="hidden" {...register("dm.id", { value: "" })} />
          <div className="form-control col-span-12 sm:col-span-6">
            <label className="label">
              <span className="label-text">
                DM Name
                <span className="text-error">*</span>
              </span>
            </label>
            <div className="dropdown">
              <label>
                <input
                  type="text"
                  {...register("dm.name", { required: true, onChange: e => getDMs("name", e.target.value) })}
                  className="input input-bordered focus:border-primary w-full"
                />
              </label>
              {dms.length > 0 && (
                <ul className="dropdown-content menu p-2 shadow bg-base-100 rounded-lg">
                  {dms.map(dm => (
                    <li key={dm.id}>
                      <a onMouseDown={() => setDM(dm)}>
                        {dm.name}
                        {dm.DCI && ` (${dm.DCI})`}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <label className="label">
              <span className="label-text-alt text-error">{errors.dm?.name?.message}</span>
            </label>
          </div>
          <div className="form-control col-span-12 sm:col-span-6">
            <label className="label">
              <span className="label-text">DM DCI</span>
            </label>
            <div className="dropdown">
              <label>
                <input
                  type="number"
                  {...register("dm.DCI", { onChange: e => getDMs("DCI", e.target.value) })}
                  className="input input-bordered focus:border-primary w-full"
                />
              </label>
              {dms.length > 0 && (
                <ul className="dropdown-content menu p-2 shadow bg-base-100 rounded-lg">
                  {dms.map(dm => (
                    <li key={dm.id}>
                      <a onMouseDown={() => setDM(dm)}>
                        {dm.name}
                        {dm.DCI && ` (${dm.DCI})`}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <label className="label">
              <span className="label-text-alt text-error">{errors.dm?.DCI?.message}</span>
            </label>
          </div>
          <div className="form-control col-span-12 sm:col-span-4">
            <label className="label">
              <span className="label-text">Season</span>
            </label>
            <select value={season} onChange={e => setSeason(parseInt(e.target.value) as 1 | 8 | 9)} className="select select-bordered w-full max-w-xs">
              <option value={9}>Season 9+</option>
              <option value={8}>Season 8</option>
              <option value={1}>Season 1-7</option>
            </select>
          </div>
          {season === 1 && (
            <div className="col-span-6 sm:col-span-4">
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Experience</span>
                </label>
                <input type="number" {...register("experience", { value: 0 })} className="input input-bordered focus:border-primary w-full" />
                <label className="label">
                  <span className="label-text-alt text-error">{errors.experience?.message}</span>
                </label>
              </div>
            </div>
          )}
          {season === 9 && (
            <div className="col-span-6 sm:col-span-4">
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Level</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max={20 - character.total_level}
                  {...register("level", { value: 0, min: 0, max: 20 - character.total_level })}
                  className="input input-bordered focus:border-primary w-full"
                />
                <label className="label">
                  <span className="label-text-alt text-error">{errors.level?.message}</span>
                </label>
              </div>
            </div>
          )}
          {season === 8 && (
            <>
              <div className="col-span-6 sm:col-span-2">
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text">ACP</span>
                  </label>
                  <input type="number" {...register("acp", { value: 0 })} className="input input-bordered focus:border-primary w-full" />
                  <label className="label">
                    <span className="label-text-alt text-error">{errors.acp?.message}</span>
                  </label>
                </div>
              </div>
              <div className="col-span-6 sm:col-span-2">
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text">TCP</span>
                  </label>
                  <input type="number" {...register("tcp", { value: 0 })} className="input input-bordered focus:border-primary w-full" />
                  <label className="label">
                    <span className="label-text-alt text-error">{errors.tcp?.message}</span>
                  </label>
                </div>
              </div>
            </>
          )}
          <div className="col-span-6 sm:col-span-4">
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">Gold</span>
              </label>
              <input type="number" {...register("gold", { value: 0 })} className="input input-bordered focus:border-primary w-full" />
              <label className="label">
                <span className="label-text-alt text-error">{errors.gold?.message}</span>
              </label>
            </div>
          </div>
          <div className="col-span-12">
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">Notes</span>
              </label>
              <textarea {...register("description")} className="textarea textarea-bordered focus:border-primary w-full" />
              <label className="label">
                <span className="label-text-alt text-error">{errors.description?.message}</span>
              </label>
            </div>
          </div>
          <div className="col-span-12 flex gap-4">
            <button type="button" className="btn btn-primary btn-sm" onClick={addMagicItem}>
              Add Magic Item
            </button>
            {getMagicItems(character).length > 0 && (
              <button type="button" className="btn btn-sm" onClick={addLostMagicItem}>
                Drop Magic Item
              </button>
            )}
            <button type="button" className="btn btn-primary btn-sm" onClick={addStoryAward}>
              Add Story Award
            </button>
            {getStoryAwards(character).length > 0 && (
              <button type="button" className="btn btn-sm" onClick={addLostStoryAward}>
                Drop Story Award
              </button>
            )}
          </div>
          {magicItemsGained.map((item, index) => (
            <div key={`magicItemsGained${index}`} className="card bg-base-300/70 col-span-12 sm:col-span-6">
              <div className="card-body flex flex-col gap-4">
                <h4 className="text-2xl">Add Magic Item</h4>
                <div className="flex gap-4">
                  <div className="form-control flex-1">
                    <label className="label">
                      <span className="label-text">Name</span>
                    </label>
                    <input
                      type="text"
                      value={item.name}
                      onChange={e => {
                        setMagicItemsGained(magicItemsGained.map((item, i) => (i === index ? { ...item, name: e.target.value } : item)));
                      }}
                      className="input input-bordered focus:border-primary w-full"
                    />
                    <label className="label">
                      <span className="label-text-alt text-error">{(errors.magic_items_gained || [])[index]?.name?.message}</span>
                    </label>
                  </div>
                  <button type="button" className="btn btn-danger mt-9" onClick={() => removeMagicItem(index)}>
                    <Icon path={mdiTrashCan} size={1} />
                  </button>
                </div>
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text">Description</span>
                  </label>
                  <textarea
                    value={item.description}
                    onChange={e => {
                      setMagicItemsGained(magicItemsGained.map((item, i) => (i === index ? { ...item, description: e.target.value } : item)));
                    }}
                    className="textarea textarea-bordered focus:border-primary w-full"
                  />
                </div>
              </div>
            </div>
          ))}
          {magicItemsLost.map((id, index) => (
            <div key={`magicItemsLost${index}`} className="card bg-base-300/70 shadow-xl col-span-12 sm:col-span-6">
              <div className="card-body flex flex-col gap-4">
                <h4 className="text-2xl">Drop Magic Item</h4>
                <div className="flex gap-4">
                  <div className="form-control flex-1">
                    <label className="label">
                      <span className="label-text">Select an Item</span>
                    </label>
                    <select
                      value={id}
                      onChange={e => {
                        setMagicItemsLost(magicItemsLost.map((item, i) => (i === index ? e.target.value : item)));
                      }}
                      className="select select-bordered w-full max-w-xs">
                      {getMagicItems(character).map(item => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                    <label className="label">
                      <span className="label-text-alt text-error">{(errors.magic_items_lost || [])[index]?.message}</span>
                    </label>
                  </div>
                  <button type="button" className="btn btn-danger mt-9" onClick={() => removeLostMagicItem(index)}>
                    <Icon path={mdiTrashCan} size={1} />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {storyAwardsGained.map((item, index) => (
            <div key={`storyAwardsGained${index}`} className="card bg-base-300/70 col-span-12 sm:col-span-6">
              <div className="card-body flex flex-col gap-4">
                <h4 className="text-2xl">Add Story Award</h4>
                <div className="flex gap-4">
                  <div className="form-control flex-1">
                    <label className="label">
                      <span className="label-text">Name</span>
                    </label>
                    <input
                      type="text"
                      value={item.name}
                      onChange={e => {
                        setStoryAwardsGained(storyAwardsGained.map((item, i) => (i === index ? { ...item, name: e.target.value } : item)));
                      }}
                      className="input input-bordered focus:border-primary w-full"
                    />
                    <label className="label">
                      <span className="label-text-alt text-error">{(errors.story_awards_gained || [])[index]?.name?.message}</span>
                    </label>
                  </div>
                  <button type="button" className="btn btn-danger mt-9" onClick={() => removeStoryAward(index)}>
                    <Icon path={mdiTrashCan} size={1} />
                  </button>
                </div>
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text">Description</span>
                  </label>
                  <textarea
                    value={item.description}
                    onChange={e => {
                      setStoryAwardsGained(storyAwardsGained.map((item, i) => (i === index ? { ...item, description: e.target.value } : item)));
                    }}
                    className="textarea textarea-bordered focus:border-primary w-full"
                  />
                </div>
              </div>
            </div>
          ))}
          {storyAwardsLost.map((id, index) => (
            <div key={`storyAwardsLost${index}`} className="card bg-base-300/70 shadow-xl col-span-12 sm:col-span-6">
              <div className="card-body flex flex-col gap-4">
                <h4 className="text-2xl">Drop Story Award</h4>
                <div className="flex gap-4">
                  <div className="form-control flex-1">
                    <label className="label">
                      <span className="label-text">Select a Story Award</span>
                    </label>
                    <select
                      value={id}
                      onChange={e => {
                        setStoryAwardsLost(storyAwardsLost.map((item, i) => (i === index ? e.target.value : item)));
                      }}
                      className="select select-bordered w-full max-w-xs">
                      {getStoryAwards(character).map(item => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                    <label className="label">
                      <span className="label-text-alt text-error">{(errors.story_awards_lost || [])[index]?.message}</span>
                    </label>
                  </div>
                  <button type="button" className="btn btn-danger mt-9" onClick={() => removeLostStoryAward(index)}>
                    <Icon path={mdiTrashCan} size={1} />
                  </button>
                </div>
              </div>
            </div>
          ))}
          <div className="col-span-12 text-center">
            <button type="submit" className={concatenate("btn btn-primary", submitting && "loading")} disabled={submitting}>
              Save Game
            </button>
          </div>
        </div>
      </form>
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

export const getMagicItems = (character: inferQueryOutput<"characters.getOne">, lastGameId: string = "") => {
  const magicItems: MagicItem[] = [];
  let lastGame = false;
  character.games.forEach(game => {
    if (lastGame) return;
    if (game.id === lastGameId) lastGame = true;
    game.magic_items_gained.forEach(item => {
      magicItems.push(item);
    });
    game.magic_items_lost.forEach(item => {
      magicItems.splice(
        magicItems.findIndex(i => i.id === item.id),
        1
      );
    });
  });
  return magicItems;
};

export const getStoryAwards = (character: inferQueryOutput<"characters.getOne">, lastGameId: string = "") => {
  const storyAwards: MagicItem[] = [];
  let lastGame = false;
  character.games.forEach(game => {
    if (lastGame) return;
    if (game.id === lastGameId) lastGame = true;
    game.story_awards_gained.forEach(item => {
      storyAwards.push(item);
    });
    game.story_awards_lost.forEach(item => {
      storyAwards.splice(
        storyAwards.findIndex(i => i.id === item.id),
        1
      );
    });
  });
  return storyAwards;
};
