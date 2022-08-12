import type { NextPageWithLayout } from "$src/pages/_app";
import type { GetServerSidePropsContext } from "next";
import { unstable_getServerSession } from "next-auth";
import { useRouter } from "next/router";
import type { FormEventHandler } from "react";
import { useMemo } from "react";
import { useState } from "react";
import { authOptions } from "$src/pages/api/auth/[...nextauth]";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { mdiAlertCircle, mdiHome, mdiTrashCan } from "@mdi/js";
import Icon from "@mdi/react";
import Head from "next/head";
import Link from "next/link";
import Layout from "$src/layouts/main";
import { trpc } from "$src/utils/trpc";
import { concatenate, formatDate } from "$src/utils/misc";
import { useQueryString } from "$src/utils/hooks";
import type { AsyncReturnType } from "$src/types/util";
import type { DungeonMaster, LogType, MagicItem } from "@prisma/client";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { prisma } from "$src/server/db/client";
import { getOne } from "$src/server/router/routers/characters";

type PageProps = AsyncReturnType<typeof getServerSideProps>["props"];

export const logSchema = z.object({
  characterId: z.string().default(""),
  gameId: z.string().default(""),
  name: z.string().min(1, "Required"),
  date: z
    .string()
    .regex(
      /^(-?(?:[1-9][0-9]*)?[0-9]{4})-(1[0-2]|0[1-9])-(3[01]|0[1-9]|[12][0-9])T(2[0-3]|[01][0-9]):([0-5][0-9]):([0-5][0-9])(\.[0-9]+)?(Z|[+-](?:2[0-3]|[01][0-9]):[0-5][0-9])?$/,
      "Not a valid date"
    ),
  type: z.union([z.literal("game"), z.literal("nongame")]).default("game"),
  experience: z.number().default(0),
  acp: z.number().default(0),
  tcp: z.number().default(0),
  level: z.number().default(0),
  gold: z.number().default(0),
  dtd: z.number().default(0),
  description: z.string().default(""),
  dm: z.object({
    id: z.string().default(""),
    name: z.string().default(""),
    DCI: z.number().nullable().default(null)
  }),
  is_dm_log: z.boolean().default(false),
  applied_date: z
    .union([
      z.null(),
      z
        .string()
        .regex(
          /^(-?(?:[1-9][0-9]*)?[0-9]{4})-(1[0-2]|0[1-9])-(3[01]|0[1-9]|[12][0-9])T(2[0-3]|[01][0-9]):([0-5][0-9]):([0-5][0-9])(\.[0-9]+)?(Z|[+-](?:2[0-3]|[01][0-9]):[0-5][0-9])?$/,
          "Not a valid date"
        )
    ])
    .default(null),
  magic_items_gained: z
    .array(
      z.object({
        id: z.string().default(""),
        name: z.string().min(1, "Required"),
        description: z.string().default("")
      })
    )
    .default([]),
  magic_items_lost: z.array(z.string().min(1)).default([]),
  story_awards_gained: z
    .array(
      z.object({
        id: z.string().default(""),
        name: z.string().min(1, "Required"),
        description: z.string().default("")
      })
    )
    .default([]),
  story_awards_lost: z.array(z.string().min(1)).default([])
});

const EditCharacter: NextPageWithLayout<PageProps> = ({ ssrCharacter }) => {
  const router = useRouter();
  const { data: params } = useQueryString(
    z.object({
      characterId: z.string(),
      logId: z.string()
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
  } = useForm<z.infer<typeof logSchema>>();

  const character = ssrCharacter;

  const selectedGame = useMemo(
    () =>
      character.logs
        .map(log => ({
          ...log,
          date: new Date(log.date),
          applied_date: log.applied_date !== null ? new Date(log.applied_date) : null,
          created_at: new Date(log.created_at)
        }))
        .find(g => g.id === params.logId) || {
        characterId: params.characterId,
        id: "",
        name: "",
        description: "",
        date: new Date(),
        type: "game" as LogType,
        created_at: new Date(),
        experience: 0,
        acp: 0,
        tcp: 0,
        level: 0,
        gold: 0,
        dtd: 0,
        dungeonMasterId: "",
        dm: {
          id: "",
          name: "",
          DCI: null,
          uid: ""
        },
        applied_date: new Date(),
        is_dm_log: false,
        magic_items_gained: [],
        magic_items_lost: [],
        story_awards_gained: [],
        story_awards_lost: []
      },
    [params, character]
  );

  const [parent1] = useAutoAnimate<HTMLDivElement>();
  const [parent2] = useAutoAnimate<HTMLDivElement>();
  const [season, setSeason] = useState<1 | 8 | 9>(selectedGame?.experience ? 1 : selectedGame?.acp ? 8 : 9);
  const [type, setType] = useState<LogType>(selectedGame.type || "game");
  const [dms, setDMs] = useState<DungeonMaster[]>([]);
  const [magicItemsGained, setMagicItemsGained] = useState(
    selectedGame.magic_items_gained.map(mi => ({ id: mi.id, name: mi.name, description: mi.description || "" }))
  );
  const [magicItemsLost, setMagicItemsLost] = useState<string[]>(selectedGame.magic_items_lost.map(mi => mi.id));
  const [storyAwardsGained, setStoryAwardsGained] = useState(
    (selectedGame?.story_awards_gained || []).map(mi => ({ id: mi.id, name: mi.name, description: mi.description || "" }))
  );
  const [storyAwardsLost, setStoryAwardsLost] = useState<string[]>(selectedGame.story_awards_lost.map(mi => mi.id));
  const [mutError, setMutError] = useState<string | null>(null);

  const mutation = trpc.useMutation(["_logs.save"], {
    onSuccess() {
      router.push(`/characters/${params.characterId}`);
    },
    onError(err) {
      setMutError(err.message);
    }
  });

  const handleSubmit: FormEventHandler<HTMLFormElement> = e => {
    e.preventDefault();

    clearErrors();
    let errors = [];

    const values = getValues();

    try {
      values.type = type;

      if (!values.date) errors.push(setError("date", { message: "Required" }));
      else values.date = new Date(values.date.replace("T", " ")).toISOString();

      if (values.type === "game" && !values.dm.name) errors.push(setError("dm.name", { message: "Required" }));

      values.dm.DCI = values.dm.DCI ? parseInt(values.dm.DCI.toString()) : null;
      if (values.experience) values.experience = parseInt(values.experience.toString());
      if (values.acp) values.acp = parseInt(values.acp.toString());
      if (values.tcp) values.tcp = parseInt(values.tcp.toString());
      if (values.level) values.level = parseInt(values.level.toString());
      if (values.gold) values.gold = parseInt(values.gold.toString());
      if (values.dtd) values.dtd = parseInt(values.dtd.toString());

      values.magic_items_gained = magicItemsGained;
      values.magic_items_lost = magicItemsLost;
      values.story_awards_gained = storyAwardsGained;
      values.story_awards_lost = storyAwardsLost;
    } catch (err) {
      console.error(err);
    }

    const result = logSchema.safeParse(values);
    if (result.success) {
      setSubmitting(true);
      mutation.mutate(values);
    } else {
      type IssueFields = "date" | "name" | "dm.name" | "description" | "characterId" | "experience" | "acp" | "tcp" | "level" | "gold";
      result.error.issues.forEach(issue => {
        if (["date", "name", "dm.name", "description", "characterId", "experience", "acp", "tcp", "level", "gold"].includes(issue.path.join("."))) {
          setError(issue.path.join(".") as IssueFields, {
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

  const magicItems = character ? getMagicItems(character, { excludeDropped: true, lastLogId: params.logId === "new" ? "" : params.logId }) : [];
  const storyAwards = character ? getStoryAwards(character, { excludeDropped: true, lastLogId: params.logId === "new" ? "" : params.logId }) : [];

  const addMagicItem = () => setMagicItemsGained([...magicItemsGained, { id: "", name: "", description: "" }]);
  const removeMagicItem = (index: number) => setMagicItemsGained(magicItemsGained.filter((_, i) => i !== index));
  const addLostMagicItem = () => setMagicItemsLost([...magicItemsLost, magicItems[0]?.id || ""]);
  const removeLostMagicItem = (index: number) => setMagicItemsLost(magicItemsLost.filter((_, i) => i !== index));

  const addStoryAward = () => setStoryAwardsGained([...storyAwardsGained, { id: "", name: "", description: "" }]);
  const removeStoryAward = (index: number) => setStoryAwardsGained(storyAwardsGained.filter((_, i) => i !== index));
  const addLostStoryAward = () => setStoryAwardsLost([...storyAwardsLost, storyAwards[0]?.id || ""]);
  const removeLostStoryAward = (index: number) => setStoryAwardsLost(storyAwardsLost.filter((_, i) => i !== index));

  const getDMs = (prop: "name" | "DCI", value: string | number | null) => {
    if (!character || !value) return setDMs([]);

    const dms: DungeonMaster[] = [];
    character.logs.forEach(log => {
      if (!log.dm) return;
      if (dms.find(dm => dm.id === log.dm?.id)) return;
      const match = log.dm[prop]?.toString().includes(value.toString());
      if (match) dms.push(log.dm);
    });

    setDMs(dms);
  };

  const setDM = (dm: DungeonMaster) => {
    setValue("dm.id", dm.id);
    setValue("dm.name", dm.name);
    setValue("dm.DCI", dm.DCI);
  };

  return (
    <>
      <Head>
        <title>{selectedGame.name ? `Edit Log - ${selectedGame.name}` : "New Log"}</title>
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
              <a className="text-neutral-content">{character?.name}</a>
            </Link>
          </li>
          {selectedGame.name ? (
            <li className="text-secondary whitespace-nowrap overflow-hidden text-ellipsis drop-shadow-md">{selectedGame.name}</li>
          ) : (
            <li className="text-secondary drop-shadow-md">New Log</li>
          )}
        </ul>
      </div>

      {mutError && (
        <div className="alert alert-error shadow-lg">
          <div>
            <Icon path={mdiAlertCircle} size={1} />
            <span>Error! Task failed successfully. I mean... {mutError}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <input type="hidden" {...register("characterId", { value: params.characterId })} />
        <input type="hidden" {...register("gameId", { value: params.logId === "new" ? "" : params.logId })} />
        <div className="grid grid-cols-12 gap-4">
          {!selectedGame.is_dm_log && (
            <div className="form-control col-span-12 sm:col-span-4">
              <label className="label">
                <span className="label-text">Log Type</span>
              </label>
              <select value={type} onChange={e => setType(e.target.value as LogType)} className="select select-bordered w-full">
                <option value={"game"}>Game</option>
                <option value={"nongame"}>Non-Game (Purchase, Trade, etc)</option>
              </select>
            </div>
          )}
          <div className={concatenate("form-control col-span-12", selectedGame.is_dm_log ? "sm:col-span-6" : "sm:col-span-4")}>
            <label className="label">
              <span className="label-text">
                Title
                <span className="text-error">*</span>
              </span>
            </label>
            <input
              type="text"
              {...register("name", { required: true, value: selectedGame.name })}
              className="input input-bordered focus:border-primary w-full"
            />
            <label className="label">
              <span className="label-text-alt text-error">{errors.name?.message}</span>
            </label>
          </div>
          <div className={concatenate("form-control col-span-12", selectedGame.is_dm_log ? "sm:col-span-6" : "sm:col-span-4")}>
            <label className="label">
              <span className="label-text">
                Date
                <span className="text-error">*</span>
              </span>
            </label>
            <input
              type="datetime-local"
              {...register("date", { required: true, value: formatDate(selectedGame.date) })}
              className="input input-bordered focus:border-primary w-full"
            />
            <label className="label">
              <span className="label-text-alt text-error">{errors.date?.message}</span>
            </label>
          </div>
          <div className="col-span-12 grid grid-cols-12 gap-4" ref={parent1}>
            {type === "game" && (
              <>
                <input type="hidden" {...register("dm.id", { value: selectedGame.dm?.id || "" })} />
                {!selectedGame.is_dm_log && (
                  <>
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
                            {...register("dm.name", { value: selectedGame.dm?.name || "", onChange: e => getDMs("name", e.target.value) })}
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
                            {...register("dm.DCI", { value: selectedGame.dm?.DCI || null, onChange: e => getDMs("DCI", e.target.value) })}
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
                  </>
                )}
                <div className="form-control col-span-12 sm:col-span-4">
                  <label className="label">
                    <span className="label-text">Season</span>
                  </label>
                  <select value={season} onChange={e => setSeason(parseInt(e.target.value) as 1 | 8 | 9)} className="select select-bordered w-full">
                    <option value={9}>Season 9+</option>
                    <option value={8}>Season 8</option>
                    <option value={1}>Season 1-7</option>
                  </select>
                </div>
                {season === 1 && (
                  <div className="form-control w-full col-span-6 sm:col-span-4">
                    <label className="label">
                      <span className="label-text">Experience</span>
                    </label>
                    <input
                      type="number"
                      {...register("experience", { value: selectedGame.experience })}
                      className="input input-bordered focus:border-primary w-full"
                    />
                    <label className="label">
                      <span className="label-text-alt text-error">{errors.experience?.message}</span>
                    </label>
                  </div>
                )}
                {season === 9 && (
                  <div className="form-control w-full col-span-12 sm:col-span-4">
                    <label className="label">
                      <span className="label-text">Level</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={character ? 20 - character.total_level : 19}
                      {...register("level", { value: selectedGame.level, min: 0, max: character ? 20 - character.total_level : 19 })}
                      className="input input-bordered focus:border-primary w-full"
                    />
                    <label className="label">
                      <span className="label-text-alt text-error">{errors.level?.message}</span>
                    </label>
                  </div>
                )}
              </>
            )}
            {(season === 8 || type === "nongame") && (
              <>
                {type === "game" && (
                  <div className="form-control w-full col-span-6 sm:col-span-2">
                    <label className="label">
                      <span className="label-text">ACP</span>
                    </label>
                    <input type="number" {...register("acp", { value: selectedGame.acp })} className="input input-bordered focus:border-primary w-full" />
                    <label className="label">
                      <span className="label-text-alt text-error">{errors.acp?.message}</span>
                    </label>
                  </div>
                )}
                <div className={concatenate("form-control w-full", type === "nongame" ? "col-span-4" : "col-span-6 sm:col-span-2")}>
                  <label className="label">
                    <span className="label-text">TCP</span>
                  </label>
                  <input type="number" {...register("tcp", { value: selectedGame.tcp })} className="input input-bordered focus:border-primary w-full" />
                  <label className="label">
                    <span className="label-text-alt text-error">{errors.tcp?.message}</span>
                  </label>
                </div>
              </>
            )}
            <div className={concatenate("form-control w-full", type === "game" ? "col-span-12 sm:col-span-2" : "col-span-4")}>
              <label className="label">
                <span className="label-text">Gold</span>
              </label>
              <input type="number" {...register("gold", { value: selectedGame.gold })} className="input input-bordered focus:border-primary w-full" />
              <label className="label">
                <span className="label-text-alt text-error">{errors.gold?.message}</span>
              </label>
            </div>
            <div className={concatenate("form-control w-full", type === "game" ? "col-span-12 sm:col-span-2" : "col-span-4")}>
              <label className="label">
                <span className="label-text whitespace-nowrap overflow-hidden text-ellipsis">Downtime Days</span>
              </label>
              <input type="number" value={selectedGame.dtd} {...register("dtd")} className="input input-bordered focus:border-primary w-full" />
              <label className="label">
                <span className="label-text-alt text-error">{errors.dtd?.message}</span>
              </label>
            </div>
          </div>
          <div className="form-control w-full col-span-12">
            <label className="label">
              <span className="label-text">Notes</span>
            </label>
            <textarea
              {...register("description", { value: selectedGame.description || "" })}
              className="textarea textarea-bordered focus:border-primary w-full"
            />
            <label className="label">
              <span className="label-text-alt text-error">{errors.description?.message}</span>
            </label>
          </div>
          <div className="col-span-12 flex gap-4 flex-wrap">
            <button type="button" className="btn btn-primary btn-sm flex-1 sm:flex-none min-w-fit" onClick={addMagicItem}>
              Add Magic Item
            </button>
            {!selectedGame.is_dm_log && magicItems.filter(item => !magicItemsLost.includes(item.id)).length > 0 && (
              <button type="button" className="btn btn-sm flex-1 sm:flex-none min-w-fit" onClick={addLostMagicItem}>
                Drop Magic Item
              </button>
            )}
            {type === "game" && (
              <>
                <button type="button" className="btn btn-primary btn-sm flex-1 sm:flex-none min-w-fit" onClick={addStoryAward}>
                  Add Story Award
                </button>
                {!selectedGame.is_dm_log && storyAwards.filter(item => !storyAwardsLost.includes(item.id)).length > 0 && (
                  <button type="button" className="btn btn-sm flex-1 sm:flex-none min-w-fit" onClick={addLostStoryAward}>
                    Drop Story Award
                  </button>
                )}
              </>
            )}
          </div>
          <div className="col-span-12 grid grid-cols-12 gap-4" ref={parent2}>
            {magicItemsGained.map((item, index) => (
              <div key={`magicItemsGained${index}`} className="card bg-base-300/70 col-span-12 sm:col-span-6 h-[338px]">
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
                        className="select select-bordered w-full">
                        {magicItems.map(item => (
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
                  <div className="text-sm">{magicItems.find(item => magicItemsLost[index] === item.id)?.description}</div>
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
                        className="select select-bordered w-full">
                        {storyAwards.map(item => (
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
                  <div className="text-sm">{storyAwards.find(item => storyAwardsLost[index] === item.id)?.description}</div>
                </div>
              </div>
            ))}
          </div>
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

EditCharacter.getLayout = page => {
  return <Layout>{page}</Layout>;
};

export default EditCharacter;

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const session = await unstable_getServerSession(context.req, context.res, authOptions);
  const characterId = typeof context.query.characterId === "string" ? context.query.characterId : "";
  const character = await getOne(prisma, characterId);

  return {
    ...(!session && {
      redirect: {
        destination: "/",
        permanent: false
      }
    }),
    props: {
      session,
      ssrCharacter: {
        ...character,
        logs: character.logs.map(log => ({
          ...log,
          date: log.date.toISOString(),
          created_at: log.created_at.toISOString(),
          applied_date: log.applied_date === null ? null : log.applied_date.toISOString()
        })),
        created_at: character.created_at.toISOString()
      }
    }
  };
};

export const getMagicItems = (
  character: PageProps["ssrCharacter"],
  options?: {
    lastLogId?: string;
    excludeDropped?: boolean;
  }
) => {
  const { lastLogId = "", excludeDropped = false } = options || {};
  const magicItems: MagicItem[] = [];
  let lastLog = false;
  character.logs.forEach(log => {
    if (lastLog) return;
    if (log.id === lastLogId) {
      lastLog = true;
      return;
    }
    log.magic_items_gained.forEach(item => {
      magicItems.push(item);
    });
    log.magic_items_lost.forEach(item => {
      magicItems.splice(
        magicItems.findIndex(i => i.id === item.id),
        1
      );
    });
  });
  return magicItems.filter(item => !excludeDropped || !item.logLostId);
};

export const getStoryAwards = (
  character: PageProps["ssrCharacter"],
  options?: {
    lastLogId?: string;
    excludeDropped?: boolean;
  }
) => {
  const { lastLogId = "", excludeDropped = false } = options || {};
  const storyAwards: MagicItem[] = [];
  let lastLog = false;
  character.logs.forEach(log => {
    if (lastLog) return;
    if (log.id === lastLogId) {
      lastLog = true;
      return;
    }
    log.story_awards_gained.forEach(item => {
      storyAwards.push(item);
    });
    log.story_awards_lost.forEach(item => {
      storyAwards.splice(
        storyAwards.findIndex(i => i.id === item.id),
        1
      );
    });
  });
  return storyAwards.filter(item => !excludeDropped || !item.logLostId);
};
