import type { SourceInfo } from "@suwatte/toolchain/types";
import {
  ControlledNovelSource,
  controlledNovelInfo,
} from "../../shared/ControlledNovelSource";

export default class ControlledNovelJSCSource extends ControlledNovelSource {
  static readonly info: SourceInfo = {
    ...controlledNovelInfo,
    id: "en.sample.suwatte.app.jsc",
  };
}
