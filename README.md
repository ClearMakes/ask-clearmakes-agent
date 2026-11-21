# Ask ClearMakes Agent

Ask your [ClearMakes Agents](https://agents.clearmakes.com/?utm_source=github&utm_medium=marketplace&utm_campaign=action)
assistant a question from a GitHub workflow and get an answer grounded in what
you already wrote: your website, your documents and your connected apps.

The common use: when someone opens an issue, the action asks your agent and
posts the answer as a comment, with a note that a person will follow up.

## Setup

1. In ClearMakes Agents, open your agent, then **Sources > API keys**, and
   create a key for this agent.
2. In your repository: **Settings > Secrets and variables > Actions > New
   repository secret**, name it `CLEARMAKES_AGENT_KEY`, paste the key.
3. Add a workflow, for example [answer new issues](examples/answer-new-issues.yml).

```yaml
- id: agent
  uses: ClearMakes/ask-clearmakes-agent@v1
  with:
    api-key: ${{ secrets.CLEARMAKES_AGENT_KEY }}
    question: ${{ github.event.issue.title }}
- run: echo "$ANSWER"
  env:
    ANSWER: ${{ steps.agent.outputs.answer }}
```

## Inputs

| Name | Required | Default | What it is |
| --- | --- | --- | --- |
| `api-key` | yes | | An agent API key. Keep it in a secret. |
| `question` | yes | | The question. Up to 4,000 characters are sent. |
| `top-k` | no | `6` | How many passages the agent reads before it answers (1 to 20). |
| `fail-on-error` | no | `true` | `false` carries on with an empty answer when the agent can't answer. |
| `api-base-url` | no | `https://agents.clearmakes.com` | Only for a self-hosted ClearMakes Agents. |

## Outputs

| Name | What it is |
| --- | --- |
| `answer` | The answer, as Markdown. |
| `sources` | JSON array of the passages used: `document_id`, `filename`, `section`. |
| `agent-name` | The agent that answered. |

## Good to know

- Pass outputs to shell steps through `env:` (as in the example), never by
  pasting `${{ }}` straight into a `run:` script.
- Each new question starts a conversation and counts against your plan's
  monthly conversations. The Free plan has 30 a month.
- The agent answers only from the sources you gave it, and says so when it
  doesn't know.
- The action has no dependencies; it calls `POST /api/v1/brain/ask` with your
  key. API docs: https://agents.clearmakes.com/docs

## Support

support@clearmakes.com. Privacy: https://agents.clearmakes.com/privacy

MIT licence.
