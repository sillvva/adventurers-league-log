import type { NextPage } from "next";
import Head from "next/head";
import Image from "next/image";
import { signIn, useSession } from "next-auth/react";
import background from "../../public/images/barovia-gate.jpg";
import google from "../../public/images/google.svg";
import { useRouter } from "next/router";
import { useEffect } from "react";

const Home: NextPage = () => {
  const router = useRouter();
  const session = useSession();

  useEffect(() => {
    if (session.data?.user) {
      router.replace("/characters");
    }
  }, [session.data, router]);

  return (
    <>
      <Head>
        <title>Adventurers League Log Sheet</title>
        <meta name="description" content="An online log sheet made for Adventurers League characters" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Image src={background} layout="fill" objectFit="cover" objectPosition="center" priority alt="Background" className="relative z-0 opacity-25" />
      <main className="container relative mx-auto flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-4xl lg:text-6xl font-draconis text-primary-content text-center mb-20">
          Adventurers League
          <br />
          Log Sheet
        </h1>
        <button
          className="flex items-centers bg-neutral/50 hover:bg-neutral text-neutral-content hover:text-primary-content transition-colors rounded-lg gap-2 p-2 w-64 h-16"
          onClick={() =>
            signIn("google", {
              callbackUrl: `${router.basePath}/characters`
            })
          }>
          <Image src={google} width={48} height={48} alt="Google" />
          <span className="flex-1 flex h-full justify-center items-center text-xl font-semibold">Login with Google</span>
        </button>
      </main>
    </>
  );
};

export default Home;