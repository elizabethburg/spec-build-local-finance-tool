from peewee import (
    SqliteDatabase,
    Model,
    CharField,
    TextField,
    DateField,
    DateTimeField,
    DecimalField,
    BooleanField,
    IntegerField,
)

db = SqliteDatabase("finance.db")


class Settings(Model):
    key = CharField(primary_key=True)
    value = TextField()

    class Meta:
        database = db
        table_name = "settings"


class Transaction(Model):
    date = DateField()
    merchant_raw = TextField()
    merchant = TextField(null=True)
    category = TextField(null=True)
    amount = DecimalField(decimal_places=2)
    type = CharField()  # 'debit' | 'credit'
    institution = TextField(null=True)
    is_split = BooleanField(default=False)
    parent_id = IntegerField(null=True)
    categorized = BooleanField(default=False)
    notes = TextField(null=True)
    tags = TextField(null=True)
    reconciled = BooleanField(default=False)

    class Meta:
        database = db
        table_name = "transactions"


class SplitItem(Model):
    transaction_id = IntegerField()  # FK → transactions.id
    category = TextField()
    amount = DecimalField(decimal_places=2)

    class Meta:
        database = db
        table_name = "split_items"


class CategorizationRule(Model):
    vendor_pattern = TextField()
    merchant_name = TextField()
    category = TextField()
    confidence = CharField()  # 'high' | 'medium'
    times_applied = IntegerField(default=1)

    class Meta:
        database = db
        table_name = "categorization_rules"


class Insight(Model):
    text = TextField(null=True)
    generated_at = DateTimeField()
    seen = BooleanField(default=False)
    upload_id = IntegerField(null=True)

    class Meta:
        database = db
        table_name = "insights"


class Institution(Model):
    name_raw = TextField()
    name_display = TextField()

    class Meta:
        database = db
        table_name = "institutions"


def init_db():
    db.connect(reuse_if_open=True)
    db.create_tables(
        [Settings, Transaction, SplitItem, CategorizationRule, Insight, Institution],
        safe=True,
    )
