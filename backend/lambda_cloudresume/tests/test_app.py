import json
import os
import pytest

# Import the Lambda function code
from ..app import lambda_handler


class DummyDynamoDBClient:
    def __init__(self):
        # We'll keep a simple in‑memory store for our table, keyed by 'id'
        # Each item has an 'id' and a 'count' to mimic real DynamoDB Items.
        self.data = {
            "total": {"id": {"S": "total"}, "count": {"N": "0"}},
            "country_US": {"id": {"S": "country_US"}, "count": {"N": "0"}},
        }

    def update_item(
        self,
        TableName,
        Key,
        UpdateExpression,
        ExpressionAttributeNames,
        ExpressionAttributeValues,
        ReturnValues,
    ):
        key = Key["id"]["S"]
        inc = int(ExpressionAttributeValues[":inc"]["N"])

        # Create or update the item in self.data with an 'id' and 'count'
        if key not in self.data:
            self.data[key] = {"id": {"S": key}, "count": {"N": "0"}}

        current = int(self.data[key]["count"]["N"])
        new_val = current + inc
        self.data[key]["count"]["N"] = str(new_val)

        return {"Attributes": {"count": {"N": str(new_val)}}}

    def get_item(self, TableName, Key):
        key = Key["id"]["S"]
        return {"Item": self.data.get(key, {"id": {"S": key}, "count": {"N": "0"}})}

    def scan(self, TableName, FilterExpression, ExpressionAttributeValues):
        prefix = ExpressionAttributeValues[":prefix"]["S"]
        items = []
        # Return items whose key starts with the prefix
        for k, v in self.data.items():
            if k.startswith(prefix):
                items.append(v)
        return {"Items": items}


# Ensure our code sees the DYNAMODB_TABLE environment variable
@pytest.fixture(autouse=True)
def patch_env(monkeypatch):
    monkeypatch.setenv("DYNAMODB_TABLE", "dummy-table")


# Patch boto3.client so it returns our DummyDynamoDBClient instead of calling AWS
@pytest.fixture(autouse=True)
def patch_boto3(monkeypatch):
    dummy_client = DummyDynamoDBClient()
    monkeypatch.setattr(
        "lambda_cloudresume.app.boto3.client", lambda service: dummy_client
    )


def test_lambda_handler_increments_total():
    # Simulate an API Gateway event with a country header
    event = {"headers": {"CloudFront-Viewer-Country": "US"}}
    context = {}  # We don't use the context in our function
    result = lambda_handler(event, context)
    assert result["statusCode"] == 200
    body = json.loads(result["body"])

    # Since our dummy client started at 0, after one invocation, total should be 1.
    assert body["visitor_count"] == 1

    # Check that the country-specific count for "US" is incremented to 1.
    countries = body["countries"]
    found = any(item["country"] == "US" and item["count"] == 1 for item in countries)
    assert found
