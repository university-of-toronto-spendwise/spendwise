from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('studentcodes/', include('student_codes.urls')),
    path('api/', include('accounts.urls')),
    path('api/', include('scholarships.urls')),
    path('api/', include('transactions.urls')),
    path('api/', include('spending.urls')),
]
