import plaid
from plaid.api import plaid_api
from django.conf import settings


def get_plaid_client() -> plaid_api.PlaidApi:
    """
    Returns a configured PlaidApi client pointed at the Sandbox environment.
    Swap plaid.Environment.Sandbox → plaid.Environment.Production when going live.
    """
    configuration = plaid.Configuration(
        host=plaid.Environment.Sandbox,
        api_key={
            'clientId': settings.PLAID_CLIENT_ID,
            'secret':   settings.PLAID_SECRET,
        }
    )
    return plaid_api.PlaidApi(plaid.ApiClient(configuration))