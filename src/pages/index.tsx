import { authOptions } from '$src/pages/api/auth/[...nextauth]';
import { getServerSession } from 'next-auth';
import { signIn } from 'next-auth/react';
import Image from 'next/future/image';
import Head from 'next/head';
import { useRouter } from 'next/router';

import { useAutoAnimate } from '@formkit/auto-animate/react';

import background from '../../public/images/barovia-gate.jpg';
import google from '../../public/images/google.svg';

import type { GetServerSidePropsContext, NextPage } from "next";
export const getServerSideProps = async (context: GetServerSidePropsContext) => {
	const session = await getServerSession(context.req, context.res, authOptions);

	if (session) {
		return {
			redirect: {
				destination: "/characters",
				permanent: false
			}
		};
	}

	return {
		props: {}
	};
};

const Home: NextPage = () => {
	const [main] = useAutoAnimate<HTMLElement>();
	const router = useRouter();

	return (
		<>
			<Head>
				<title>Adventurers League Log Sheet</title>
				<meta name="description" content="An online log sheet made for Adventurers League characters" />
				<link rel="icon" type="image/x-icon" href="/favicon.png" />
			</Head>

			<Image src={background} alt="Background" priority fill className="z-0 object-cover object-center opacity-40 dark:opacity-20 print:hidden" />
			<main ref={main} className="container relative mx-auto flex min-h-screen flex-col items-center justify-center p-4">
				<h1 className="mb-20 text-center font-draconis text-4xl text-base-content dark:text-white lg:text-6xl">
					Adventurers League
					<br />
					Log Sheet
				</h1>
				<button
					className="items-centers flex h-16 w-64 gap-2 rounded-lg bg-base-200/50 p-2 text-base-content transition-colors hover:bg-base-300"
					onClick={() =>
						signIn("google", {
							callbackUrl: `${router.basePath}/characters`
						})
					}>
					<Image src={google} width={48} height={48} alt="Google" />
					<span className="flex h-full flex-1 items-center justify-center text-xl font-semibold">Login with Google</span>
				</button>
			</main>
		</>
	);
};

export default Home;
