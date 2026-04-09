from django.urls import path

from .views import (
    CreateLinkTokenView,
    ExchangeTokenView,
    ItemListView,
    BankAccountListView,
    ItemDetailView,
    AccountsView,
    TransactionsView,
)

urlpatterns = [
    path('plaid/link-token/',                          CreateLinkTokenView.as_view()),
    path('plaid/exchange-token/',                      ExchangeTokenView.as_view()),
    path('plaid/items/',                               ItemListView.as_view()),
    path('plaid/bank-accounts/',                       BankAccountListView.as_view()),
    path('plaid/items/<str:item_id>/',                 ItemDetailView.as_view()),
    path('plaid/items/<str:item_id>/accounts/',        AccountsView.as_view()),
    path('plaid/items/<str:item_id>/transactions/',    TransactionsView.as_view()),
]
