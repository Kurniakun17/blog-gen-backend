import { NextRequest, NextResponse } from "next/server";
import { assetsDefinerStep } from "@/workflows/steps/assets/assetsDefiner";

export async function POST(req: NextRequest) {
  try {
    console.log("\n========== ASSETS DEFINER TEST STARTING ==========\n");

    const body = await req.json();
    const { content, keyword, blogType, internalUsage, youtubeResults } = body;

    if (!content || !keyword) {
      return NextResponse.json(
        { error: "Missing required fields: content, keyword" },
        { status: 400 }
      );
    }

    console.log("Test Configuration:");
    console.log("- Keyword:", keyword);
    console.log("- Blog Type:", blogType);
    console.log("- Internal Usage:", internalUsage);
    console.log("- Content Length:", content.length, "characters");
    console.log("\n");

    // Run the assets definer step
    const result = await assetsDefinerStep({
      content,
      keyword,
      blogType: blogType || "",
      youtubeResults: youtubeResults,
      internalUsage: internalUsage || false,
    });

    console.log("\n========== ASSETS DEFINER TEST RESULTS ==========\n");
    console.log("Duration:", result.durationMs, "ms");
    console.log("Output Length:", result.value.length, "characters");

    // Analyze the output
    const assetBlocks = result.value.match(/<assets>[\s\S]*?<\/assets>/g) || [];
    console.log("\nTotal <assets> blocks found:", assetBlocks.length);

    // Count asset types
    const assetTypes = {
      screenshots: 0,
      eesel_internal_asset: 0,
      workflow: 0,
      infographic: 0,
    };

    const assetDetails: Array<{
      type: string;
      content: string;
      context: string;
    }> = [];

    assetBlocks.forEach((block, index) => {
      // Get context (100 chars before the block)
      const blockIndex = result.value.indexOf(block);
      const contextStart = Math.max(0, blockIndex - 200);
      const contextBefore = result.value
        .substring(contextStart, blockIndex)
        .trim();

      // Determine asset type
      let assetType = "unknown";
      if (block.includes("screenshot")) {
        assetTypes.screenshots++;
        assetType = "screenshot";
      } else if (block.includes("eesel_internal_asset")) {
        assetTypes.eesel_internal_asset++;
        assetType = "eesel_internal_asset";
      } else if (block.includes("workflow")) {
        assetTypes.workflow++;
        assetType = "workflow";
      } else if (block.includes("infographic")) {
        assetTypes.infographic++;
        assetType = "infographic";
      }

      assetDetails.push({
        type: assetType,
        content: block,
        context: contextBefore,
      });

      // console.log(`\n--- Asset Block ${index + 1} (${assetType}) ---`);
      // console.log("Context before asset:");
      // console.log(contextBefore.slice(-200));
      // console.log("\nAsset block:");
      // console.log(block);
    });

    console.log("\n========== ASSET TYPE SUMMARY ==========");
    console.log("Screenshots:", assetTypes.screenshots);
    console.log("Eesel Internal Assets:", assetTypes.eesel_internal_asset);
    console.log("Workflows:", assetTypes.workflow);
    console.log("Infographics:", assetTypes.infographic);

    // Validation checks
    console.log("\n========== VALIDATION CHECKS ==========");

    // Check 1: Gorgias section should NOT have eesel internal asset
    const gorgiasSectionMatch = result.value.match(
      /### 2\. \[Gorgias\][\s\S]*?(?=###|$)/
    );
    if (gorgiasSectionMatch) {
      const gorgiasSection = gorgiasSectionMatch[0];
      const hasEeselAsset = gorgiasSection.includes("eesel_internal_asset");
      console.log(
        "✓ Check 1: Gorgias section has eesel_internal_asset:",
        hasEeselAsset ? "❌ FAIL (should be false)" : "✅ PASS"
      );
    }

    // Check 2: eesel AI section SHOULD have eesel internal asset
    const eeselSectionMatch = result.value.match(
      /### 3\. \[eesel AI\][\s\S]*?(?=###|$)/
    );
    if (eeselSectionMatch) {
      const eeselSection = eeselSectionMatch[0];
      const hasEeselAsset = eeselSection.includes("eesel_internal_asset");
      console.log(
        "✓ Check 2: eesel AI section has eesel_internal_asset:",
        hasEeselAsset ? "✅ PASS" : "❌ FAIL (should be true)"
      );
    }

    // Check 3: All listicle items should have screenshots
    const listicleItems = result.value.match(/### \d+\. \[.*?\]/g) || [];
    const screenshotsCount = assetTypes.screenshots;
    console.log(
      `✓ Check 3: All ${listicleItems.length} listicle items have screenshots:`,
      screenshotsCount >= listicleItems.length ? "✅ PASS" : "❌ FAIL"
    );

    console.log("\n========== TEST COMPLETE ==========\n");

    return NextResponse.json(
      {
        success: true,
        summary: {
          durationMs: result.durationMs,
          totalAssets: assetBlocks.length,
          assetTypes,
        },
        assetDetails,
        validation: {
          gorgiasNoEeselAsset: gorgiasSectionMatch
            ? !gorgiasSectionMatch[0].includes("eesel_internal_asset")
            : null,
          eeselHasEeselAsset: eeselSectionMatch
            ? eeselSectionMatch[0].includes("eesel_internal_asset")
            : null,
          allListicleItemsHaveScreenshots:
            screenshotsCount >= listicleItems.length,
        },
        output: result.value,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Test failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
