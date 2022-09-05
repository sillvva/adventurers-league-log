import Layout from "$src/layouts/main";
import { authOptions } from "$src/pages/api/auth/[...nextauth]";
import type { NextPageWithLayout } from "$src/pages/_app";
import { concatenate } from "$src/utils/misc";
import { trpc } from "$src/utils/trpc";
import { zodResolver } from "@hookform/resolvers/zod";
import { mdiHome } from "@mdi/js";
import Icon from "@mdi/react";
import type { GetServerSideProps } from "next";
import type { Session } from "next-auth";
import { unstable_getServerSession } from "next-auth";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

interface PageProps {
  session: Session;
}

export const newCharacterSchema = z.object({
  name: z.string().min(1),
  campaign: z.string().min(1),
  race: z.string().optional(),
  class: z.string().optional(),
  character_sheet_url: z.union([z.literal(""), z.string().url()]),
  image_url: z.union([z.literal(""), z.string().url()])
});

const NewCharacter: NextPageWithLayout<PageProps> = ({ session }) => {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    formState: { errors },
    handleSubmit
  } = useForm<z.infer<typeof newCharacterSchema>>({
    resolver: zodResolver(newCharacterSchema)
  });

  const mutation = trpc.useMutation(["_characters.create"], {
    onSuccess(data) {
      router.push(`/characters/${data.id}`);
    }
  });

  const submitHandler = handleSubmit(data => {
    setSubmitting(true);
    mutation.mutate(data);
  });

  return <>
    <Head>
      <title>New Character</title>
    </Head>

    <div className="text-sm breadcrumbs mb-4">
      <ul>
        <li>
          <Icon path={mdiHome} className="w-4" />
        </li>
        <li>
          <Link href="/characters" className="text-secondary">
            Characters
          </Link>
        </li>
        <li>New</li>
      </ul>
    </div>

    <form onSubmit={submitHandler}>
      <div className="flex flex-wrap">
        <div className="basis-full sm:basis-1/2 px-2">
          <div className="form-control w-full">
            <label className="label">
              <span className="label-text">
                Character Name
                <span className="text-error">*</span>
              </span>
            </label>
            <input type="text" {...register("name", { required: true })} className="input input-bordered focus:border-primary w-full" />
            <label className="label">
              <span className="label-text-alt text-error">{errors.name?.message}</span>
            </label>
          </div>
        </div>
        <div className="basis-full sm:basis-1/2 px-2">
          <div className="form-control w-full">
            <label className="label">
              <span className="label-text">
                Campaign
                <span className="text-error">*</span>
              </span>
            </label>
            <input type="text" {...register("campaign", { required: true })} className="input input-bordered focus:border-primary w-full" />
            <label className="label">
              <span className="label-text-alt text-error">{errors.campaign?.message}</span>
            </label>
          </div>
        </div>
        <div className="basis-full sm:basis-1/2 px-2">
          <div className="form-control w-full">
            <label className="label">
              <span className="label-text">Race</span>
            </label>
            <input type="text" {...register("race")} className="input input-bordered focus:border-primary w-full" />
            <label className="label">
              <span className="label-text-alt text-error">{errors.race?.message}</span>
            </label>
          </div>
        </div>
        <div className="basis-full sm:basis-1/2 px-2">
          <div className="form-control w-full">
            <label className="label">
              <span className="label-text">Class</span>
            </label>
            <input type="text" {...register("class")} className="input input-bordered focus:border-primary w-full" />
            <label className="label">
              <span className="label-text-alt text-error">{errors.class?.message}</span>
            </label>
          </div>
        </div>
        <div className="basis-full px-2">
          <div className="form-control w-full">
            <label className="label">
              <span className="label-text">Character Sheet URL</span>
            </label>
            <input type="text" {...register("character_sheet_url")} className="input input-bordered focus:border-primary w-full" />
            <label className="label">
              <span className="label-text-alt text-error">{errors.character_sheet_url?.message}</span>
            </label>
          </div>
        </div>
        <div className="basis-full px-2">
          <div className="form-control w-full">
            <label className="label">
              <span className="label-text">Image URL</span>
            </label>
            <input type="text" {...register("image_url")} className="input input-bordered focus:border-primary w-full" />
            <label className="label">
              <span className="label-text-alt text-error">{errors.image_url?.message}</span>
            </label>
          </div>
        </div>
        <div className="basis-full text-center m-4">
          <button type="submit" className={concatenate("btn btn-primary", submitting && "loading")} disabled={submitting}>
            Create
          </button>
        </div>
      </div>
    </form>
  </>;
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
