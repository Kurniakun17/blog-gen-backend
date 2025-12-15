import { fetchCompanyProfile, type CompanyProfile } from "@/lib/company";
import { runStep, type TimedResult } from "../../utils/steps";

type CompanyProfileStepInput = {
  company_url?: string | null;
  internalUsage?: boolean | null;
  additionalContext?: string | null;
};

export async function companyProfileStep(
  input: CompanyProfileStepInput
): Promise<TimedResult<CompanyProfile>> {
  return runStep(
    "company_profile",
    {
      companyUrl: input.company_url,
      internalUsage: input.internalUsage,
    },
    async () => {
      "use step";
      const companyProfile = await fetchCompanyProfile({
        companyUrl: input.company_url ?? undefined,
        existingContext: input.additionalContext ?? undefined,
        internalUsage: input.internalUsage ?? undefined,
      });
      console.log(
        `\n========== Company Profile Result ==========\n`,
        companyProfile
      );
      return {
        value: companyProfile,
        completeData: {
          source: companyProfile.source,
          hasProfile: Boolean(companyProfile.company_profile),
        },
      };
    }
  );
}
