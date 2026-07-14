import { JsonObject } from "../utils";
import { NetworkRequest } from "./request";

export type NetworkResponse = {
  data: string;
  status: number;
  headers: JsonObject;
  request: NetworkRequest;
};
