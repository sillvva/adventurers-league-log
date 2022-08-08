import type { NextPage } from "next";
import Head from "next/head";
import Image from "next/image";
import background from "../../public/images/barovia-gate.jpg";
import google from "../../public/images/google.svg";

const Home: NextPage = () => {
  return (
    <>
      <Head>
        <title>Adventurers League Log Sheet</title>
        <meta name="description" content="An online log sheet made for Adventurers League characters" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Image src={background} layout="fill" objectFit="cover" objectPosition="center" priority alt="Background" className="relative z-0 opacity-25" />
      <main className="container relative mx-auto flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-4xl lg:text-6xl font-draconis text-center mb-20">Adventurers League<br />Log Sheet</h1>
        <button className="flex items-centers bg-white/75 hover:bg-white text-black rounded-lg p-2 w-64 h-16">
          <Image src={google} width={48} height={48} alt="Google" />
          <span className="flex-1 flex h-full justify-center items-center text-xl font-semibold">Login with Google</span>
        </button>
      </main>
    </>
  );
};

export default Home;
