declare module "ddal" {
  type InferPropsFromServerSideFunction<T extends (...args: any[]) => Promise<{props?: any}>> = Exclude<Awaited<ReturnType<T>>["props"], undefined>;
}