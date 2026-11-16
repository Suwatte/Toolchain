import { z, ZodError, type ZodTypeAny } from "zod";
import {
  ContentRating,
  ContentStatus,
  ContentType,
  PageSectionStyle,
  AcquisitionFormat,
  ReadingMode,
  SOURCE_CHAPTER_TEXT_LIMITS,
  SourceChapterTextFormat,
  TrackStatus,
  UIKeyboardType,
} from "../types";
const NonEmptyStringSchema = z.string().min(1);
const TitleSchema = z.string().min(1);
const PositiveFiniteNumberSchema = z.number().finite().positive();
const NonNegativeFiniteNumberSchema = z.number().finite().nonnegative();
const UInt32Schema = z.number().int().nonnegative().max(0xffffffff);
const NonNegativeChapterNumberSchema = z
  .number()
  .finite()
  .nonnegative();
const ChapterListNumberSchema = z.union([z.literal(-1), NonNegativeChapterNumberSchema]);
const NonEmptyArray = <T extends ZodTypeAny>(schema: T) =>
  z.array(schema).nonempty();
const FunctionSchema = z.custom<(...args: any[]) => unknown>(
  (value) => typeof value === "function",
  "Expected function",
);
const ArrayBufferSchema = z.custom<ArrayBuffer>(
  (value) => value instanceof ArrayBuffer,
  "Expected ArrayBuffer",
);

export const URLSchema = z.string().min(10).url();
export const JsonObjectSchema = z.record(z.unknown());

// Networking
export const CookieSchema = z.object({
  name: NonEmptyStringSchema,
  value: NonEmptyStringSchema,
});

export const BasicURLSchema = z.object({
  url: URLSchema,
  params: JsonObjectSchema.optional(),
});

export const RequestHeadersSchema = z.record(
  z.union([z.string(), z.number(), z.boolean()]),
);

export const TransformerSchema = FunctionSchema;
export const NetworkRequestTransformerSchema = FunctionSchema;
export const NetworkResponseTransformerSchema = FunctionSchema;

export const NetworkRequestSchema = z.object({
  url: URLSchema,
  method: NonEmptyStringSchema.optional(),
  params: JsonObjectSchema.optional(),
  body: JsonObjectSchema.optional(),
  headers: RequestHeadersSchema.optional(),
  cookies: NonEmptyArray(CookieSchema).optional(),
  timeout: z.number().optional(),
  maxRetries: z.number().optional(),
  transformRequest: z.union([FunctionSchema, NonEmptyArray(FunctionSchema)]).optional(),
  transformResponse: z.union([FunctionSchema, NonEmptyArray(FunctionSchema)]).optional(),
  validateStatus: FunctionSchema.optional(),
});

export const NetworkRequestConfigSchema = NetworkRequestSchema.omit({
  url: true,
  method: true,
});

export const NetworkResponseSchema = z.object({
  data: z.string(),
  status: z.number(),
  headers: JsonObjectSchema,
  request: NetworkRequestSchema,
});

// Image redraw
export const CGSizeSchema = z.object({
  width: PositiveFiniteNumberSchema,
  height: PositiveFiniteNumberSchema,
});

export const CGPointSchema = z.object({
  x: NonNegativeFiniteNumberSchema,
  y: NonNegativeFiniteNumberSchema,
});

export const CGRectSchema = z.object({
  origin: CGPointSchema,
  size: CGSizeSchema,
});

export const RedrawInstructionSchema = z.object({
  source: CGRectSchema,
  destination: CGRectSchema,
});

export const RedrawSchema = z.object({
  size: CGSizeSchema,
  commands: NonEmptyArray(RedrawInstructionSchema),
});

export const RedrawImageRequestSchema = z.object({
  url: URLSchema,
  size: CGSizeSchema,
});

// Source config + enums
export const SourceConfigurationSchema = z.object({
  imageReferer: NonEmptyStringSchema.optional(),
  endpoint: NonEmptyArray(NonEmptyStringSchema).optional(),
  useClientForImageRequests: z.boolean().optional(),
});

export const StatisticsSchema = z.object({
  rating: z.number().optional(),
  favorites: z.number().optional(),
  bookmarks: z.number().optional(),
  views: z.number().optional(),
});

export const SortSelectionSchema = z.object({
  key: NonEmptyStringSchema,
  ascending: z.boolean().optional(),
});

export const ItemListRequestSchema = z.object({
  key: NonEmptyStringSchema.optional(),
  sort: SortSelectionSchema.optional(),
  disableSorting: z.boolean().optional(),
});

export const SearchRequestSchema = z.object({
  query: z.string().optional(),
  sort: SortSelectionSchema.optional(),
  filters: z.record(z.unknown()).optional(),
});

// Chapter
export const ChapterPageSchema = z.object({
  url: URLSchema.optional(),
  b64: NonEmptyStringSchema.optional(),
  raw: ArrayBufferSchema.optional(),
});

const utf8ByteCount = (value: string): number => Buffer.byteLength(value, "utf8");
const ControlCharacterPattern = /[\u0000-\u001f\u007f-\u009f]/u;
const AbsoluteSchemePattern = /^[a-z][a-z0-9+.-]*:/iu;

const isSafeRelativeResourcePath = (value: string): boolean => {
  if (
    value.length === 0 ||
    value.startsWith("/") ||
    value.startsWith("\\") ||
    value.includes("\\") ||
    value.includes("?") ||
    value.includes("#") ||
    ControlCharacterPattern.test(value) ||
    AbsoluteSchemePattern.test(value) ||
    value.startsWith("//")
  ) {
    return false;
  }

  return !value.split("/").some((segment) => segment === "." || segment === "..");
};

/**
 * Returns the fully decoded canonical relative href, or null when any of the
 * app's four validation layers exposes traversal, authority, or controls.
 */
export const canonicalSourceChapterResourceHref = (
  href: string,
): string | null => {
  let path = href;
  for (let layer = 0; layer < 4; layer += 1) {
    if (!isSafeRelativeResourcePath(path)) {
      return null;
    }

    let decoded: string;
    try {
      decoded = decodeURIComponent(path);
    } catch {
      return null;
    }

    if (decoded === path) {
      return path;
    }
    path = decoded;
  }

  return null;
};

export const isSafeSourceChapterResourceURL = (value: string): boolean => {
  if (ControlCharacterPattern.test(value)) {
    return false;
  }

  try {
    const url = new URL(value);
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      url.hostname.length > 0 &&
      url.username.length === 0 &&
      url.password.length === 0
    );
  } catch {
    return false;
  }
};

const boundedUTF8String = (maximum: number, field: string) =>
  z.string().superRefine((value, context) => {
    const bytes = utf8ByteCount(value);
    if (bytes === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${field} must not be empty`,
      });
    } else if (bytes > maximum) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${field} exceeds ${maximum} UTF-8 bytes`,
      });
    }
  });

export const SourceChapterResourceSchema = z.object({
  href: boundedUTF8String(
    SOURCE_CHAPTER_TEXT_LIMITS.resourceHref,
    "href",
  ).refine((value) => canonicalSourceChapterResourceHref(value) !== null, {
    message: "href must be a strict canonical relative resource path",
  }),
  url: boundedUTF8String(
    SOURCE_CHAPTER_TEXT_LIMITS.resourceURL,
    "url",
  ).refine(isSafeSourceChapterResourceURL, {
    message: "url must be host-bearing HTTP(S) without credentials",
  }),
  mediaType: boundedUTF8String(
    SOURCE_CHAPTER_TEXT_LIMITS.resourceMediaType,
    "mediaType",
  ).optional(),
  context: JsonObjectSchema.optional(),
});

export const SourceChapterTextSchema = z
  .object({
    format: z.nativeEnum(SourceChapterTextFormat),
    body: boundedUTF8String(SOURCE_CHAPTER_TEXT_LIMITS.body, "body"),
    resources: z
      .array(SourceChapterResourceSchema)
      .max(SOURCE_CHAPTER_TEXT_LIMITS.resources)
      .default([]),
  })
  .superRefine((content, context) => {
    const hrefs = new Set<string>();
    content.resources.forEach((resource, index) => {
      const canonical = canonicalSourceChapterResourceHref(resource.href);
      if (canonical !== null && hrefs.has(canonical)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "resource href duplicates an existing canonical href",
          path: ["resources", index, "href"],
        });
      } else if (canonical !== null) {
        hrefs.add(canonical);
      }
    });

    let serialized: string;
    try {
      serialized = JSON.stringify(content);
    } catch {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "chapter content must be JSON serializable",
      });
      return;
    }

    if (utf8ByteCount(serialized) > SOURCE_CHAPTER_TEXT_LIMITS.bridgePayload) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `chapter response exceeds ${SOURCE_CHAPTER_TEXT_LIMITS.bridgePayload} UTF-8 bytes`,
      });
    }
  });

export const ChapterProviderLinkSchema = z.object({
  title: TitleSchema,
  url: URLSchema,
});

export const ChapterProviderSchema = z.object({
  id: NonEmptyStringSchema,
  name: TitleSchema,
  links: z.array(ChapterProviderLinkSchema),
});

export const ChapterItemSchema = z.object({
  number: NonNegativeChapterNumberSchema,
  volume: z.number().optional(),
});

// Acquisition
/** A file request keeps its headers and cookies, which the app sends as given. */
export const AcquisitionRequestSchema = NetworkRequestSchema.extend({
  headers: z.record(z.string(), { invalid_type_error: "Acquisition header values must be strings" }).optional(),
  cookies: z.array(CookieSchema).optional(),
}).superRefine((request, context) => {
  if (!isSafeSourceChapterResourceURL(request.url)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Acquisition URLs must be http(s) with a host and no embedded credentials",
      path: ["url"],
    });
  }
});

export const AcquisitionSchema = z
  .object({
    id: NonEmptyStringSchema,
    format: z.nativeEnum(AcquisitionFormat),
    request: AcquisitionRequestSchema.optional(),
    resolveBeforeDownload: z.boolean().optional(),
    title: TitleSchema.optional(),
    byteCount: z.number().int().positive().optional(),
    fileName: NonEmptyStringSchema.optional(),
  })
  .superRefine((acquisition, context) => {
    if (acquisition.resolveBeforeDownload === true && acquisition.request) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "An acquisition resolved before download omits request; resolveAcquisition supplies it",
        path: ["request"],
      });
    } else if (acquisition.resolveBeforeDownload !== true && !acquisition.request) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "An acquisition needs a request, or resolveBeforeDownload: true with resolveAcquisition",
        path: ["request"],
      });
    }
  });

export const AcquisitionListSchema = z
  .array(AcquisitionSchema)
  .nonempty()
  .superRefine((acquisitions, context) => {
    const seen = new Set<string>();
    acquisitions.forEach((acquisition, index) => {
      if (seen.has(acquisition.id)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate acquisition id "${acquisition.id}"`,
          path: [index, "id"],
        });
      }
      seen.add(acquisition.id);
    });
  });

export const ChapterSchema = z.object({
  id: NonEmptyStringSchema,
  index: UInt32Schema,
  number: ChapterListNumberSchema,
  volume: z.number().optional(),
  isSpecial: z.boolean().optional(),
  language: NonEmptyStringSchema.optional(),
  title: TitleSchema.optional(),
  date: z.date().optional(),
  webUrl: URLSchema.optional(),
  coverImage: URLSchema.optional(),
  data: JsonObjectSchema.optional(),
  providers: z.array(ChapterProviderSchema).optional(),
  isLocked: z.boolean().optional(),
  acquisitions: AcquisitionListSchema.optional(),
});

export const ChapterRequestSchema = z.object({
  contentId: NonEmptyStringSchema,
  chapterId: NonEmptyStringSchema,
  readingMode: z.nativeEnum(ReadingMode).optional(),
  pageNumber: z.number().optional(),
  context: JsonObjectSchema.optional(),
});

// Destination
const propWrapper = <K extends string>(
  key: K,
  props: ZodTypeAny,
  opts?: { nullableTitle?: boolean },
) => {
  const shape: Record<string, ZodTypeAny> = {
    [key]: z.object({
      props,
      title: opts?.nullableTitle
        ? z.string().nullable().optional()
        : z.string().optional(),
    }),
  };

  return z.object(shape);
};

export const URLDestinationSchema = propWrapper("url", URLSchema, {
  nullableTitle: true,
});

export const ContentDestinationSchema = propWrapper(
  "content",
  NonEmptyStringSchema,
  { nullableTitle: true },
);

export const ItemPageDestinationSchema = propWrapper("page", NonEmptyStringSchema, {
  nullableTitle: true,
});

export const ChapterDestinationSchema = propWrapper("chapter", ChapterRequestSchema);

export const ItemListDestinationSchema = propWrapper("list", ItemListRequestSchema, {
  nullableTitle: true,
});

export const NoDestinationSchema = z.object({
  empty: z.object({
    props: z.object({}),
  }),
});

export const DestinationSchema = z.union([
  URLDestinationSchema,
  ContentDestinationSchema,
  ItemPageDestinationSchema,
  ChapterDestinationSchema,
  ItemListDestinationSchema,
  NoDestinationSchema,
]);

// Tags + filter
export const LabeledOptionSchema = z.object({
  id: NonEmptyStringSchema,
  title: TitleSchema,
});

export const TagSchema = z.object({
  id: NonEmptyStringSchema,
  title: TitleSchema,
  rating: z.nativeEnum(ContentRating).optional(),
  destination: DestinationSchema.optional(),
});

export const TagSectionSchema = z.object({
  id: NonEmptyStringSchema,
  title: TitleSchema,
  subtitle: z.string().optional(),
  destination: DestinationSchema.optional(),
  tags: NonEmptyArray(TagSchema),
});

export const ToggleFilterSchema = propWrapper("toggle", z.boolean());
export const PickerFilterSchema = propWrapper("picker", NonEmptyArray(LabeledOptionSchema));
export const SelectFilterPropsSchema = z.object({
  options: NonEmptyArray(LabeledOptionSchema),
  exclude: z.boolean(),
});
export const SelectFilterSchema = propWrapper("select", SelectFilterPropsSchema);
export const TextFilterSchema = propWrapper("text", z.boolean());

export const SearchFilterKindSchema = z.union([
  ToggleFilterSchema,
  PickerFilterSchema,
  SelectFilterSchema,
  TextFilterSchema,
]);

export const SearchFilterSchema = z.object({
  id: NonEmptyStringSchema,
  title: TitleSchema,
  subtitle: z.string().optional(),
  kind: SearchFilterKindSchema,
});

export const PopulatedFiltersSchema = z.record(z.unknown());

// Form
export const IncludeExcludeSchema = z.object({
  include: z.array(NonEmptyStringSchema),
  exclude: z.array(NonEmptyStringSchema),
});

const valueProviding = (valueSchema: ZodTypeAny) =>
  z.object({
    id: NonEmptyStringSchema,
    title: TitleSchema,
    currentValue: valueSchema.nullable().optional(),
    defaultValue: valueSchema.nullable().optional(),
  });

export const UITogglePropsSchema = valueProviding(z.boolean());
export const UIDatePickerPropsSchema = valueProviding(z.date()).extend({
  max: z.date().nullable().optional(),
  min: z.date().nullable().optional(),
});

export const UIPickerPropsSchema = valueProviding(NonEmptyStringSchema).extend({
  options: NonEmptyArray(LabeledOptionSchema),
});

export const UISelectPropsSchema = valueProviding(IncludeExcludeSchema).extend({
  options: NonEmptyArray(LabeledOptionSchema),
  exclude: z.boolean(),
});

export const UIStepperPropsSchema = valueProviding(z.number()).extend({
  upperBound: z.number().optional(),
  lowerBound: z.number().optional(),
  allowDecimal: z.boolean().optional(),
  step: z.number().optional(),
});

export const UITextFieldPropsSchema = valueProviding(z.string()).extend({
  placeholder: z.string().optional(),
  keyboardType: z.nativeEnum(UIKeyboardType).optional(),
  isSecure: z.boolean().optional(),
  isMultiline: z.boolean().optional(),
});

export const UIWebViewButtonPropsSchema = z.object({
  url: BasicURLSchema,
  title: TitleSchema,
});

export const UIOAuthButtonPropsSchema = z.object({
  url: BasicURLSchema,
  title: TitleSchema,
});

export const UIToggleSchema = propWrapper("toggle", UITogglePropsSchema);
export const UIDatePickerSchema = propWrapper("datepicker", UIDatePickerPropsSchema);
export const UIPickerSchema = propWrapper("picker", UIPickerPropsSchema);
export const UISelectSchema = propWrapper("select", UISelectPropsSchema);
export const UIStepperSchema = propWrapper("stepper", UIStepperPropsSchema);
export const UITextFieldSchema = propWrapper("textfield", UITextFieldPropsSchema);
export const UIWebViewButtonSchema = propWrapper("webview", UIWebViewButtonPropsSchema);
export const UIOAuthButtonSchema = propWrapper("oauth", UIOAuthButtonPropsSchema);

export const UIViewSchema = z.union([
  UIToggleSchema,
  UIDatePickerSchema,
  UIPickerSchema,
  UISelectSchema,
  UIStepperSchema,
  UITextFieldSchema,
  UIWebViewButtonSchema,
  UIOAuthButtonSchema,
]);

export const UISectionSchema = z.object({
  header: z.string().optional(),
  footer: z.string().optional(),
  views: NonEmptyArray(UIViewSchema),
});

export const UIFormSchema = z.object({
  sections: NonEmptyArray(UISectionSchema),
});

export const PopulatedFormSchema = z.record(z.unknown());

// Content + item/page
export const ProgressUpdateSchema = z.object({
  chapter: NonNegativeChapterNumberSchema.optional(),
  volume: z.number().optional(),
  status: z.nativeEnum(TrackStatus).optional(),
});

export const CurrentReadingStateSchema = z.object({
  number: NonNegativeChapterNumberSchema,
  volume: z.number().optional(),
  page: z.number(),
  progress: z.number(),
  readDate: z.date(),
  chapterId: z.string().optional(),
});

export const ProgressStateSchema = z.object({
  readChapterIds: NonEmptyArray(NonEmptyStringSchema).optional(),
  currentState: CurrentReadingStateSchema.optional(),
  systemMarkBelowCurrentAsRead: z.boolean().optional(),
});

const ReadChapterSetSchema = z.custom<Set<number>>(
  (value) =>
    value instanceof Set &&
    Array.from(value).every(
      (item) => typeof item === "number" && Number.isFinite(item) && item >= 0,
    ),
  "Expected Set<number> with non-negative finite chapter numbers",
);

export const ContentProgressDataSchema = z.object({
  status: z.nativeEnum(TrackStatus).optional(),
  readChapters: z
    .union([z.array(NonNegativeChapterNumberSchema), ReadChapterSetSchema])
    .optional(),
  progress: NonNegativeChapterNumberSchema.optional(),
  lastReadDate: z.date().optional(),
});

export const ItemSchema = z.object({
  id: NonEmptyStringSchema,
  title: TitleSchema,
  subtitle: z.string().optional(),
  coverImage: URLSchema.optional(),
  bannerImage: URLSchema.optional(),
  webUrl: URLSchema.optional(),
  statistics: StatisticsSchema.optional(),
  rating: z.nativeEnum(ContentRating),
  trackStatus: z.nativeEnum(TrackStatus).optional(),
  destination: DestinationSchema.optional(),
  context: JsonObjectSchema.optional(),
});

export const ItemCollectionSchema = z.object({
  id: NonEmptyStringSchema,
  title: TitleSchema,
  subtitle: z.string().optional(),
  items: NonEmptyArray(ItemSchema),
  destination: DestinationSchema.optional(),
});

export const PagedItemListSchema = z.object({
  total: z.number().optional(),
  isLastPage: z.boolean().optional(),
  items: NonEmptyArray(ItemSchema),
});

export const LibrarySyncResponseSchema = z.object({
  full: z.array(ItemSchema),
});

export const SortOptionsSchema = z.object({
  options: NonEmptyArray(LabeledOptionSchema),
  disableOrdering: z.boolean().optional(),
});

export const CharacterSchema = z.object({
  name: TitleSchema,
  role: z.string().optional(),
  image: URLSchema.optional(),
  destination: DestinationSchema.optional(),
});

export const CreditSchema = z.object({
  name: TitleSchema,
  role: z.string().optional(),
  image: URLSchema.optional(),
  destination: DestinationSchema.optional(),
});

export const WebLinkSchema = z.object({
  title: TitleSchema,
  url: URLSchema,
});

export const AdditionalDetailsSchema = z.record(z.string(), z.string());

export const ContentSchema = z.object({
  title: TitleSchema,
  coverImage: URLSchema,
  bannerImage: URLSchema.optional(),
  artworks: NonEmptyArray(URLSchema).optional(),
  webUrl: URLSchema.optional(),
  rating: z.nativeEnum(ContentRating),
  status: z.nativeEnum(ContentStatus).optional(),
  contentType: z.nativeEnum(ContentType).optional(),
  readingMode: z.nativeEnum(ReadingMode).optional(),
  statistics: StatisticsSchema.optional(),
  credits: NonEmptyArray(CreditSchema).optional(),
  summary: z.string().optional(),
  additionalTitles: NonEmptyArray(TitleSchema).optional(),
  additionalDetails: AdditionalDetailsSchema.optional(),
  genres: NonEmptyArray(TagSchema).optional(),
  properties: NonEmptyArray(TagSectionSchema).optional(),
  collections: NonEmptyArray(ItemCollectionSchema).optional(),
  links: NonEmptyArray(WebLinkSchema).optional(),
  characters: NonEmptyArray(CharacterSchema).optional(),
  views: NonEmptyArray(UISectionSchema).optional(),
  endpoints: z.record(z.string(), z.string()).optional(),
  trackStatus: z.nativeEnum(TrackStatus).optional(),
  progress: ProgressStateSchema.optional(),
  context: JsonObjectSchema.optional(),
  chapters: NonEmptyArray(ChapterSchema).optional(),
  acquisitions: AcquisitionListSchema.optional(),
  flags: z.number().optional(),
});

export const SourceUpdateItemSchema = z.object({
  id: NonEmptyStringSchema,
  count: z.number(),
  chapters: NonEmptyArray(NonNegativeChapterNumberSchema),
});

export const GroupedUpdateResponseSchema = z.object({
  updates: NonEmptyArray(SourceUpdateItemSchema),
});

export const UpdateItemSchema = z.object({
  id: NonEmptyStringSchema,
  count: z.number(),
  chapters: NonEmptyArray(NonNegativeChapterNumberSchema),
});

export const UpdateResponseSchema = z.object({
  updates: NonEmptyArray(UpdateItemSchema),
});

export const ItemPageSectionSchema = z.object({
  id: NonEmptyStringSchema,
  title: TitleSchema,
  subtitle: z.string().optional(),
  style: z.nativeEnum(PageSectionStyle).optional(),
  items: NonEmptyArray(ItemSchema).optional(),
  destination: DestinationSchema.optional(),
});

export const ItemPageResponseSchema = z.object({
  sections: NonEmptyArray(ItemPageSectionSchema),
  isLastPage: z.boolean(),
});

export const HomePageFeedContentSchema = z.object({
  page: NonEmptyStringSchema.optional(),
  list: ItemListRequestSchema.optional(),
});

export const HomePageFeedSchema = z.object({
  id: NonEmptyStringSchema,
  title: TitleSchema,
  content: HomePageFeedContentSchema,
});

export const HomePageSchema = z.object({
  feeds: NonEmptyArray(HomePageFeedSchema),
});

export const SourceFeedContentSchema = z.object({
  page: NonEmptyStringSchema.optional(),
  list: ItemListRequestSchema.optional(),
  search: SearchRequestSchema.optional(),
});

const hasExactlyOneSourceFeedPayload = (
  content: z.infer<typeof SourceFeedContentSchema>,
): boolean => {
  const payloadCount =
    (typeof content.page !== "undefined" ? 1 : 0) +
    (typeof content.list !== "undefined" ? 1 : 0) +
    (typeof content.search !== "undefined" ? 1 : 0);
  return payloadCount === 1;
};

export const SourceFeedSchema = z.object({
  id: NonEmptyStringSchema,
  title: TitleSchema,
  content: SourceFeedContentSchema,
});

export const SourceFeedArraySchema = z
  .array(SourceFeedSchema)
  .transform((feeds) =>
    feeds.filter((feed) => hasExactlyOneSourceFeedPayload(feed.content)),
  );

export const SourceInfoSchema = z.object({
  id: NonEmptyStringSchema,
  name: TitleSchema,
  version: z.number(),
  website: URLSchema,
  rating: z.nativeEnum(ContentRating),
  thumbnail: URLSchema.optional(),
  minSupportedAppVersion: z
    .string()
    .regex(/^\d+(?:\.\d+)*$/, "Expected a numeric dotted app version")
    .optional(),
  languages: NonEmptyArray(NonEmptyStringSchema),
});

export const DelegateSchema = z.object({
  getConfiguration: FunctionSchema.optional(),
  getHomePage: FunctionSchema.optional(),
  getSearchResults: FunctionSchema,
  getSortOptions: FunctionSchema.optional(),
  getSearchFilters: FunctionSchema.optional(),
  getCustomFeeds: FunctionSchema.optional(),
  getSettingsPage: FunctionSchema.optional(),
  onFormSubmitted: FunctionSchema.optional(),
  handleOAuthCallback: FunctionSchema.optional(),
  clearAuthentication: FunctionSchema.optional(),
  getItemList: FunctionSchema,
  getItemPage: FunctionSchema.optional(),
  getPageSectionItems: FunctionSchema.optional(),
  getContent: FunctionSchema,
  getChapters: FunctionSchema.optional(),
  getChapterPages: FunctionSchema.optional(),
  getChapterText: FunctionSchema.optional(),
  willRequestImage: FunctionSchema.optional(),
  redrawImage: FunctionSchema.optional(),
  resolveAcquisition: FunctionSchema.optional(),
  getContentProgress: FunctionSchema.optional(),
  synchronizeLibrary: FunctionSchema.optional(),
  onContentsAddedToLibrary: FunctionSchema.optional(),
  onContentsRemovedFromLibrary: FunctionSchema.optional(),
  onChaptersMarked: FunctionSchema.optional(),
  onPageRead: FunctionSchema.optional(),
  onChapterProgress: FunctionSchema.optional(),
  getTrackEntryPage: FunctionSchema.optional(),
});

// Toolchain entry schemas
export const SourceVariantSchema = z.object({
  id: NonEmptyStringSchema,
  name: TitleSchema.optional(),
  languages: NonEmptyArray(NonEmptyStringSchema).optional(),
  config: SourceConfigurationSchema.optional(),
  args: z.record(z.unknown()).optional(),
});

export const SourceClassSchema = FunctionSchema;
export const SourceEntrySchema = FunctionSchema;

// Runtime capability validators
const hasMethod = (value: unknown, key: string): boolean =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as Record<string, unknown>)[key] === "function";

export const NetworkClientInstanceSchema = z.custom(
  (value) => hasMethod(value, "request") && hasMethod(value, "get") && hasMethod(value, "post"),
  "Expected NetworkClient-like object",
);

export const STTStoreInstanceSchema = z.custom(
  (value) =>
    hasMethod(value, "get") &&
    hasMethod(value, "set") &&
    hasMethod(value, "remove") &&
    hasMethod(value, "string") &&
    hasMethod(value, "boolean") &&
    hasMethod(value, "number") &&
    hasMethod(value, "stringArray") &&
    hasMethod(value, "object"),
  "Expected STTStore-like object",
);

export const NetworkErrorLikeSchema = z.custom(
  (value) =>
    value instanceof Error &&
    typeof (value as { req?: unknown }).req !== "undefined" &&
    typeof (value as { res?: unknown }).res !== "undefined",
  "Expected NetworkError-like object",
);

export const CloudflareErrorLikeSchema = z.custom(
  (value) =>
    value instanceof Error &&
    (typeof (value as { resolutionURL?: unknown }).resolutionURL === "string" ||
      typeof (value as { resolutionURL?: unknown }).resolutionURL === "undefined"),
  "Expected CloudflareError-like object",
);

export class DelegateValidationError extends Error {
  readonly method: string;
  readonly context: string;
  readonly zodError: ZodError;

  constructor(method: string, context: string, zodError: ZodError) {
    super(
      `[${context}] ${method} returned invalid data: ${zodError.issues
        .map((issue) => {
          const path = issue.path.length === 0 ? "<root>" : issue.path.join(".");
          return `${path}: ${issue.message}`;
        })
        .join("; ")}`,
    );
    this.name = "DelegateValidationError";
    this.method = method;
    this.context = context;
    this.zodError = zodError;
  }
}

export const parseWithSchema = <T>(
  schema: z.ZodType<T>,
  value: unknown,
  label: string,
): T => {
  const parsed = schema.safeParse(value);
  if (parsed.success) {
    return parsed.data;
  }

  throw new DelegateValidationError(label, "schema", parsed.error);
};

export const DelegateResultSchemaMap = {
  getConfiguration: SourceConfigurationSchema,
  getHomePage: HomePageSchema,
  getSearchResults: PagedItemListSchema,
  getSortOptions: SortOptionsSchema,
  getSearchFilters: NonEmptyArray(SearchFilterSchema),
  getCustomFeeds: SourceFeedArraySchema,
  getSettingsPage: z.union([UIFormSchema, z.null()]),
  getItemList: PagedItemListSchema,
  getItemPage: ItemPageResponseSchema,
  getPageSectionItems: NonEmptyArray(ItemSchema),
  getContent: ContentSchema,
  getChapters: NonEmptyArray(ChapterSchema),
  getChapterPages: NonEmptyArray(ChapterPageSchema),
  getChapterText: SourceChapterTextSchema,
  willRequestImage: NetworkRequestSchema,
  resolveAcquisition: AcquisitionRequestSchema,
  redrawImage: z.union([RedrawSchema, z.null()]),
  getContentProgress: z.union([ContentProgressDataSchema, z.null()]),
  synchronizeLibrary: z.union([LibrarySyncResponseSchema, z.null()]),
  getTrackEntryPage: UIFormSchema,
} satisfies Record<string, ZodTypeAny>;

export type DelegateValidationMethod = keyof typeof DelegateResultSchemaMap;

export const validateDelegateMethodResult = <T>(
  method: DelegateValidationMethod,
  result: unknown,
  context: string,
): T => {
  const schema = DelegateResultSchemaMap[method];
  const parsed = schema.safeParse(result);
  if (parsed.success) {
    return parsed.data as T;
  }

  throw new DelegateValidationError(method, context, parsed.error);
};

type AcquisitionHolder = { acquisitions?: { resolveBeforeDownload?: boolean }[] };

/** Paths of acquisitions that only `resolveAcquisition` can turn into a request. */
const resolvedAcquisitionPaths = (method: string, result: unknown): (string | number)[][] => {
  const paths = (holder: AcquisitionHolder | undefined, prefix: (string | number)[]) =>
    (holder?.acquisitions ?? []).flatMap((acquisition, index) =>
      acquisition.resolveBeforeDownload === true ? [[...prefix, "acquisitions", index, "resolveBeforeDownload"]] : [],
    );
  if (method === "getContent") {
    const content = result as AcquisitionHolder & { chapters?: AcquisitionHolder[] };
    return [
      ...paths(content, []),
      ...(content.chapters ?? []).flatMap((chapter, index) => paths(chapter, ["chapters", index])),
    ];
  }
  if (method === "getChapters") {
    return (result as AcquisitionHolder[]).flatMap((chapter, index) => paths(chapter, [index]));
  }
  return [];
};

/** A file that must be resolved is unusable when the source has no resolver. */
const requireAcquisitionResolver = <T>(
  delegate: Record<string, unknown>,
  method: string,
  result: T,
  context: string,
): T => {
  if (typeof delegate.resolveAcquisition === "function") {
    return result;
  }
  const paths = resolvedAcquisitionPaths(method, result);
  if (paths.length > 0) {
    throw new DelegateValidationError(
      method,
      context,
      new ZodError(
        paths.map((path) => ({
          code: z.ZodIssueCode.custom,
          message: "resolveBeforeDownload needs the source to implement resolveAcquisition",
          path,
        })),
      ),
    );
  }
  return result;
};

const isPromise = (value: unknown): value is Promise<unknown> =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as { then?: unknown }).then === "function";

export const wrapDelegateWithValidation = <T extends Record<string, any>>(
  delegate: T,
  context: string = "delegate",
): T => {
  return new Proxy(delegate, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);

      if (typeof prop !== "string" || typeof value !== "function") {
        return value;
      }

      const schema = (DelegateResultSchemaMap as Record<string, ZodTypeAny | undefined>)[
        prop
      ];

      if (!schema) {
        return value;
      }

      return (...args: unknown[]) => {
        const fn = value as (...innerArgs: unknown[]) => unknown;
        const output = Reflect.apply(fn, target, args);

        const validate = (result: unknown) =>
          requireAcquisitionResolver(
            target,
            prop,
            validateDelegateMethodResult(prop as DelegateValidationMethod, result, context),
            context,
          );

        if (isPromise(output)) {
          return output.then(validate);
        }

        return validate(output);
      };
    },
  });
};
