import { JsonObject, PropWrapper } from "../utils";
import type { BasicURL } from "../networking";
import { LabeledOption } from "./tag";

export type UIForm = {
  sections: UISection[];
};

export type UISection = {
  header?: string;
  footer?: string;
  views: UIView[];
};

export type ValueProviding<T> = {
  id: string;
  title: string;
  currentValue?: T | null;
  defaultValue?: T | null;
};

// -- Enums

export enum UIKeyboardType {
  ALPHANUMERIC,
  EMAIL,
  NUMERIC,
  NUMERIC_DECIMAL,
}

// -- Props Types

export type UIToggleProps = ValueProviding<boolean>;

export type UIDatePickerProps = ValueProviding<Date> & {
  max?: Date | null;
  min?: Date | null;
};

export type UIPickerProps = ValueProviding<string> & {
  options: LabeledOption[];
};

export type UISelectProps = ValueProviding<IncludeExclude> & {
  options: LabeledOption[];
  exclude: boolean;
};

export type IncludeExclude = { include: string[]; exclude: string[] };

export type UIStepperProps = ValueProviding<number> & {
  upperBound?: number;
  lowerBound?: number;
  allowDecimal?: boolean;
  step?: number;
};

export type UITextFieldProps = ValueProviding<string> & {
  placeholder?: string;
  keyboardType?: UIKeyboardType;
  isSecure?: boolean;
  isMultiline?: boolean;
};

export type UIWebViewButtonProps = {
  url: BasicURL;
  title: string;
};

export type UIOAuthButtonProps = {
  url: BasicURL;
  title: string;
};

// -- View Types

export type UIToggle = PropWrapper<"toggle", UIToggleProps>;
export type UIDatePicker = PropWrapper<"datepicker", UIDatePickerProps>;
export type UIPicker = PropWrapper<"picker", UIPickerProps>;
export type UISelect = PropWrapper<"select", UISelectProps>;
export type UIStepper = PropWrapper<"stepper", UIStepperProps>;
export type UITextField = PropWrapper<"textfield", UITextFieldProps>;
export type UIWebViewButton = PropWrapper<"webview", UIWebViewButtonProps>;
export type UIOAuthButton = PropWrapper<"oauth", UIOAuthButtonProps>;

export type UIView =
  | UIToggle
  | UIDatePicker
  | UIPicker
  | UISelect
  | UIStepper
  | UITextField
  | UIWebViewButton
  | UIOAuthButton;

// -- View Constructor Functions

export function UIToggle(props: UIToggleProps): UIToggle {
  return {
    toggle: { props },
  };
}

export function UIDatePicker(props: UIDatePickerProps): UIDatePicker {
  return {
    datepicker: { props },
  };
}

export function UIPicker(props: UIPickerProps): UIPicker {
  return {
    picker: { props },
  };
}

export function UISelect(props: UISelectProps): UISelect {
  return {
    select: {
      props,
    },
  };
}

export function UIStepper(props: UIStepperProps): UIStepper {
  return {
    stepper: { props },
  };
}

export function UITextField(props: UITextFieldProps): UITextField {
  return {
    textfield: { props },
  };
}

export function UIWebViewButton(props: UIWebViewButtonProps): UIWebViewButton {
  return {
    webview: {
      props,
    },
  };
}

export function UIOAuthButton(props: UIOAuthButtonProps): UIOAuthButton {
  return {
    oauth: {
      props,
    },
  };
}

// -- Populated Form

export type FormSchema = Record<string, UIView>;

type ResolveViewKind<T extends UIView> = T extends UIToggle
  ? boolean
  : T extends UIDatePicker
    ? string
    : T extends UIPicker
      ? string
      : T extends UISelect
        ? { include: string[]; exclude: string[] }
        : T extends UIStepper
          ? number
          : T extends UITextField
            ? string
            : T extends UIWebViewButton
              ? never
              : T extends UIOAuthButton
                ? never
                : never;

export type PopulatedForm<T extends FormSchema = FormSchema> = {
  [K in keyof T]: ResolveViewKind<T[K]>;
};
