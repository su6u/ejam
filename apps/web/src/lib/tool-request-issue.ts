const TOOL_REQUEST_ISSUE_BODY = `## Tool name
<!-- e.g. NEET college predictor -->


## What should it do?
<!-- What problem would it solve? A few sentences is enough. -->


## Who is it for?
<!-- e.g. JEE Main, NEET UG, counselling season -->


## Anything else? (optional)
<!-- Links, screenshots, or similar tools you like -->
`;

export function toolRequestIssueUrl(): string {
  const params = new URLSearchParams({
    labels: "tool-request",
    title: "Tool request: ",
    body: TOOL_REQUEST_ISSUE_BODY,
  });
  return `https://github.com/su6u/ejam/issues/new?${params.toString()}`;
}
