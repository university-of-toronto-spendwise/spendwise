from django.db import models

# Create your models here.

class Codes(models.Model):

    category = models.CharField(max_length=20)
    company = models.CharField(max_length=20)
    desc = models.TextField()
    code = models.URLField()



