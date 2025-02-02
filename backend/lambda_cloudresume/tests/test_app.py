import json
import pytest
from unittest.mock import patch
from ..app import lambda_handler


class DummyDynamoDBClient:
    def __init__(self):
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
        if key not in self.data:
            self.data[key] = {"id": {"S": key}, "count": {"N": "0"}}
        current = int(self.data[key]["count"]["N"])
        new_val = current + inc
        self.data[key]["count"]["N"] = str(new_val)
        return {"Attributes": {"count": {"N": str(new_val)}}}

    def scan(self, TableName, FilterExpression, ExpressionAttributeValues):
        prefix = ExpressionAttributeValues[":prefix"]["S"]
        items = [v for k, v in self.data.items() if k.startswith(prefix)]
        return {"Items": items}


@pytest.fixture(autouse=True)
def patch_env(monkeypatch):
    # Mock environment variable for DynamoDB table
    monkeypatch.setenv("DYNAMODB_TABLE", "dummy-table")


@pytest.fixture(autouse=True)
def patch_boto3(monkeypatch):
    # Patch boto3 client with a dummy DynamoDB client
    dummy_client = DummyDynamoDBClient()
    monkeypatch.setattr(
        "lambda_cloudresume.app.boto3.client", lambda service: dummy_client
    )


def test_lambda_handler_increments_total_and_country():
    # Mock event with CloudFront-Viewer-Country header
    event = {"headers": {"CloudFront-Viewer-Country": "US"}}
    context = {}  # Lambda context is not used in this function

    # Call the Lambda function
    result = lambda_handler(event, context)

    # Check the HTTP response status code
    assert result["statusCode"] == 200

    # Parse the response body
    body = json.loads(result["body"])

    # Assert the visitor count is incremented to 1
    assert body["visitor_count"] == 1

    # Check that the top countries include the US with a count of 1
    countries = body["countries"]
    found = any(item["country"] == "US" and item["count"] == 1 for item in countries)
    assert found


def test_lambda_handler_handles_unknown_country():
    # Mock event with no CloudFront-Viewer-Country header
    event = {"headers": {}}
    context = {}  # Lambda context is not used in this function

    # Call the Lambda function
    result = lambda_handler(event, context)

    # Check the HTTP response status code
    assert result["statusCode"] == 200

    # Parse the response body
    body = json.loads(result["body"])

    # Assert the visitor count is incremented to 1
    assert body["visitor_count"] == 1

    # Check that the top countries include "UNKNOWN" with a count of 1
    countries = body["countries"]
    found = any(
        item["country"] == "UNKNOWN" and item["count"] == 1 for item in countries
    )
    assert found
