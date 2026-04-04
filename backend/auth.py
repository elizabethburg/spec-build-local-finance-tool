import bcrypt
import secrets
import string

# In-memory session token storage (cleared on backend restart / browser close)
active_sessions: dict[str, bool] = {}

WORD_LIST = [
    "apple", "bridge", "candle", "dream", "eagle", "forest",
    "garden", "harbor", "island", "jungle", "kettle", "lemon",
    "marble", "nectar", "ocean", "planet", "quartz", "river",
    "silver", "timber", "umbra", "valley", "window", "xylophone",
    "yellow", "zenith", "amber", "basket", "copper", "delta",
    "ember", "falcon", "granite", "hollow", "ivory", "jasper",
    "kestrel", "lantern", "meadow", "nimbus", "opal", "prism",
    "quill", "raven", "stone", "thorn", "umber", "violet",
    "walnut", "yarrow"
]

def hash_pin(pin: str) -> str:
    return bcrypt.hashpw(pin.encode(), bcrypt.gensalt()).decode()

def verify_pin(pin: str, hashed: str) -> bool:
    return bcrypt.checkpw(pin.encode(), hashed.encode())

def generate_session_token() -> str:
    token = secrets.token_urlsafe(32)
    active_sessions[token] = True
    return token

def invalidate_session(token: str):
    active_sessions.pop(token, None)

def is_valid_session(token: str) -> bool:
    return active_sessions.get(token, False)

def generate_recovery_phrase() -> str:
    words = secrets.SystemRandom().sample(WORD_LIST, 6)
    return " ".join(words)

def hash_phrase(phrase: str) -> str:
    return bcrypt.hashpw(phrase.lower().encode(), bcrypt.gensalt()).decode()

def verify_phrase(phrase: str, hashed: str) -> bool:
    return bcrypt.checkpw(phrase.lower().encode(), hashed.encode())
