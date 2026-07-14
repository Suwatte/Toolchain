import { NetworkRequest } from "./request";
import { NetworkResponse } from "./response";

export type Transformer<T> = (v: T) => Promise<T>;
export type NetworkRequestTransformer = Transformer<NetworkRequest>;
export type NetworkResponseTransformer = Transformer<NetworkResponse>;
