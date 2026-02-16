export type FontWeight = number;

export type FontStyle = string;

export interface FontVariant {
  id: string;
  family: string;
  style: FontStyle;
  weight: FontWeight;
  path: string;
  postscriptName?: string;
  fullName?: string;
  isSystemCore?: boolean;
}

export interface FontFamily {
  family: string;
  variants: FontVariant[];
}

export interface ListFontsResult {
  families: FontFamily[];
  totalFamilies: number;
  totalVariants: number;
}
