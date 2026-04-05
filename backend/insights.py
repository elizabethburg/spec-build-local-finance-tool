import ollama
import json
from database import Insight, Transaction, Settings
from datetime import datetime


def _get_model() -> str:
    PREFERRED = ["llama3.2:3b", "llama3.2", "phi3.5", "gemma3:4b", "gemma3", "qwen2.5-coder:1.5b"]
    try:
        installed = [m["model"] for m in ollama.list()["models"]]
        for p in PREFERRED:
            if p in installed:
                return p
        if installed:
            return installed[0]
    except Exception:
        pass
    return "llama3.2:3b"


def generate_insight() -> str | None:
    """
    Generate a single non-obvious insight from transaction data.
    Returns the insight text, or None if nothing non-obvious was found.
    Saves to the insights table.
    """
    # Pull categorized transactions
    txns = list(Transaction.select().where(Transaction.categorized == True))
    if len(txns) < 5:
        return None  # Not enough data

    # Build a summary for Ollama
    cat_totals = {}
    for t in txns:
        if t.category and t.type == "debit":
            cat_totals[t.category] = cat_totals.get(t.category, 0) + float(t.amount)

    top_categories = sorted(cat_totals.items(), key=lambda x: -x[1])[:8]

    try:
        name_row = Settings.get(Settings.key == "user_name")
        name = name_row.value or "you"
    except Exception:
        name = "you"

    prompt = f"""You are analyzing {name}'s personal spending data. Here are their spending totals by category:

{json.dumps(dict(top_categories), indent=2)}

Your job: find ONE non-obvious insight — a cross-category pattern, an unexpected correlation, or something {name} probably hasn't noticed.

Critical rules:
- Address {name} by name (e.g. "{name}'s coffee spend..."). Never say "the user".
- NEVER give advice or tell {name} what to do. No "try", "consider", "you should", "you might want to".
- NEVER state the obvious (e.g., "Groceries is your biggest expense").
- ONLY surface something that isn't immediately visible in the spending totals above.
- Write ONE sentence. Curious and observational.
- If you cannot find anything genuinely non-obvious, respond with exactly: null

Examples of BAD insights (too obvious or prescriptive):
- "{name} spent the most on Groceries." (obvious from data)
- "Consider reducing your dining expenses." (prescriptive)

Examples of GOOD insights:
- "{name}'s subscription spending across 4 services exceeds the dining total, even though dining feels more visible day-to-day."
- "Coffee and dining together account for nearly as much as {name}'s largest single category."

Respond with ONLY the insight sentence, or the word null."""

    try:
        response = ollama.chat(
            model=_get_model(),
            messages=[{"role": "user", "content": prompt}],
            options={"temperature": 0.3}
        )
        content = response["message"]["content"].strip().strip('"')

        if content.lower() == "null" or not content:
            text = None
        else:
            # Safety net: LLMs sometimes say "the user" despite instructions
            if name and name != "you":
                content = content.replace("The user", name).replace("the user", name)
            text = content
    except Exception:
        text = None

    # Save to insights table (mark previous insights as seen first)
    Insight.update(seen=True).execute()

    Insight.create(
        text=text,
        generated_at=datetime.now(),
        seen=False,
        upload_id=None
    )

    return text
