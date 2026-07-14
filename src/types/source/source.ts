import { ContentRating } from "./content";

export interface SourceInfo {
  id: string;
  name: string;
  version: number;
  website: string;
  rating: ContentRating;
  thumbnail?: string;
  /** Numeric app version floor used by catalog install/update compatibility gates. */
  minSupportedAppVersion?: string;
  languages: string[];
}
