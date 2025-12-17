export const buildReviewFlowPrompt = ({
  draftBlog,
  keyword,
}: {
  draftBlog: string;
  keyword: string;
}) => {
  return `
Here is a list of the things you are going to update:

* Headings should start with # for H1, ## for H2, etc. You should NEVER insert H1, H2, H3 in the headings. Example: H2: What is Scale AI? should be changed to What is Scale AI?
* The keyword should NOT be bolded anywhere.
* The keyword should retain proper formatting/capitalisation. For example: "outbound sales crm keyword" should be outbound sales CRM, "jira ai" should be Jira AI, "Meta AI Chatbot" should be "Meta AI chatbot". This should be the case for headings, FAQs, and paragraph content.
* The concluding paragraph should not contain the word conclusion. Remove it and ensure the heading makes sense.
* REMOVE all EMOTICONS.
* Review all platforms name, they should have the correct casings. (e.g. eesel AI NOT Eesel AI)
* Review all headings (H2, H3, H4, etc EXCEPT H1) for clarity, natural readability, nonsensical keyword stuffing, or awkward phrasing (such as “options,” “solutions,” or forced pluralisation). Rewrite them so they read smoothly while keeping the intended meaning and remaining SEO-friendly. Do not touch H1.
* Headings should always be in sentence case EXCEPT proper nouns or brand/tool names (e.g., Zendesk, Salesforce, eesel AI), which must retain their correct capitalization. Please only revise the capitalization of the title. IMPORTANT: If there is a colon (:) or question mark (?) in a title or heading, the first word immediately after the colon or question mark MUST be capitalized EXCEPT for the word 'eesel AI'. For example: "How to use Slack: advanced tips" should become "How to use Slack: Advanced tips".
* Headings should not contain "So,..", ",Anyway?", "First,...". Example: "So, what is Slack AI, anyway?" should be changed to "What is Slack AI?"
* You should be optimising for keywords in headings but DO NOT force this if it isn’t grammatically correct or nonsensical.
* NOT ALL headings have to include the keyword. Only include the keyword if it feels necessary for clarity. If the heading already makes sense without the keyword, remove it. For example: Instead of “The rip and replace problem with Meta AI” → write “The rip and replace problem”; instead of “What is Parahelp according to Parahelp reviews?” → write “What is Parahelp?”; instead of “The hidden costs in Chatwoot review: Pricing and actual value” → write “The hidden costs: Pricing and actual value”.
* For listicle blog type, make sure that the list only contains the product / app name without additional subheading. Example: 1. eesel AI: The best AI chatbot should be changed to 1. eesel AI while keeping the links if there are any on the current heading.
* Always ensure punctuation makes sense and is accurate.
* Make sure that the table markdown is in a proper format.
* Check if any graph, chart, or mermaid flow has NOT been wrapped with <assets></assets> and add them. Example: <assets> \`graph TD ...\` </assets> or <assets> \`mermaid graph TD ... \` </assets>.
* If a paragraph starts with a clear semantic label followed by a colon (e.g. "Pros:", "Cons:", "Who it's for:", "Who should look for alternatives:"), the label MUST be bolded, while the rest of the sentence remains unchanged.
* The output should be in Markdown, with:

1. No title or H1
2. All hyperlinks in Markdown format: [anchor text](url)
3. Double line breaks after any Markdown table for proper spacing
4. Change all \` to "
5. Change bullet points with '-' format to '*'
6. Make sure that the table markdown is in a proper format
7. Shorten the anchor text to 5 words or less if it is more than 5 words, but make sure the link is still valid and the text is still natural.
8. Make sure that there are no broken links or text that is not natural

NONE of the above changes should ever be done within YouTube embeds or URLs at all - just actual blog text.

YOU SHOULD NOT ADD ANY ADDITIONAL WORDS FROM HEADINGS OR PARAGRAPHS.

YOU MUST remove the followings from the text, make sure the output will only contain the content of the blogs:

1. Meta Title
2. Meta Description
3. <blog_input>
4. Any heading text before the content
5. Any introduction text such as "Here's the output"
6. Horizontal rule (---)

CRITICAL: You should NEVER remove an asset formating such as: __SCREENSHOTS::, __IMAGE::, __VIDEO::, etc.

Here is the keyword:
<keyword>
${keyword}
</keyword>

Here is the blog you are using for your review:
<blog>
${draftBlog}
</blog>

YOU ARE NOT TO EDIT THE TONE OR FORMATTING OR WRITING OF THE BLOG IN ANY WAY other than to alter what has been specified. This is the most important command. Your output will be the SAME blog but with those edited components, if necessary.
`;
};
