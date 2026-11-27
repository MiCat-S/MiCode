# Text generation models

T3 Code uses an LLM for lightweight background text tasks: thread titles, branch names, commit messages, PR titles/descriptions, voice transcript cleanup, and [prompt enhancement](./composer.md#enhance-a-prompt). Configure the default in **Settings → Threads → Text generation model** (overridable separately in **Settings → Source control & issues**, **Settings → Voice**, and **Settings → Threads → Prompt enhancement**).

By default, a coding agent handles these tasks by starting a session per request. Adding a dedicated **text generator** API is usually much faster and cheaper.

## Add a text generator

Open **Settings → Providers → Text generators → Add generator** (stored per environment; API keys support [Secrets](./secrets.md)):

- **OpenAI** or **Anthropic**: Enter an API key.
- **OpenRouter**: Enter an OpenRouter API key to use any model it serves.
- **Custom (OpenAI-compatible)**: Enter a base URL (e.g. Ollama at `http://localhost:11434/v1` or LM Studio—`localhost` resolves on the environment's server).

Click **Test** beside a model picker to verify the key works, or **Show models** to refresh the catalog. MI Code uses the selected provider and model for each task. If that selection is unavailable, choose an available model in Settings and try again. Generated PR titles and descriptions are based on the branch changes and the configured writing style.

## Limitations

- **Review guides** always require a coding agent (Codex or Claude), not a text generator—choose one under **Settings → Source control & issues → Review guide model**.
- A [managed policy](./managed-policy.md) that restricts providers also disables text generators.
