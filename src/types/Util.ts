export type UnPromisify<T> = T extends Promise<infer V> ? V : never;

export type ExtractMapValue<T> = T extends Map<unknown, infer V> ? V : never;

export type TypeObjectToMap<T> = T extends { [KS in infer K]: infer V} ? Map<K,V> : never;

export type TypeMapToObject<T> = T extends Map<infer K extends string, infer V> ? { [P in K]: V } : never;

export type Replace<T, K extends keyof T, R> = Omit<T, K> & (undefined extends T[K] ? { [P in K]?: R } : { [P in K]-?: R });

export type ReplaceInContent<T extends {"content": unknown}, K extends keyof T["content"], R> =
    Replace<T, "content", Replace<T["content"], K, R>>;
