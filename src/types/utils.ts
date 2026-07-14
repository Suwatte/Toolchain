export type JsonObject = Record<string, any>;

export type PropWrapper<Key extends string, Props> = {
  [K in Key]: {
    props: Props;
    title?: string | null;
  };
};

/**
 * Extracts the Key discriminant from a PropWrapper type.
 */
export type PropKey<T> = T extends PropWrapper<infer K, any> ? K : never;

/**
 * Extracts the Props type from a PropWrapper type.
 */
export type PropValue<T> = T extends PropWrapper<any, infer P> ? P : never;
