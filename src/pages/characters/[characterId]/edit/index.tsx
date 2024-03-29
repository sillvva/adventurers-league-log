import Layout from "$src/layouts/main";
import { authOptions } from "$src/pages/api/auth/[...nextauth]";
import { prisma } from "$src/server/db/client";
import { newCharacterSchema } from "$src/types/zod-schema";
import { useQueryString } from "$src/utils/hooks";
import { trpc } from "$src/utils/trpc";
import { getServerSession } from "next-auth";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useForm } from "react-hook-form";
import { twMerge } from "tailwind-merge";
import { z } from "zod";

import { zodResolver } from "@hookform/resolvers/zod";
import { mdiHome } from "@mdi/js";
import Icon from "@mdi/react";

import type { NextPageWithLayout } from "$src/pages/_app";
import type { InferPropsFromServerSideFunction } from "ddal";
import type { GetServerSidePropsContext } from "next";

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
	const session = await getServerSession(context.req, context.res, authOptions);

	const characterId = typeof context.query.characterId === "string" ? context.query.characterId : "";
	const character = await prisma.character.findFirst({
		where: {
			id: characterId
		}
	});

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
			session,
			character: {
				...character,
				created_at: character?.created_at.toISOString() || ""
			}
		}
	};
};

const EditCharacter: NextPageWithLayout<InferPropsFromServerSideFunction<typeof getServerSideProps>> = ({ session, character }) => {
	const router = useRouter();
	const {
		register,
		formState: { errors },
		handleSubmit
	} = useForm<z.infer<typeof newCharacterSchema>>({
		resolver: zodResolver(newCharacterSchema)
	});

	const { data: params } = useQueryString(
		z.object({
			characterId: z.string()
		})
	);

	if (character && character.userId !== session.user?.id) {
		router.replace(`/characters/${params.characterId}`);
		return <div>Not authorized</div>;
	}

	const utils = trpc.useContext();
	const mutation = trpc.useMutation(["_characters.edit"], {
		onSuccess() {
			utils.refetchQueries(["characters.getAll", { userId: session.user?.id || "" }]);
			router.push(`/characters/${params.characterId}`);
		}
	});

	if (!character)
		return (
			<Head>
				<title>Edit Character</title>
			</Head>
		);

	const submitHandler = handleSubmit(data => {
		mutation.mutate({
			id: params.characterId,
			...data
		});
	});

	return (
		<>
			<Head>
				<title>{`Edit Character - ${character.name}`}</title>
			</Head>

			<div className="breadcrumbs mb-4 text-sm">
				<ul>
					<li>
						<Icon path={mdiHome} className="w-4" />
					</li>
					<li>
						<Link href="/characters" className="text-secondary">
							Characters
						</Link>
					</li>
					<li>
						<Link href={`/characters/${params.characterId}`} className="text-secondary">
							{character.name}
						</Link>
					</li>
					<li className="dark:drop-shadow-md">Edit</li>
				</ul>
			</div>

			<form onSubmit={submitHandler}>
				<div className="flex flex-wrap">
					<div className="basis-full px-2 sm:basis-1/2">
						<div className="form-control w-full">
							<label className="label">
								<span className="label-text">
									Character Name
									<span className="text-error">*</span>
								</span>
							</label>
							<input
								type="text"
								{...register("name", { required: true, value: character.name, disabled: mutation.isLoading })}
								className="input-bordered input w-full focus:border-primary"
							/>
							<label className="label">
								<span className="label-text-alt text-error">{errors.name?.message}</span>
							</label>
						</div>
					</div>
					<div className="basis-full px-2 sm:basis-1/2">
						<div className="form-control w-full">
							<label className="label">
								<span className="label-text">
									Campaign
									<span className="text-error">*</span>
								</span>
							</label>
							<input
								type="text"
								{...register("campaign", { required: true, value: character.campaign || "", disabled: mutation.isLoading })}
								className="input-bordered input w-full focus:border-primary"
							/>
							<label className="label">
								<span className="label-text-alt text-error">{errors.campaign?.message}</span>
							</label>
						</div>
					</div>
					<div className="basis-full px-2 sm:basis-1/2">
						<div className="form-control w-full">
							<label className="label">
								<span className="label-text">Race</span>
							</label>
							<input
								type="text"
								{...register("race", { value: character.race || "", disabled: mutation.isLoading })}
								className="input-bordered input w-full focus:border-primary"
							/>
							<label className="label">
								<span className="label-text-alt text-error">{errors.race?.message}</span>
							</label>
						</div>
					</div>
					<div className="basis-full px-2 sm:basis-1/2">
						<div className="form-control w-full">
							<label className="label">
								<span className="label-text">Class</span>
							</label>
							<input
								type="text"
								{...register("class", { value: character.class || "", disabled: mutation.isLoading })}
								className="input-bordered input w-full focus:border-primary"
							/>
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
							<input
								type="text"
								{...register("character_sheet_url", { value: character.character_sheet_url || "", disabled: mutation.isLoading })}
								className="input-bordered input w-full focus:border-primary"
							/>
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
							<input
								type="text"
								{...register("image_url", { value: character.image_url || "", disabled: mutation.isLoading })}
								className="input-bordered input w-full focus:border-primary"
							/>
							<label className="label">
								<span className="label-text-alt text-error">{errors.image_url?.message}</span>
							</label>
						</div>
					</div>
					<div className="m-4 basis-full text-center">
						<button type="submit" className={twMerge("btn-primary btn", mutation.isLoading && "loading")} disabled={mutation.isLoading}>
							Update
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
