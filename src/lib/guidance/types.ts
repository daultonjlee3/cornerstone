export type GuidanceLayer = "live-demo" | "product-tour" | "onboarding-guide";

export type GuidanceStep = {
  id: string;
  title: string;
  content: string;
  selector: string;
  route?: string;
  position?: "top" | "right" | "bottom" | "left" | "auto";
};

export type GuidanceTour = {
  id: string;
  name: string;
  layer: GuidanceLayer;
  routePrefix?: string;
  allowReplay?: boolean;
  steps: GuidanceStep[];
};

export type GuidanceStartOptions = {
  force?: boolean;
};
