import re
from urllib.parse import urlparse


def normalize_text(value):
    if not value:
        return ""
    return re.sub(r"[^a-z0-9]+", " ", str(value).lower()).strip()


def domain_tokens(url):
    if not url:
        return set()

    hostname = urlparse(url).netloc.lower().replace("www.", "")
    return {
        token
        for token in re.split(r"[^a-z0-9]+", hostname)
        if token and token not in {"com", "ca", "org", "net"}
    }


def clean_code_value(value):
    if not value:
        return ""

    cleaned = str(value).strip()
    if cleaned.lower() in {"no_code", "none", "n/a", "unique", "random"}:
        return ""
    return cleaned


def serialize_code(code, relevance_score=None):
    payload = {
        "id": code.id,
        "source": code.source,
        "external_id": code.external_id,
        "partner": code.company,
        "category": code.category,
        "title": code.title,
        "description": code.desc,
        "url": code.url,
        "promo_code_online": clean_code_value(code.code),
        "promo_code_instore": clean_code_value(code.in_store_code),
        "online": code.online,
        "in_store": code.in_store,
        "is_spc_plus": code.is_spc_plus,
        "logo": code.logo,
        "image": code.image,
        "popularity_score": code.popularity_score,
    }
    if relevance_score is not None:
        payload["relevance_score"] = relevance_score
    return payload


def score_code_against_transaction(code, transaction):
    merchant = normalize_text(transaction.merchant_name or "")
    name = normalize_text(transaction.name or "")
    categories = {normalize_text(v) for v in (transaction.category or []) if v}
    website = domain_tokens(transaction.website or "")

    company = normalize_text(code.company)
    title = normalize_text(code.title)
    code_category = normalize_text(code.category)

    code_tokens = {token for token in company.split() if len(token) > 2}
    code_tokens.update(token for token in title.split() if len(token) > 3)
    code_tokens.update(domain_tokens(code.url))

    score = 0

    if company and merchant and (merchant == company or company in merchant or merchant in company):
        score += 8

    if company and name and (name == company or company in name or name in company):
        score += 6

    if code_category and code_category in categories:
        score += 4
    elif code_category:
        category_text = " ".join(categories)
        if any(token in category_text for token in code_category.split() if len(token) > 2):
            score += 2

    if code_tokens and website and code_tokens.intersection(website):
        score += 5

    combined = f"{merchant} {name} {' '.join(categories)}"
    token_hits = sum(1 for token in code_tokens if token in combined)
    if token_hits:
        score += min(token_hits, 3)

    return score


def score_code_for_transactions(code, transactions):
    return sum(score_code_against_transaction(code, tx) for tx in transactions)
