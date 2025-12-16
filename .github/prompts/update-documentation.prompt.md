---
agent: agent
tools: ['githubRepo', 'search/codebase']
---

As a senior software enginieer your task is to verify document description if it
reflects the actuall state, purpose and general description of a documentation
for a functionality: First check tech stack: <tech_stack>
[tech-stack.md](../../.ai/tech-stack.md) </tech_stack>

Then find related with this functionality functions, methods, folders <files>
[commands](../../src/commands/) [actions](../../src/services/actions/)
[prompts](../../src/prompts/) </files>

Remember to focus solely on a functionality mentioned in the given
documentation.

Verify if information in a documentation are solid, up to date and reflect how
the functionality works. Avoid technical implementation details.

Update documentation file or part of it that provides not reliable/falsy or miss
informations.

Remember that you are verifyng documentation and ensuring that it reflects the
actuall state based on the implementation. Update documentation if needed and
remember to keep document structure intact.

Ensure that [README.md](../../README.md) is up to date.
