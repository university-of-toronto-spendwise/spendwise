from django.db import models

# Create your models here.

class Codes(models.Model):

    category = models.CharField(max_length=20)
    company = models.CharField(max_length=20)
    desc = models.TextField()
    code = models.CharField(
    max_length=200,
    blank=True,
    default=""
    )
    url = models.URLField(
    max_length=200,
    blank=True,
    default=""
    )
    



    



