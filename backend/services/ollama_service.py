import httpx
import json
from typing import Optional
from models.account import AccountType

OLLAMA_BASE = "http://localhost:11434"
MODEL_PREFERENCE = ["llama3.2:3b", "llama3.2", "phi3.5", "gemma3:4b"]


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

    async def _generate(self, prompt: str, temperature: float = 0.7) -> Optional[str]:
        model = await self.get_active_model()
        if not model:
            return None
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                r = await client.post(f"{self.base_url}/api/generate", json={
                    "model": model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {"temperature": temperature},
                })
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
        prompt = f"""Map these CSV columns to: date, merchant, amount, category (optional).
Headers: {headers}
Sample: {json.dumps(sample_rows[:2], default=str)}

Respond with JSON only: {{"date": "col_name", "merchant": "col_name", "amount": "col_name", "category": "col_name_or_null"}}"""
        result = await self._generate(prompt)
        if result:
            try:
                start = result.find("{")
                end = result.rfind("}") + 1
                return json.loads(result[start:end])
            except Exception:
                pass
        return {}

    async def categorize_batch(self, transactions: list[dict]) -> list[dict]:
        if not transactions:
            return []
        categories = [
            "Groceries", "Dining & Bars", "Coffee & Cafes", "Transportation",
            "Shopping & Retail", "Entertainment", "Health & Medical", "Subscriptions",
            "Utilities & Bills", "Income", "Transfer", "General Household",
            "Gas & Fuel", "Travel & Hotels", "Other"
        ]
        merchants = [t.get("merchant_raw", "") for t in transactions]
        prompt = f"""Categorize each merchant. Categories: {', '.join(categories)}

Merchants:
{chr(10).join(f'{i}: {m}' for i, m in enumerate(merchants))}

Respond with JSON array: [{{"index": 0, "merchant": "clean name", "category": "category"}}]
Return one entry per merchant in order."""

        result = await self._generate(prompt, temperature=0.1)
        if result:
            try:
                start = result.find("[")
                end = result.rfind("]") + 1
                data = json.loads(result[start:end])
                return data
            except Exception:
                pass
        return []

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
