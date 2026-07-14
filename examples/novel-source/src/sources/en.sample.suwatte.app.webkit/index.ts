"use webkit";

import type { SourceInfo } from "@suwatte/toolchain/types";
import {
  ControlledNovelSource,
  controlledNovelInfo,
} from "../../shared/ControlledNovelSource";

export default class ControlledNovelWebKitSource extends ControlledNovelSource {
  static readonly info: SourceInfo = {
    ...controlledNovelInfo,
    id: "en.sample.suwatte.app.webkit",
  };
}
