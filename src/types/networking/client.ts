import { NetworkClientBuilder } from "./builder";
import { NetworkRequestConfig, NetworkRequest } from "./request";
import { NetworkResponse } from "./response";

declare global {
  /**
   * NetworkClient is responsible for making HTTP requests.
   * It supports GET, POST, and custom requests.
   *
   * @deprecated API v4 compatibility surface. New JSC sources should use HttpClient.
   */
  class NetworkClient {
    constructor(builder?: NetworkClientBuilder);
    /**
     * Makes a POST request to the specified URL.
     *
     * @param url - The URL to send the request to.
     * @param config - Optional configuration for the request.
     * @returns A Promise that resolves to the response.
     */
    post(url: string, config?: NetworkRequestConfig): Promise<NetworkResponse>;

    /**
     * Makes a GET request to the specified URL.
     *
     * @param url - The URL to send the request to.
     * @param config - Optional configuration for the request.
     * @returns A Promise that resolves to the response.
     */
    get(url: string, config?: NetworkRequestConfig): Promise<NetworkResponse>;

    /**
     * Makes a custom HTTP request.
     *
     * @param req - The details of the request to make.
     * @returns A Promise that resolves to the response.
     */
    request(req: NetworkRequest): Promise<NetworkResponse>;
  }
}
