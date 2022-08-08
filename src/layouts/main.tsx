import type { PropsWithChildren } from "react";
import Image from "next/image";
import { signOut, useSession } from "next-auth/react";
import background from "../../public/images/barovia-gate.jpg";

const Layout = (props: PropsWithChildren) => {
  const session = useSession();

  return (
    <>
      <Image src={background} layout="fill" objectFit="cover" objectPosition="center" priority alt="Background" className="relative z-0 opacity-25" />
      <header className="relative z-20 border-b-[1px] border-slate-500 w-screen">
        <nav className="container mx-auto p-4 max-w-5xl flex gap-2">
          <div className="flex-1">&nbsp;</div>
          {session.data?.user && (
            <>
              <div className="dropdown dropdown-end">
                <label tabIndex={0} className="flex">
                  <div className="px-4 flex items-center">{session.data.user.name}</div>
                  <div className="avatar">
                    <div className="w-12 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2 overflow-hidden">
                      <Image
                        src={session.data.user.image || ""}
                        alt={session.data.user.name as string}
                        layout="fill"
                        objectFit="cover"
                        objectPosition="center"
                        className="rounded-full"
                      />
                    </div>
                  </div>
                </label>
                <ul tabIndex={0} className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52">
                  <li>
                    <a onClick={() => signOut()}>Logout</a>
                  </li>
                </ul>
              </div>
            </>
          )}
        </nav>
      </header>
      <main className="relative z-10 container mx-auto p-4 max-w-5xl">{props.children}</main>
    </>
  );
};

export default Layout;
