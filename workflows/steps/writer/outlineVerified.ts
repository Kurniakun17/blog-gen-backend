import { runStep, type TimedResult } from "../../utils/steps";
import { generateText } from "ai";
import { getModel } from "@/config/models";
import { buildOutlineVerifiedPrompt } from "@/prompts/writer/outlineVerified";

type OutlineVerifiedStepInput = {
  outline: string;
  keyword: string;
  verifiedContext: string;
  researchContext: string;
  companyContext: string;
  blogType: string;
  companyName: string;
};

type OutlineVerifiedResult = {
  verifiedOutline: string;
  prompt: string;
};

/**
 * Step: Outline Verified
 * Refines the outline using verified data from SERP API to ensure accuracy
 */
export async function outlineVerifiedStep(
  input: OutlineVerifiedStepInput
): Promise<TimedResult<OutlineVerifiedResult>> {
  return runStep(
    "outline-verified",
    {
      keyword: input.keyword,
      verifiedContextLength: input.verifiedContext.length,
    },
    async () => {
      "use step";

     return {
      "value": {
        "verifiedOutline": "Here is the refined and finalized blog outline, strictly integrating the verified factual details from the provided sources.\n\n# **Final Blog Outline**\n\n**H1:** A complete guide to the Intercom AI Copilot: Features, pricing, and alternatives in 2025\n\n**Meta description:** Our in-depth 2025 guide to the Intercom AI Copilot covers its features, complex pricing, and key limitations, and compares it to more flexible alternatives.\n\n**Excerpt:** Is the Intercom AI Copilot right for you? This complete guide breaks down its features, pricing, and limitations to help your team decide in 2025.\n\n**Tags:** Intercom, AI Copilot, Customer Service AI, Agent Assist\n\n---\n\n### **Introduction [~150 words]**\n\n*   **Hook:** Start by acknowledging Intercom as a major player in customer service and the growing importance of AI agent assistance tools for support teams.\n*   **Problem:** Support teams need tools that are powerful but also simple to implement, transparently priced, and easy to control.\n*   **Article’s Purpose:** This guide will provide a detailed and honest overview of the Intercom AI Copilot. We’ll explore its key features, break down its complex pricing structure, discuss its limitations, and help you decide if it’s the right fit for your workflow.\n*   **Asset:**\n    *   **Image Placeholder:** Screenshot of the Intercom AI Copilot interface showing a drafted reply within the Intercom Inbox, as described in their help documentation.\n\n### **H2: What is the Intercom AI Copilot? [~250 words]**\n\n*   **Definition:** Explain that the Intercom AI Copilot is an AI assistant designed to help human support agents work more efficiently inside the Intercom Inbox. It is part of Intercom's broader \"Fin\" AI suite, which also includes the Fin AI Agent for full automation.\n*   **Core Functionality:** Clarify that Copilot's main job is to act as an agent-assist tool. It helps agents [find answers, troubleshoot issues, and respond](https://www.intercom.com/suite/helpdesk/copilot) to questions without leaving their helpdesk.\n*   **Ecosystem:** Mention that while Copilot is native to the Intercom platform, the Fin AI Agent can also work with other helpdesks like [Zendesk and Salesforce](https://www.intercom.com/pricing), positioning Intercom's AI as both an integrated solution and a standalone add-on.\n\n### **H2: A deep dive into Intercom AI Copilot features [~500 words]**\n\n*   Introduce the section by explaining that we will break down the core capabilities that support teams rely on.\n*   **H3: Automated reply suggestions and conversation summaries**\n    *   Detail how Copilot drafts answers based on a company's knowledge sources, including public and internal articles, PDFs, websites, and even the [last four months of conversation history](https://www.intercom.com/help/en/articles/8587194-how-to-use-copilot).\n    *   Explain its ability to summarize long ticket threads, helping agents get up to speed quickly.\n    *   **eesel AI mention:** Point out that while this is useful, platforms like [eesel AI](https://www.eesel.ai/solution/ai-agent-assist) offer more direct control over the AI's persona through a simple prompt editor. This allows for deep customization of tone and behavior without complex configurations.\n*   **H3: Knowledge source management and performance insights**\n    *   Describe how Intercom's AI learns from content centralized in its \"Knowledge Hub,\" which can sync with sources like [Zendesk, Guru, Confluence, and Notion](https://www.intercom.com/suite/helpdesk/knowledge-hub?redirect_from=/customer-service-platform/knowledge-hub).\n    *   Mention the \"AI Analyst\" feature that provides high-level insights for managers to monitor performance.\n    *   **eesel AI mention:** Highlight that [eesel AI](https://www.eesel.ai/) instantly unifies knowledge from a wider set of sources, including unstructured documents like Google Docs and the full context from past tickets, providing richer answers automatically without needing to import everything into a central hub.\n\n### **H2: Understanding the Intercom AI Copilot pricing model [~450 words]**\n\n*   Explain that Intercom's AI pricing is multi-layered and can be confusing, as it combines separate costs for agent assistance and full automation.\n*   **H3: A blended model: Per-seat for Copilot and per-resolution for automation**\n    *   Break down the two distinct costs based on Intercom's pricing page:\n        *   **Copilot (Agent Assist):** A separate add-on that costs **[$29 per agent per month](https://www.intercom.com/pricing)** for unlimited usage. Mention there is a free tier for up to 10 Copilot conversations per agent monthly.\n        *   **Fin AI Agent (Automation):** A usage-based cost of **[$0.99 per resolution](https://www.intercom.com/pricing)**, which applies when the AI fully resolves a query without human help.\n*   **H3: Why this model creates unpredictable costs for scaling teams**\n    *   Discuss how this blended model makes budgeting difficult. Teams pay a fixed cost for each agent to use the assist tool, while also paying a variable cost that increases with successful automation. This effectively penalizes teams for deflecting more tickets.\n*   **Asset:** Include a simple comparison table to illustrate the different pricing models.\n\n| Feature | Intercom AI Copilot & Fin AI Agent | eesel AI |\n| :--- | :--- | :--- |\n| **Pricing Model** | Per-seat (Copilot) AND per-resolution (Fin Agent) | Flat monthly fee (based on interaction volume) |\n| **Predictability** | Low (costs vary with agent count and resolutions) | High (predictable monthly cost) |\n| **Agent Seats** | Costs per agent for Copilot | Unlimited agents included |\n| **Incentive** | Penalizes high automation rates with higher costs | Encourages maximum automation at a fixed cost |\n\n*   **eesel AI mention:** Use the table to clearly contrast this with [eesel AI’s pricing](https://docs.eesel.ai/pricing-admin-and-more/pricing), which is transparent and predictable. Emphasize that eesel AI offers plans like the **Team Plan at $299/month for 1,000 interactions**, with no per-seat or per-resolution fees, making it easier to budget and scale.\n\n### **H2: Key limitations and a more flexible alternative [~500 words]**\n\n*   Frame this section as an objective look at potential drawbacks for teams that prioritize speed and simplicity.\n*   **H3: A complex setup that isn't truly self-serve**\n    *   Mention Intercom's \"Fin Flywheel\" process of **[Train, Test, Deploy, Analyze](https://fin.ai/)**. This structured workflow can feel heavy and enterprise-focused, often requiring significant configuration and time to get started.\n    *   **eesel AI mention:** Contrast this with [eesel AI's](https://www.eesel.ai/) radically simple, self-serve approach. Explain that teams can [start a free trial with no payment info](https://docs.eesel.ai/), connect their helpdesk and knowledge sources, and go live in minutes without mandatory sales calls.\n*   **H3: A \"black box\" engine with limited transparency**\n    *   Discuss how a proprietary system like the \"Fin AI Engine™\" means users have less transparency and control over *why* the AI gives a certain answer.\n    *   **eesel AI mention:** Highlight that eesel AI offers a fully customizable workflow engine. Teams get granular control to define exactly which tickets the AI should handle and what actions it can take, providing complete transparency.\n*   **H3: Lack of robust, risk-free testing**\n    *   Note that while Intercom has a \"test\" phase, the process isn't as transparent or data-driven as a true simulation.\n    *   **eesel AI mention:** Emphasize eesel AI's powerful simulation mode as a key differentiator. It allows teams to test their AI setup on thousands of historical tickets to get an accurate forecast of resolution rates and cost savings *before* activating it for customers.\n\n### **H2: The verdict: Is the Intercom AI Copilot the right tool for you? [~200 words]**\n\n*   **Summary:** Conclude that the Intercom AI Copilot is a powerful tool, particularly for large enterprises or teams already deeply embedded in the Intercom ecosystem who can manage its complex, multi-part pricing and structured setup process.\n*   **The Caveat:** However, for teams that prioritize simplicity, transparent pricing, granular control, and the ability to work seamlessly with their *existing* tools, it may not be the most agile or cost-effective solution.\n\n### **H2: Try a simpler, more powerful alternative [~150 words]**\n\n*   **Call to Action:** Directly introduce [eesel AI's AI Copilot](https://www.eesel.ai/product/ai-copilot) and [AI Agent](https://www.eesel.ai/product/ai-agent) as the ideal alternative for teams seeking flexibility and control.\n*   **Recap Key Benefits:**\n    *   Go live in minutes, not months.\n    *   Transparent pricing with no per-seat or per-resolution fees.\n    *   Test with confidence using a powerful simulation mode.\n    *   Integrate seamlessly with the tools you already use.\n*   **Final CTA:** Encourage readers to [start a free trial](https://dashboard.eesel.ai/api/auth/signup?returnTo=v2) and experience the difference for themselves.",
        "prompt": "test"
      },
      "completeData": {
        "outlineChars": 9130,
        "verifiedContextLength": 412750
      }
    }
    
      console.log("\n========== [Outline Verified] Starting ==========");
      console.log("Original outline length:", input.outline.length);
      console.log("Verified context length:", input.verifiedContext.length);
      console.log("=================================================\n");

      const refinementPrompt = buildOutlineVerifiedPrompt({
        keyword: input.keyword,
        researchContext: input.researchContext,
        companyContext: input.companyContext,
        blogType: input.blogType,
        outline: input.outline,
        verifiedContext: input.verifiedContext,
        companyName: input.companyName,
      });

      const refinementResult = await generateText({
        model: getModel("writer"),
        prompt: refinementPrompt,
        temperature: 0.5,
      });

      const verifiedOutline = refinementResult.text;

      console.log("\n========== [Outline Verified] Completed ==========");
      console.log("Verified outline length:", verifiedOutline.length);
      console.log(
        "Changes applied:",
        verifiedOutline.length - input.outline.length
      );
      console.log("===================================================\n");

      return {
        value: { verifiedOutline, prompt: refinementPrompt },
        completeData: {
          outlineChars: verifiedOutline.length,
          verifiedContextLength: input.verifiedContext.length,
        },
      };
    }
  );
}
