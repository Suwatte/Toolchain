import { PropWrapper } from "../utils";
import { LabeledOption } from "./tag";

export type SearchFilter = {
  id: string;
  title: string;
  subtitle?: string;
  kind: SearchFilterKind;
};

export type SearchFilterKind =
  | ToggleFilter
  | PickerFilter
  | SelectFilter
  | TextFilter;

export type ToggleFilter = PropWrapper<"toggle", boolean>;
export type PickerFilter = PropWrapper<"picker", LabeledOption[]>;
export type SelectFilter = PropWrapper<"select", SelectFilterProps>;
export type TextFilter = PropWrapper<"text", boolean>;

export type SelectFilterProps = {
  options: LabeledOption[];
  exclude: boolean;
};

export function ToggleFilter(): ToggleFilter {
  return {
    toggle: {
      props: true,
    },
  };
}

export function TextFilter(): TextFilter {
  return {
    text: {
      props: true,
    },
  };
}

export function PickerFilter(props: LabeledOption[]): PickerFilter {
  return {
    picker: {
      props: props,
    },
  };
}

export function SelectFilter(
  options: LabeledOption[],
  exclude: boolean = false,
): SelectFilter {
  return {
    select: {
      props: {
        options,
        exclude,
      },
    },
  };
}

export function SearchFilter(
  id: string,
  title: string,
  kind: SearchFilterKind,
  subtitle?: string,
): SearchFilter {
  return {
    id,
    title,
    subtitle,
    kind,
  };
}

// -- Populated Filters

export type FilterSchema = Record<string, SearchFilterKind>;

type ResolveFilterKind<T extends SearchFilterKind> = T extends ToggleFilter
  ? boolean
  : T extends PickerFilter
    ? string
    : T extends SelectFilter
      ? { include: string[]; exclude: string[] }
      : T extends TextFilter
        ? string
        : never;

export type PopulatedFilters<T extends FilterSchema = FilterSchema> = {
  [K in keyof T]: ResolveFilterKind<T[K]>;
};
