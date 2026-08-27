import {
  ContentRating,
  type NetworkRequest,
  type SourceInfo,
} from "@suwatte/toolchain/types";

const info: SourceInfo = {
  id: "en.example",
  name: "Example",
  version: 1,
  website: "https://example.com",
  languages: ["en"],
  rating: ContentRating.EVERYONE,
};

const request: NetworkRequest = {
  url: info.website,
  body: { action: "search" },
};

Crypto.sha256("test");
void request;
