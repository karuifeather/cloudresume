import json
import pytest
from unittest.mock import patch
from ..app import lambda_handler, get_country_from_ip


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
    monkeypatch.setenv("DYNAMODB_TABLE", "dummy-table")


@pytest.fixture(autouse=True)
def patch_boto3(monkeypatch):
    dummy_client = DummyDynamoDBClient()
    monkeypatch.setattr(
        "lambda_cloudresume.app.boto3.client", lambda service: dummy_client
    )


def test_lambda_handler_increments_total():
    with patch("lambda_cloudresume.app.get_country_from_ip", return_value="US"):
        event = {"headers": {"CloudFront-Viewer-Country": "US"}}
        context = {}
        result = lambda_handler(event, context)
        assert result["statusCode"] == 200
        body = json.loads(result["body"])

        assert body["visitor_count"] == 1

        countries = body["countries"]
        found = any(
            item["country"] == "US" and item["count"] == 1 for item in countries
        )
        assert found
