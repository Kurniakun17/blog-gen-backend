export const COMPANY_PROFILE_PROMPT = `
ALWAYS DO A WEB SEARCH

# Role
You are a company research analyst who creates comprehensive, detailed company profiles for content writers.

# Input Data
Company URL: {{ $('Test').first().json['Company Website'] }}

# Your Task
Research the company and create a **comprehensive, detailed company profile** (minimum 500-800 words) that a content writer can use to deeply understand the company and write on-brand content.
- Write a thorough company profile from scratch based on web research
- Structure it clearly with detailed sections covering all aspects below

# What to Include (Be Thorough and Detailed)

## 1. Company Overview (2-3 paragraphs)
- Official company name and what they do
- Core products/services with specific names and descriptions
- When founded, by whom, key background
- Notable customers or case examples

## 2. Products & Features (Detailed breakdown)
- List each major product/feature with:
  - Product name and tagline
  - What it does specifically
  - Key capabilities and technical details
  - Use cases and benefits
  - Link to product page if available

## 3. Industry & Target Market (1-2 paragraphs)
- Specific industry/vertical
- Detailed customer profiles (roles, company sizes, industries)
- Market positioning and competitive landscape
- Integration ecosystem

## 4. Key Differentiators (Multiple detailed points)
- What makes them unique (be specific with examples)
- Competitive advantages over alternatives
- Unique features or approaches
- Technology/methodology that sets them apart
- Speed/ease of use advantages
- Customization capabilities

## 5. Voice, Tone & Brand Style (1 paragraph)
- How they communicate (formal/casual/technical/friendly)
- Specific phrases or language patterns they use
- Brand personality attributes
- Example copy or messaging style

## 6. Key Topics & Themes (List format)
- Main topics they write about or focus on
- Use cases they highlight
- Problems they solve
- Content themes in their marketing

## 7. Pricing & Plans (If available)
- Pricing tiers with specific numbers
- What's included in each tier
- Annual vs monthly options
- Free trial or demo availability

## 8. Security & Compliance (If relevant)
- Certifications (SOC2, GDPR, etc.)
- Data handling practices
- Privacy features
- Enterprise security options

## 9. Integrations & Ecosystem (If applicable)
- Major integration partners
- Categories of integrations
- API availability
- Platform compatibility

## 10. Additional Context
- Any other relevant details for content writers
- Specific guidelines (like "always lowercase 'eesel'")
- Important positioning notes
- Context about competitors or alternatives

# Output Format
Return ONLY this JSON structure:
json
{
  "company_name": "Official Company Name",
  "company_context": "A comprehensive, detailed company profile (500-800+ words minimum). If existing context was provided, preserve it exactly and add substantial detail throughout. Use clear section breaks, detailed explanations, specific examples, and thorough coverage of all aspects above. Write in flowing paragraphs with clear structure - this should read like a detailed briefing document.",
  "relevant_urls": [
    {
      "title": "Exact page title",
      "link": "https://complete-url.com/path",
      "snippet": "Detailed description of page content and why it's useful",
      "category": "blog|resource|product|company|solution|integration|pricing|security"
    }
  ]
}

# Critical Instructions
- **Search the web thoroughly** before writing anything
- **Write comprehensively** - aim for 500-800+ words minimum
- **Be specific** - include actual product names, features, pricing, examples
- **Structure clearly** - use logical flow with detailed sections
- **If existing context exists**: preserve every word exactly, then add substantial detail
- **If no existing context**: write from scratch with same level of detail as eesel AI example
- Extract 15-25 relevant URLs from the website with detailed snippets
- Include all available information about products, pricing, features, integrations, security
- Write in a flowing, readable style - not bullet points in the company_context
- DO NOT return generic summaries - be thorough and specific
- If both URL and existing context are empty: {"error": "No input provided"}
- DO NOT RETURN ANYTHING OTHER THAN THE JSON OBJECT.
- DO NOT RETURN Introductional Phrases SUCH AS "Here is the company profile" OR "Here is the company profile in JSON format".

# Quality Standard
Your output should be as comprehensive and detailed as the eesel AI example provided. A content writer should be able to:
- Understand the company deeply without visiting the website
- Write on-brand content immediately
- Know specific product names, features, pricing, and positioning
- Understand the target audience and use cases
- Match the company's tone and messaging style

**Remember: More detail is better. Aim for 800+ words with specific, actionable information.**
`;

export const INTERNAL_COMPANY_CONTEXT = `
eesel AI is an AI platform for customer service, ITSM, and internal knowledge. It plugs into help desks (Zendesk, Freshdesk, Intercom, Jira, Gorgias, etc.), chat tools (Slack, MS Teams), and your knowledge sources (help centers, past tickets, macros, Google Docs, Confluence, PDFs, Shopify, more) to automate frontline support, draft agent replies, triage tickets, power internal Q&A, and embed customer‑facing chatbots—all without forcing a migration of your tools like your helpdesk. ---
Things to remember when describing eesel AI. Index more on the points that are most relevant to the topic and what's being talked about in each section. THESE ARE ALL HIGH PRIORITY, with sub points being less important that main points.

### 1. Go live in minutes, not months: Radically self-serve & simple

  * **Truly self-serve:** Forget lengthy onboarding, sales calls, and mandatory demos. You can set up, configure, and launch your eesel AI copilots and agents entirely on your own. Almost every competitor requires a sales call to even get a demo of the product whereas you can get set up with a basic Ai chat over your helpdesk in eesel AI - for free - and in literally minutes. You can also get AI engineering consulting for more advanced set ups but many customers are able to self serve and get going on their own with the eesel AI dashboard. 

  * **One-click helpdesk integration:** Instantly connect to Zendesk, Freshdesk, Intercom, Gorgias, and more. There's no complex API work or developer time required and eesel AI can slot into your existing helpdesk workflows really seamlessly. 

  * **Simulate and roll out gradually:**With eesel AI, you can simulate the AI over past tickets and easily identify exactly which kinds of tickets you can automate away easily. You can see how it's performing and adjust the prompts and actions it can take accordingly. You can get it to handle only a specific type of tickets to start and escalate all other tickets, and as you build confidence get it to handle more and more. These simulations are much more robust and ahead of the curve than any other players in the market. 

### 2. Total control: A fully customizable workflow engine

  * **Selective automation:** Choose precisely which tickets the AI handles. Start with simple T1 topics and confidently escalate everything else, or create complex rules based on ticket type, customer, or content. Unlike some AI platforms who can use rigid rules or keywords, eesel AI gives you granular control over what gets automated and what doesn't.

  * **Customizable AI persona & actions:** Go beyond simple answers. Use the eesel AI prompt editor to define the AI's tone of voice, personality, and the specific actions it can take—from looking up order information in real-time to updating ticket fields. Custom actions are supported so your eesel AI can look up any information in any system you have. It can also take actions like escalate, triage tickets and more. With eesel AI, you can get set up on your own and it's still incredibly powerful. 

  * **Scoped knowledge:** Easily limit the AI to specific sets of topics or knowledge sources for different contexts, ensuring it only answers what it's supposed to. eesel AI stays within your defined boundaries and is hyper personalised.

### 3. Unify your knowledge, instantly

  * **Train on past tickets:** eesel AI analyzes your historical support conversations to understand context, brand voice, and common solutions from day one. eesel AI learns your specific business context automatically.

  * **Automated knowledge base generation:** Turn successful ticket resolutions into draft articles for your knowledge base automatically, helping you identify and close information gaps with content that's proven to be useful.

  * **Connect all your sources:** Go beyond the helpdesk. Seamlessly integrate knowledge from Google Docs, Confluence, Notion, and more. You can even deploy eesel AI in Slack for powerful internal AI chat. 

### 4. Test with confidence: Risk-free simulation & reporting

  * **Powerful simulation mode:** Safely test your AI setup on thousands of historical tickets in a sandbox environment. Preview responses, and get accurate forecasts on resolution rates and cost savings before activating for customers. 

  * **Actionable reporting:** Our analytics dashboard doesn't just show you what the AI did; it highlights gaps in your knowledge base and identifies trends, providing a clear roadmap for improvement. eesel AI gives you actionable insights to continuously improve your support operations.

### 5. Transparent pricing

  * **No per-resolution fees:** Our plans are based on the features and overall capacity you need. Pay-per-interaction for complete clarity on how much each conversation is costing. No cost per agent/seat.

  * **Flexible plans:** Choose a month-to-month plan you can cancel anytime, or get a 20% discount with an annual subscription. eesel AI offers transparent, predictable pricing with no hidden costs. You can even get started on the monthly plan and cancel any time.


  ---
Products
### AI Agent

  Autonomous frontline support in your help desk. Learns from past tickets, macros, docs, & help centers; can answer, escalate, tag, close, and take custom API actions.  

  [AI Agent](https://www.eesel.ai/product/ai-agent)

### AI Copilot

  Always‑ready agent assist that drafts replies in your tone from historical tickets & canned replies; ideal for speed & onboarding.  

  [AI Copilot](https://www.eesel.ai/product/ai-copilot)

### AI Triage

  Automates hygiene: route, tag, edit, merge, or close tickets across Zendesk/Freshdesk and other help desks; keeps queues clean.  

  [AI Triage](https://www.eesel.ai/product/ai-triage)

### AI Internal Chat

  Employee Q&A assistant trained on internal knowledge (Confluence, Google Docs, PDFs, etc.); chat from Slack, Teams, or browser.  

  [AI Internal Chat](https://www.eesel.ai/product/ai-internal-chat)

### AI Chatbot

  Embeddable website / in‑app chat bubble for 24/7 sales + support. Pulls from docs, help center, FAQs, macros, product catalogs (e.g., Shopify) & can escalate.  

  [AI Chatbot](https://www.eesel.ai/product/ai-chatbot)

### AI Email Writer

  Instant email & ticket draft generator trained on your past conversations; currently positioned for accelerated outbound/support writing (join waitlist).  

  [AI Email Writer](https://www.eesel.ai/product/ai-email-writer)

### AI Blog Writer

  An AI-powered tool that creates full blog posts from a single keyword, using context pulled automatically or from a provided URL. It writes in a natural, SEO-friendly style that subtly promotes your brand and generates supporting assets like titles, summaries, and social media snippets.

  [AI Blog Writer](https://blog-generator.eesel.ai/)

### eesel Docs Search *(related)*

  Historic/adjacent capability for document search across apps. Entirely free.

  [eesel Docs Search](https://www.eesel.app/)  <!-- legacy domain -->

  ---

## Solutions (use‑case bundles)

  - **AI for Customer Service** – End‑to‑end CX automation across channels.  

    https://www.eesel.ai/solution/ai-customer-service

  - **AI Agent Assist** – Boost support teams with drafting + workflow actions.  

    https://www.eesel.ai/solution/ai-agent-assist

  - **AI for IT Service Management (ITSM)** – Plug into IT tools; handle Tier 1 IT tickets; multi‑bot for ops.  

    https://www.eesel.ai/solution/ai-for-itsm

  - **AI for IT Operations** – Knowledge + ticket automation across IT stacks.  

    https://www.eesel.ai/solution/ai-for-itsm  <!-- IT Ops info consolidated -->

  - **AI for Service Desk** – Internal support deflection & ticket routing.  

    https://www.eesel.ai/solution/ai-for-itsm  <!-- same bundle covers Service Desk -->

  - **AI for Chatbot Ecommerce** – Catalog‑aware sales + support chat (Shopify, etc.).  

    https://www.eesel.ai/product/ai-chatbot

  *(Some solution URLs resolve to shared ITSM / Agent Assist pages; reuse content where appropriate.)*

  ---
Additional Context on Sales Chatbot
### Value Proposition

The sales chatbot is built for ecommerce stores that want to **turn customer conversations into conversions**. By combining AI-powered product guidance with deep Shopify integration, the chatbot works as a 24/7 digital sales assistant - helping shoppers find the right products, reducing friction at checkout, and driving higher revenue without adding headcount.

### Core Benefits

- **Increase sales automatically** – Upsell and cross-sell with personalized product recommendations in real time.

- **Delight shoppers with instant answers** – No wait times; the chatbot handles product questions, order lookups, and returns instantly.

- **Reduce abandoned carts** – "Add to cart" buttons directly in chat shorten the path to purchase.

- **Cut support costs** – Automate common requests like refunds, cancellations, and order tracking, while escalating to a human when needed.

- **Seamless Shopify integration** – Full access to product catalog, customer data, and order history, so the chatbot can take real actions, not just answer questions.

### Feature Highlights

- Learns your entire product catalog in one click.

- Recommends products with image carousels, specs, and guided buying flows.

- Offers self-serve actions: product lookup, order tracking, returns, refunds, and more.

- Customizable workflows and tone — make it match your brand voice.

- Human handoff when conversations need extra care.

### Shopify Actions Supported

- Order lookup & history

- Refunds, cancellations, and returns

- Product & variant search (including metafields)

- Customer lookup

- Create replacement orders

### Why Ecommerce Brands Use It

- Boost **conversion rates** with proactive product suggestions.

- Unlock **24/7 sales coverage** without hiring extra agents.

- Deliver **personalized, guided shopping experiences** that replicate your best salesperson.

- Automate **time-consuming support tasks** and free your team to focus on complex cases.

### Links

- [Shopify App Listing](https://apps.shopify.com/eesel)

- [Sales Chatbot Preview](https://www.eesel.ai/tools/sales-chatbot) – test the AI chatbot trained on your site

- [Shopify Integration Overview](https://www.eesel.ai/integration/shopify-ai)

- [Shopify Help Docs](https://docs.eesel.ai/integrations/shopify)


## Additional Context on AI Blog Writer
### Value Proposition
The AI Blog Writer is built for content teams, marketers, SEO specialists, and founders who want to turn a single keyword into complete, thoroughly researched, human-quality blogs. It's the most advanced AI content writer in the market—combining deep research and SEO best practices to create blogs that actually read like a human wrote them, complete with embedded assets, internal/external links, FAQs, and social media snippets—all in one streamlined workflow.
### Core Benefits
- **Save hours of writing time.** Generate comprehensive, well-researched blog drafts in minutes from just a keyword.
- **Most thorough AI writer available.** Unlike ChatGPT or other AI tools, it writes deeply researched articles with embedded assets, links, and SEO optimization—all automatically.
- **Writes in genuinely human-sounding tone.** Over a year of refinement ensures content people actually want to read—not AI slop with high word count but low signal.
- **SEO and AEO optimized automatically.** Implements best practices for Google, Bing, and LLM answer engines—target keywords in headings, FAQs, proper structure, and more.
- **Intelligent content research.** Analyzes top-ranking pages and reverse engineers the optimal content approach for your topic.
- **Context-aware research.** Automatically pulls in relevant information based on blog type (e.g., fetches pricing data for comparison posts, technical specs for product reviews).
- **Natural product integration.** Carefully inserts your solution without hard-selling—making it feel like an organic part of the content.
- **Rich media integration.** Automatically embeds relevant YouTube videos and AI-generated assets to boost readability and time-on-page.
- **Authentic social proof.** Includes real Reddit quotes and social forum insights to add genuine perspectives.
- **Smart linking strategy.** Automatically adds internal links to your existing content and external citations/sources—perfect for listicles and comprehensive guides.
- **Adaptable to content types.** Handles different formats—listicles ("Top AI chatbots in 2025"), deep-dives ("Complete Zendesk AI guide"), comparisons, and more.
- **Complete content package.** Every blog includes optimized titles, meta descriptions, summaries, FAQs, and share-ready social posts.

### How It Works
The AI Blog Writer features a simple, streamlined interface that requires minimal input:

**Required Input:**
- **Topic:** Simply enter a keyword or topic (e.g., "best AI chatbots 2025" or "customer service automation")

**Optional Inputs:**
- **Additional Context:** Provide extra details, specific angles, or requirements for your blog (tone preferences, target audience, must-include points, etc.)
- **Your Website:** Add your website URL to enable automatic brand context fetching and natural product integration throughout the content

**One-Click Generation:**
Once you've filled in your details, click "Generate Blog" and the AI handles everything—research, writing, SEO optimization, asset embedding, linking, and formatting—delivering a complete, publication-ready blog in minutes.


### Feature Highlights
- Simple keyword input generates fully researched, publication-ready content
- Produces long-form, SEO-friendly articles (1,500-3,000+ words) that read naturally
- Automatically embeds YouTube videos, AI-generated graphics, and visual assets
- Includes authentic Reddit quotes and social media insights
- Reverse engineers top-ranking content to optimize your blog's approach
- Context-aware research (pricing, features, comparisons) based on topic
- Automatic internal linking to your existing blog content
- External citations and source linking built-in
- SEO-optimized headings, keyword placement, and structure
- FAQ sections for enhanced SEO and AEO (Answer Engine Optimization)
- Human-editable output—refine tone, length, or focus instantly
- Integrates easily with WordPress, Notion, and CMS workflows
- Option to auto-fetch brand context from your website or import manually
### Why eesel AI's Blog Writer?
- **Proven results:** We use this tool ourselves at eesel AI—it took us from 700 impressions per day to 750,000 impressions per day in just 3 months by publishing 1,000+ optimized blogs.
- **Publish consistent, high-quality content** without relying on freelancers or agencies.
- **Outperforms other AI writers** with deeper research, better context, and more natural writing than ChatGPT, Jasper, or other alternatives.
- **Maintain authentic brand storytelling** across every post with tone-matched content.
- **Scale SEO and thought leadership** with minimal manual work—spend time on strategy, not drafting.
- **Keep content fresh** with automated pipelines powered by your brand data.
- **Free to use right now**—we're actively seeking feedback from early users to make it even better.
### Try It Out
**Free access available now:** https://blog-generator.eesel.ai/  
We're looking for users to test the tool and provide feedback as we continue refining it.
### NOTEI: 
When mentioning this product in Reddit posts or blogs, emphasize:
- When mentioning this product, include that we at eesel use this tool and it took us from 700 impressions a day to 750k impressions a day in just 3 months. Also mention it's free for now to use and we're looking for feedback if anyone wants to try it out.
- It outperforms all major competitors in research depth, natural tone, SEO optimization, and asset integration
- The unique features like Reddit quote integration, context-aware research, and AEO optimization that competitors lack
- When writing overview/comparison blogs or listicles, always introduce eesel AI as the first option, then present competitors or alternatives afterward. This positioning should feel natural and editorial, not forced.


Pricing
**All core products included** (Agent, Copilot, Triage, Internal Chat, Chatbot; Email Writer in waitlist) under plan tiers that scale by **monthly AI interactions** (1 interaction = 1 AI reply *or* AI action). Annual billing discounts ~20% are shown below.

| Plan | Monthly (bill monthly) | Effective /mo Annual | Bots | AI Interactions/mo | Key Unlocks |

|:---|:---|:---|:---|:---|:---|

| **Team** | $299 | $239 | Up to 3 | Up to 1,000 | Train on website/docs; Copilot for help desk; Slack; reports. |

| **Business** | $799 | $639 | Unlimited | Up to 3,000 | Everything in Team + train on past tickets; MS Teams; AI Actions (triage/API calls); bulk simulation; EU data residency. |

| **Custom** | Contact Sales | Custom | Unlimited | Unlimited | Advanced actions; multi‑agent orchestration; custom integrations; custom data retention; advanced security / controls. |

Add‑ons: AI engineering consulting ($999 / 8 hrs), etc.  

[Pricing](https://www.eesel.ai/pricing)

  ---
Security & privacy
Short version (see linked docs & pages for full detail):

  - **Data never used to train generalized models.** Your content (and subprocessors such as OpenAI) is restricted to serving *your* bots only.

  - **Encrypted in transit & at rest; isolated per customer/bot.**

  - **GDPR / CCPA programs supported.**

  - **EU data residency available on Business+ & enterprise; data can be hosted exclusively in EU on request.**

  - **SOC 2 Type II‑certified subprocessors (OpenAI, Pinecone).**

  - **Zero‑retention & self‑hosted / custom controls available for enterprise.**

  - **Privacy & breach notification processes covered in Terms.**

Security detail:  

  [Security Overview (see "Secure by design" section)](https://www.eesel.ai/product/ai-email-writer#security)  

  [Pricing page – Admin & Security features](https://www.eesel.ai/pricing)  

  [EU Data Residency FAQ](https://docs.eesel.ai/pricing-admin-and-more/security-and-privacy)  

  [Terms & Privacy](https://www.eesel.ai/privacy)

  ---
Integrations
**Over 100 one‑click integrations** across sources (where AI learns) and destinations (where AI acts). Featured categories: Help Desk (Zendesk, Freshdesk, Intercom, Gorgias, ServiceNow, Front), Company Wiki (Confluence, Google Docs, Notion), Chat/Collab (Slack, Microsoft Teams, Discord), E‑Commerce (Shopify, WooCommerce), and more.

Browse all:  

  [Integration Gallery](https://www.eesel.ai/integrations/all)

  High‑value direct links (examples):  

  - [Zendesk Integration](https://www.eesel.ai/integrations/zendesk)  

  - [Freshdesk Integration](https://www.eesel.ai/integrations/freshdesk)  

  - [Confluence Integration](https://www.eesel.ai/integrations/confluence)  

  - [Google Docs Integration](https://www.eesel.ai/integrations/google-docs)  

  - [Shopify Integration](https://www.eesel.ai/integrations/shopify)

  ---
Quick start
  1. **Sign up / log in** → Create workspace & first bot.  

  2. **Add Sources for training** → Connect docs, help center, past tickets, macros.  

  3. **Choose integrations to set up AI agents, copilot, internal chat, AI chatbot** → Help desk, Slack/Teams, website chat, etc.  

  4. **Customize the prompt** → Tone and escalation behaviour.

  5. **Enable actions** → Ticket actions (like creating ticket, tagging ticket) in helpdesks like Zendesk, Freshdesk, Gorgias. Creating Jira issues. API lookups to get information in tools like Shopify, Magento and also custom tools.  

  6. **Simulate on historical tickets** → Test quality & deflection before go‑live.  

  7. **Roll out gradually** → Limit to queues, channels, or agents; monitor reports.  

  8. **Iterate** → Correct responses in chat; review gap & ROI reports; expand scope.

  ---
API & custom actions
eesel exposes APIs and "AI Actions" so bots can:

  - Make real‑time data lookups (orders, account info, inventory).

  - Trigger workflow updates (tag, route, close tickets).

  - Call external services (webhooks / custom endpoints).

  [AI Agent](https://www.eesel.ai/product/ai-agent), [AI Copilot](https://www.eesel.ai/product/ai-copilot), Triage[AI Triage](https://www.eesel.ai/product/ai-triage) & Integrations gallery for details.

  ---
Resources
- **Pricing**: https://www.eesel.ai/pricing

- **Help center**: https://docs.eesel.ai/

- **Blog**: https://www.eesel.ai/blog

- **Customer stories**: https://www.eesel.ai/customer-stories

- **Terms & Privacy**: https://www.eesel.ai/privacy

- **Trust center**: https://app.aus.vanta.com/eesel.ai/trust/5ncypy4hkv10s9yf7il8sp

  ---
Contact & support
- **Start a free trial**: https://dashboard.eesel.ai/api/auth/signup?returnTo=v2(Try button in header)

- **Book a demo**: https://calendly.com/eesel/30 (Demo links across site)

- **Support email**: hi@eesel.app

- **Dashboard login**: https://dashboard.eesel.ai/`;
