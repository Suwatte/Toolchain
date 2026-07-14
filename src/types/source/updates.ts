export type UpdateItem = {
  id: string;
  count: number;
  chapters: number[];
};

export type UpdateResponse = {
  updates: UpdateItem[];
};
