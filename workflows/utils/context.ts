/**
 * Merge optional user-provided context into the research block so it is not lost.
 */
export function mergeResearchContext(
  research: string,
  metadataContext?: string,
  outline?: string,
  companyProfile?: string
): string {
  const blocks: string[] = [];

  const trimmedMetadataContext = metadataContext?.trim();
  if (trimmedMetadataContext) {
    blocks.push(
      "<metadata_context>",
      trimmedMetadataContext,
      "</metadata_context>"
    );
  }

  const trimmedOutline = outline?.trim();
  if (trimmedOutline) {
    blocks.push("<outline_seed>", trimmedOutline, "</outline_seed>");
  }

  const trimmedCompanyProfile = companyProfile?.trim();
  if (trimmedCompanyProfile) {
    blocks.push(
      "<company_profile>",
      trimmedCompanyProfile,
      "</company_profile>"
    );
  }

  blocks.push(research);

  return blocks.join("\n\n");
}
