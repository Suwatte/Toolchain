import { Destination } from "./destination";
import { ContentRating } from "./content";

export type TagSection = {
  id: string;
  title: string;
  subtitle?: string;
  destination?: Destination;
  tags: Tag[];
};

export type Tag = {
  id: string;
  title: string;

  rating?: ContentRating;
  destination?: Destination;
};

export type LabeledOption = {
  id: string;
  title: string;
};
