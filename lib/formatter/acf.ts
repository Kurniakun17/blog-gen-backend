/**
 * ACF (Advanced Custom Fields) block builders for WordPress
 */

import type { FAQPair, ACFTextBlock, ACFTextBlockData, ACFFAQBlock, ACFFAQData } from './types';

/**
 * Build WordPress ACF text block
 */
export function buildTextBlock(mainContent: string): ACFTextBlock {
  const textblockData: ACFTextBlockData = {
    field_6715dedc50efc: '0',
    field_6715039fee6af: '',
    field_6888272655220: 'markdownV2',
    field_66fff0b6f3af2: mainContent.replace(/^#.*?\n\n/, ''),
  };

  return {
    name: 'acf/textblock',
    data: textblockData,
    mode: 'edit',
  };
}

/**
 * Build WordPress ACF FAQ block
 */
export function buildFAQBlock(faqPairs: FAQPair[]): ACFFAQBlock {
  const faqData: ACFFAQData = {
    field_6875a8b5518bb: 'default',
    field_66f4341f99ab7: 'Frequently asked questions',
    field_688a6059f04d4: 'markdown',
    field_66f4343092557: {},
    field_685b7e6886ffd: '',
    field_685b7e6d86ffe: {
      title: '',
      url: '',
      target: '',
    },
  };

  if (faqPairs && faqPairs.length > 0) {
    faqPairs.forEach((faq, index) => {
      faqData.field_66f4343092557[`row-${index}`] = {
        field_66f4343792558: faq.question || 'none',
        field_66f4343e92559: faq.answer || 'none',
      };
    });
  }

  return {
    name: 'acf/faqs',
    data: faqData,
    mode: 'edit',
  };
}
