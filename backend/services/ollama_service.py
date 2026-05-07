import httpx
import json
from typing import Optional

OLLAMA_BASE = "http://localhost:11434"
MODEL_PREFERENCE = ["llama3.2:3b", "llama3.2", "phi3.5", "gemma3:4b"]

CATEGORIES = [
    "Groceries", "Dining & Bars", "Coffee & Cafes", "Transportation",
    "Shopping & Retail", "Entertainment", "Health & Medical", "Subscriptions",
    "Utilities & Bills", "Income", "Transfer", "General Household",
    "Gas & Fuel", "Travel & Hotels", "Other"
]


class OllamaService:
    def __init__(self, base_url: str = OLLAMA_BASE):
        self.base_url = base_url
        self._active_model: Optional[str] = None

    async def is_available(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                r = await client.get(f"{self.base_url}/api/tags")
                return r.status_code == 200
        except Exception:
            return False

    async def get_active_model(self) -> Optional[str]:
        if self._active_model:
            return self._active_model
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                r = await client.get(f"{self.base_url}/api/tags")
                if r.status_code != 200:
                    return None
                models = [m["name"] for m in r.json().get("models", [])]
                for pref in MODEL_PREFERENCE:
                    for m in models:
                        if m.startswith(pref):
                            self._active_model = m
                            return m
                if models:
                    self._active_model = models[0]
                    return models[0]
        except Exception:
            pass
        return None

    async def get_available_models(self) -> list[str]:
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                r = await client.get(f"{self.base_url}/api/tags")
                if r.status_code == 200:
                    return [m["name"] for m in r.json().get("models", [])]
        except Exception:
            pass
        return []

    async def _generate(self, prompt: str, temperature: float = 0.7,
                        timeout: float = 60.0, format_json: bool = False) -> Optional[str]:
        model = await self.get_active_model()
        if not model:
            return None
        try:
            payload: dict = {
                "model": model,
                "prompt": prompt,
                "stream": False,
                "options": {"temperature": temperature},
            }
            if format_json:
                payload["format"] = "json"
            async with httpx.AsyncClient(timeout=timeout) as client:
                r = await client.post(f"{self.base_url}/api/generate", json=payload)
                if r.status_code == 200:
                    return r.json().get("response", "").strip()
        except Exception:
            pass
        return None

    async def identify_account_type(self, headers: list[str], sample_rows: list[dict]) -> Optional[str]:
        prompt = f"""Analyze these CSV headers and sample rows and identify the account type.
Headers: {headers}
Sample rows: {json.dumps(sample_rows[:3], default=str)}

Respond with exactly one of: CHECKING, SAVINGS, CREDIT_CARD, INVESTMENT, LOAN
If uncertain, respond with: UNKNOWN"""
        result = await self._generate(prompt)
        if result:
            for t in ["CHECKING", "SAVINGS", "CREDIT_CARD", "INVESTMENT", "LOAN"]:
                if t in result.upper():
                    return t
        return None

    async def identify_columns(self, headers: list[str], sample_rows: list[dict]) -> dict:
        prompt = f"""Map these CSV column headers to transaction fields.

Headers: {headers}
Sample rows: {json.dumps(sample_rows[:2], default=str)}

Return a JSON object with these keys: date, merchant, amount, category.
Each value is the matching column header name, or null if not present.
Example: {{"date": "Date", "merchant": "Description", "amount": "Amount", "category": null}}"""
        result = await self._generate(prompt, format_json=True)
        if result:
            try:
                return json.loads(result)
            except Exception:
                pass
        return {}

    async def categorize_batch(self, transactions: list[dict]) -> list[dict]:
        """Categorize merchants in batches. Returns list of {index, merchant, category, confidence}."""
        if not transactions:
            return []

        all_results: list[dict] = []
        batch_size = 15

        for batch_start in range(0, len(transactions), batch_size):
            batch = transactions[batch_start:batch_start + batch_size]
            merchants = [t.get("merchant_raw", "") for t in batch]

            prompt = f"""You are processing raw bank transaction strings. Simplify each string to get the merchant name — do NOT substitute a different brand name.

Valid categories: {', '.join(CATEGORIES)}

Rules:
- "merchant" must be a simplified version of the raw string. Remove store numbers, locations, phone numbers, and trailing codes. Title Case, max 3 words.
- Do NOT replace the merchant with a different business (e.g. if the string says "EREWHON", merchant is "Erewhon Market", not "Whole Foods")
- "confidence" is "HIGH" if you clearly recognize this as a real business, "LOW" if you are guessing
- Paychecks and direct deposits → category "Income"
- Account transfers → category "Transfer"

Correct examples:
- "STARBUCKS #1234 SAN FRANCISCO CA" → merchant: "Starbucks", category: "Coffee & Cafes", confidence: "HIGH"
- "NETFLIX.COM" → merchant: "Netflix", category: "Subscriptions", confidence: "HIGH"
- "EREWHON MARKET LOS ANGELES CA" → merchant: "Erewhon Market", category: "Groceries", confidence: "HIGH"
- "CVSPHARMA 04199 SF CA" → merchant: "CVS Pharmacy", category: "Health & Medical", confidence: "HIGH"
- "PYMT 00123456" → merchant: "Pymt", category: "Transfer", confidence: "LOW"

Raw strings to process:
{chr(10).join(f'{i}: {m}' for i, m in enumerate(merchants))}

Return a JSON object with a "results" array, one entry per raw string.
Each entry: "index" (integer), "merchant" (string), "category" (string), "confidence" ("HIGH" or "LOW").
Example: {{"results": [{{"index": 0, "merchant": "Starbucks", "category": "Coffee & Cafes", "confidence": "HIGH"}}]}}"""

            result = await self._generate(prompt, temperature=0.1, timeout=120.0, format_json=True)
            if result:
                try:
                    data = json.loads(result)
                    batch_results = data.get("results", [])
                    for item in batch_results:
                        if "index" in item:
                            item["index"] = item["index"] + batch_start
                    all_results.extend(batch_results)
                except Exception:
                    pass

        return all_results

    async def generate_insight(self, context: dict) -> Optional[str]:
        user_name = context.get("user_name", "")
        insight_type = context.get("insight_type", "SPENDING")

        if insight_type == "SPENDING":
            top_category = context.get("top_category", "")
            amount = context.get("amount", 0)
            prompt = f"""Generate one brief, observational financial insight for {user_name}.
Data: Top spending category is {top_category} at ${amount:.0f}.
Style: Observational, not prescriptive. One sentence. Address by first name. No advice."""

        elif insight_type == "NET_WORTH":
            delta = context.get("delta", 0)
            direction = "increased" if delta > 0 else "decreased"
            prompt = f"""Generate one brief net worth insight for {user_name}.
Data: Net worth {direction} by ${abs(delta):.0f} this period.
Style: One observational sentence. Address by first name."""

        else:
            return None

        return await self._generate(prompt, temperature=0.3)


ollama_service = OllamaService()
