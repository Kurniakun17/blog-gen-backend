/**
 * Type definitions for WordPress formatter
 */

import type { BlogDraft } from "../writer";

export type { BlogDraft };

export type WordPressOutput = {
  title: string;
  slug: string;
  content: string;
  categoryId: number;
  bannerId: number;
  faqs: FAQPair[];
  tags?: string[];
  text: string;
  liveBlogURL: string;
};

export type FAQPair = {
  question: string;
  answer: string;
};

export type AssetReplacement = {
  original_block: string;
  replacement: string;
};

export type ACFTextBlockData = {
  field_6715dedc50efc: string;
  field_6715039fee6af: string;
  field_6888272655220: string;
  field_66fff0b6f3af2: string;
};

export type ACFTextBlock = {
  name: string;
  data: ACFTextBlockData;
  mode: string;
};

export type ACFFAQData = {
  field_6875a8b5518bb: string;
  field_66f4341f99ab7: string;
  field_688a6059f04d4: string;
  field_66f4343092557: Record<
    string,
    { field_66f4343792558: string; field_66f4343e92559: string }
  >;
  field_685b7e6886ffd: string;
  field_685b7e6d86ffe: {
    title: string;
    url: string;
    target: string;
  };
};

export type ACFFAQBlock = {
  name: string;
  data: ACFFAQData;
  mode: string;
};
