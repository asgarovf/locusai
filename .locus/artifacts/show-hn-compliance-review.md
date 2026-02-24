# Show HN Compliance Review for Locus

**Date:** 2026-02-20
**Summary:** Locus is largely compliant with Show HN rules but has a few areas to address before posting. The product is a real, usable tool — not a landing page or reading material — which is the core requirement. However, the sign-up flow for the cloud dashboard could be seen as a barrier.

---

## Rule-by-Rule Analysis

### "Show HN is for something you've made that other people can play with"
**Status: PASS**

Locus is an open-source CLI tool + VS Code extension + cloud dashboard that users can install and use immediately. It's a real product, not just content.

---

### "On topic: things people can run on their computers or hold in their hands"
**Status: PASS**

The CLI (`npm install -g @locusai/cli`) runs on users' machines. The VS Code extension runs in their editor. This is squarely on-topic.

---

### "Off topic: blog posts, sign-up pages, newsletters, lists, and other reading material"
**Status: PASS**

The submission would link to the GitHub repo (open source, MIT license), not a landing page. Users can clone, install, and run it immediately.

---

### "The project must be something you've worked on personally and which you're around to discuss"
**Status: ASSUMED PASS**

This is your project. You'd need to be available to respond to comments in the thread.

---

### "Please make it easy for users to try your thing out, ideally without barriers such as signups or emails"
**Status: NEEDS ATTENTION**

There are two usage paths:

1. **CLI-only (no sign-up required):** Users can `npm install -g @locusai/cli`, run `locus init`, configure their own AI provider key (Claude or Codex), and use `locus exec`, `locus run`, etc. locally. **This path has no sign-up barrier** — only the requirement to have an AI provider CLI installed.

2. **Cloud dashboard (`app.locusai.dev`):** Requires email + OTP sign-up, profile creation, organization details, and workspace setup. **This is a multi-step sign-up flow** which goes against the spirit of this rule.

**Recommendation:** In the Show HN post, lead with the CLI/GitHub path. Make it clear users can try the core functionality (`locus exec`, `locus plan`) without creating an account. The cloud dashboard can be mentioned as an optional team collaboration feature. Example:

> ```
> npm install -g @locusai/cli && locus init
> ```
> No account required for local usage. Cloud dashboard available optionally for team features.

---

### "If your work isn't ready for users to try out, please don't do a Show HN"
**Status: PASS (with caveat)**

The product is at v0.14.5 and functional. The README does warn "Expect breaking changes, bugs, and evolving APIs" — but Show HN explicitly says "the community is comfortable with work that's at an early stage." This is fine.

---

### "New features and upgrades generally aren't substantive enough to be Show HNs"
**Status: PASS**

This would be the initial Show HN for Locus, not an incremental update.

---

### Title format: Must begin with "Show HN"
**Status: ACTION REQUIRED**

The title must start with "Show HN:". Example:
> Show HN: Locus - Open-source AI project management where code never leaves your machine

---

## Summary of Action Items

| # | Item | Priority |
|---|------|----------|
| 1 | Link to GitHub repo as the primary URL (not the landing page `locusai.dev`) | High |
| 2 | Emphasize no-signup CLI path in the post text | High |
| 3 | Ensure title starts with "Show HN:" | Required |
| 4 | Be available to answer questions in the thread | Required |
| 5 | Do not ask friends to upvote or comment | Required |
| 6 | Consider adding a quick-start section to README that gets users running in <2 minutes without an account | Medium |

## Overall Verdict

**Compliant with adjustments.** Locus is a legitimate Show HN candidate — it's a real, open-source tool people can install and run. The main risk is if the submission URL points to the landing page (`locusai.dev`) instead of GitHub, or if the post text makes the cloud sign-up seem required. Lead with the GitHub repo, highlight the zero-sign-up local path, and you're good.
