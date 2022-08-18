import Layout from "$src/layouts/main";
import { authOptions } from "$src/pages/api/auth/[...nextauth]";
import type { NextPageWithLayout } from "$src/pages/_app";
import { useQueryString } from "$src/utils/hooks";
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
import { newCharacterSchema } from "../../new";

interface PageProps {
	session: Session;
}

export const editCharacterSchema = z.object({
	id: z.string(),
	name: z.string().min(1),
	campaign: z.string().min(1),
	race: z.string().optional(),
	class: z.string().optional(),
	character_sheet_url: z.union([z.literal(""), z.string().url()]),
	image_url: z.union([z.literal(""), z.string().url()])
});

const EditCharacter: NextPageWithLayout<PageProps> = ({ session }) => {
	const router = useRouter();
	const [submitting, setSubmitting] = useState(false);
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

	const { data: character } = trpc.useQuery(["characters.getOne", { characterId: params.characterId }], {
		ssr: true,
		refetchOnWindowFocus: false
	});

	if (character && character.userId !== session.user?.id) {
		router.replace(`/characters/${params.characterId}`);
		return <div>Not authorized</div>;
	}

	const utils = trpc.useContext();
	const mutation = trpc.useMutation(["_characters.edit"], {
		onSuccess() {
			utils.invalidateQueries(["characters.getOne", { characterId: params.characterId }]);
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
		setSubmitting(true);
		mutation.mutate({
			id: params.characterId,
			...data
		});
	});

	return (
		<>
			<Head>
				<title>Edit Character - {character.name}</title>
			</Head>

			<div className="breadcrumbs mb-4 text-sm">
				<ul>
					<li>
						<Icon path={mdiHome} className="w-4" />
					</li>
					<li>
						<Link href="/characters">
							<a className="">Characters</a>
						</Link>
					</li>
					<li>
						<Link href={`/characters/${params.characterId}`}>
							<a className="">{character.name}</a>
						</Link>
					</li>
					<li className="text-secondary dark:drop-shadow-md">Edit</li>
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
								{...register("name", { required: true, value: character.name })}
								className="input input-bordered w-full focus:border-primary"
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
								{...register("campaign", { required: true, value: character.campaign || "" })}
								className="input input-bordered w-full focus:border-primary"
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
								{...register("race", { value: character.race || "" })}
								className="input input-bordered w-full focus:border-primary"
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
								{...register("class", { value: character.class || "" })}
								className="input input-bordered w-full focus:border-primary"
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
								{...register("character_sheet_url", { value: character.character_sheet_url || "" })}
								className="input input-bordered w-full focus:border-primary"
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
								{...register("image_url", { value: character.image_url || "" })}
								className="input input-bordered w-full focus:border-primary"
							/>
							<label className="label">
								<span className="label-text-alt text-error">{errors.image_url?.message}</span>
							</label>
						</div>
					</div>
					<div className="m-4 basis-full text-center">
						<button type="submit" className={concatenate("btn btn-primary", submitting && "loading")} disabled={submitting}>
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
