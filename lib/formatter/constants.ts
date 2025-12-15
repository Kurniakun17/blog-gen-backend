/**
 * Constants for WordPress formatter
 */

/**
 * Map of keywords to WordPress Category IDs
 */
export const CATEGORY_MAP: Record<string, number> = {
  'alternatives': 2338,
  'confluence': 14,
  'freshdesk': 799,
  'google docs': 47,
  'google drive': 2290,
  'gorgias': 801,
  'intercom': 776,
  'jira': 1600,
  'microsoft sharepoint': 2326,
  'sharepoint': 2326,
  'microsoft teams': 2278,
  'teams': 2278,
  'notion': 15,
  'pdf': 2302,
  'shopify': 1602,
  'slack': 1598,
  'youtube': 2314,
  'zendesk': 13,
  'guide': 31,
};

/**
 * Map of WordPress Category IDs to their associated Banner IDs
 */
export const CATEGORY_BANNER_MAP: Record<number, number[]> = {
  13: [18328, 18429, 18496, 23935, 33715, 33820, 33977, 34306], // zendesk
  1600: [17381, 18531, 19520, 23982, 28285], // jira
  776: [17567, 18337, 18487, 19507, 20238, 28216], // intercom
  14: [18539, 18904, 23873, 27744], // confluence
  799: [19523, 24160, 27972, 36065], // freshdesk
  1598: [17905, 25700, 31338], // slack
  1602: [17963, 18809, 23828, 24150], // shopify
  2326: [18005, 25546, 26383, 28237], // microsoft sharepoint/sharepoint
  2278: [23864, 25734], // microsoft teams/teams
  2290: [18395, 23849], // google drive
  15: [19472, 23855, 25530], // notion
  801: [19487, 19497, 28306], // gorgias
  47: [33929], // google docs
};

/**
 * Default guide banner IDs for categories without specific banners
 */
export const GUIDE_BANNER_IDS = [
  19849, 19890, 19910, 19932, 19942, 19967, 20014, 20034, 20047,
  20128, 20214, 20492, 20576, 20623, 20636, 20655, 20684, 21100,
  21166, 21214,
];
