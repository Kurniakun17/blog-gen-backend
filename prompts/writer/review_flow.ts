export const buildReviewFlowPrompt = ({
  draftBlog,
  keyword,
}: {
  draftBlog: string;
  keyword: string;
}) => {
  return `
  This is the second round of review. You are going to be given a blog. It is a completed blog with asset suggestions and other inputs. Your role is to review the blog for VERY SPECIFIC things, listed below, and ONLY change those. The entire rest of the blog must be retained. 

Here is a list of the things you are going to update: 
- The keyword should NOT be bolded anywhere. 
- The keyword should retain proper formatting/capitalisation. For example: "outbound sales crm keyword" should be outbound sales CRM, "jira ai" should be Jira AI. This should be the case for headings, FAQs, and paragraph content.
- The concluding paragraph should not contain the word conclusion. Remove it and ensure the heading makes sense.
- Title and headings should always be in sentence case EXCEPT proper nouns or brand/tool names (e.g., Zendesk, Salesforce, eesel AI), which must retain their correct capitalization. Please only revise the capitalization of the title.IMPORTANT: If there is a colon (:) in a title or heading, the first word immediately after the colon MUST be capitalized EXCEPT for the word 'eesel AI'. For example: "How to use Slack: advanced tips" should become "How to use Slack: Advanced tips" (capitalize "Advanced").
- Please review all platforms name, they should have the correct casings. (e.g. eesel AI NOT Eesel AI)
- Please review all headings (H2, H3, H4, etc EXCEPT H1) and check if any contain nonsensical keyword stuffing or awkward phrasing. Suggest cleaner, natural alternatives while keeping them SEO-friendly. Do not touch H1.
- The output should be in Markdown, with:
1. No title or H1
2. All hyperlinks in Markdown format: [anchor text](url)
3. Double line breaks after any Markdown table for proper spacing
4. Change all \` to ", EXAMPLE: \`a minimalistic iMac computer desk\` to "a minimalistic iMac computer desk"
5. Change bullet points with '-' format to '*'. EXAMPLE: – Go live in minutes, not weeks SHOULD BE * Go live in minutes, not weeks
6. Make sure that the table markdown is in a proper format

NONE of the above changes should ever be done within YouTube embeds or URLs at all - just actual blog text.

YOU SHOULD NOT ADD ANY ADDITIONAL WORDS FROM HEADINGS OR PARAGRAPHS.

YOU MUST remove the followings from the text, make sure the output will only contain the content of the blogs:
1. <blog_input>
2. Any heading text before the content
3. Any introduction text such as "Here's the output"
4. Horizontal rule (---)

YOU MUST PUT THIS IN SEPERATE JSON KEY, FOLLOWING SCHEMA THAT HAS BEEN SPECIFIED:
1. Meta Title
2. Meta Description
3. Excerpt
4. Content & FAQ sections
5. Tags


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
