export type CGSize = {
  width: number;
  height: number;
};

export type CGRect = {
  origin: {
    x: number;
    y: number;
  };
  size: CGSize;
};

export type RedrawInstruction = {
  source: CGRect;
  destination: CGRect;
};

export type Redraw = {
  size: CGSize;
  commands: RedrawInstruction[];
};

export type RedrawImageRequest = {
  url: string;
  size: CGSize;
};
