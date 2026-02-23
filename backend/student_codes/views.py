from django.shortcuts import HttpResponse


def index(request):
    return HttpResponse("these are my student codes")
# Create your views here.
