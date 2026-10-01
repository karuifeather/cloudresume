import json
import os
from unittest.mock import patch, MagicMock
import sys

# Mock boto3 before importing the app
sys.modules['boto3'] = MagicMock()

# Now import the app
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app import lambda_handler


class DummyDynamoDBClient:
    def __init__(self):
        self.data = {
            "total": {"id": {"S": "total"}, "count": {"N": "0"}},
        }

    def get_item(self, TableName, Key):
        key = Key["id"]["S"]
        if key in self.data:
            return {"Item": self.data[key]}
        return {}

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
        if ":country" in ExpressionAttributeValues:
            item = self.data.setdefault(key, {"id": {"S": key}})
            existing = item.get("countries", {}).get("SS", [])
            item["countries"] = {"SS": sorted(set(existing + ExpressionAttributeValues[":country"]["SS"]))}
            return {"Attributes": item}
        inc = int(ExpressionAttributeValues[":inc"]["N"])
        if key not in self.data:
            self.data[key] = {"id": {"S": key}, "count": {"N": "0"}}
        current = int(self.data[key]["count"]["N"])
        new_val = current + inc
        self.data[key]["count"]["N"] = str(new_val)
        return {"Attributes": {"count": {"N": str(new_val)}}}

    def put_item(self, TableName, Item):
        key = Item["id"]["S"]
        self.data[key] = Item
        return {}


def setup_test_environment():
    # Mock environment variable for DynamoDB table
    os.environ["DYNAMODB_TABLE"] = "dummy-table"

    # Patch boto3 client with a dummy DynamoDB client
    dummy_client = DummyDynamoDBClient()
    with patch('app.boto3.client', lambda service: dummy_client):
        return dummy_client


def test_lambda_handler_increments_visitor_count():
    with patch('app.boto3.client') as mock_boto3:
        # Setup mock DynamoDB client
        dummy_client = DummyDynamoDBClient()
        mock_boto3.return_value = dummy_client

        # Mock environment variable
        with patch.dict(os.environ, {"DYNAMODB_TABLE": "dummy-table"}):
            # Mock event with IP address
            event = {
                "headers": {"CloudFront-Viewer-Address": "192.168.1.1:12345"},
                "requestContext": {"identity": {"sourceIp": "192.168.1.1"}}
            }
            context = {}  # Lambda context is not used in this function

            # Call the Lambda function
            result = lambda_handler(event, context)

            # Check the HTTP response status code
            assert result["statusCode"] == 200

            # Parse the response body
            body = json.loads(result["body"])

            # Assert the visitor count is incremented to 1
            assert body["visitor_count"] == 1

            # Check CORS headers
            assert "Access-Control-Allow-Origin" in result["headers"]
            assert result["headers"]["Access-Control-Allow-Origin"] == "*"


def test_lambda_handler_handles_missing_ip():
    with patch('app.boto3.client') as mock_boto3:
        # Setup mock DynamoDB client
        dummy_client = DummyDynamoDBClient()
        mock_boto3.return_value = dummy_client

        # Mock environment variable
        with patch.dict(os.environ, {"DYNAMODB_TABLE": "dummy-table"}):
            # Mock event with no IP headers
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


def test_lambda_handler_session_tracking():
    with patch('app.boto3.client') as mock_boto3:
        # Setup mock DynamoDB client
        dummy_client = DummyDynamoDBClient()
        mock_boto3.return_value = dummy_client

        # Mock environment variable
        with patch.dict(os.environ, {"DYNAMODB_TABLE": "dummy-table"}):
            # Test that the same IP doesn't increment count multiple times
            event = {
                "headers": {"CloudFront-Viewer-Address": "192.168.1.2:12345"},
                "requestContext": {"identity": {"sourceIp": "192.168.1.2"}}
            }
            context = {}

            # First call should increment
            result1 = lambda_handler(event, context)
            body1 = json.loads(result1["body"])
            assert body1["visitor_count"] == 1

            # Second call with same IP should not increment (session already exists)
            result2 = lambda_handler(event, context)
            body2 = json.loads(result2["body"])
            assert body2["visitor_count"] == 1  # Should still be 1, not 2


if __name__ == "__main__":
    # Run tests when script is executed directly
    test_lambda_handler_increments_visitor_count()
    print("✓ test_lambda_handler_increments_visitor_count passed")

    test_lambda_handler_handles_missing_ip()
    print("✓ test_lambda_handler_handles_missing_ip passed")

    test_lambda_handler_session_tracking()
    print("✓ test_lambda_handler_session_tracking passed")

    print("All tests passed!")


def test_preserves_history_and_records_only_observed_countries():
    client = DummyDynamoDBClient()
    client.data["total"]["count"]["N"] = "132"
    with patch("app.boto3.client", return_value=client), patch.dict(os.environ, {"DYNAMODB_TABLE": "test"}):
        def visit(ip, country=None):
            headers = {"x-forwarded-for": ip}
            if country is not None:
                headers["cloudfront-viewer-country"] = country
            return json.loads(lambda_handler({"headers": headers}, {})["body"])
        assert visit("1.1.1.1", "US") == {"visitor_count": 133, "countries": ["US"]}
        assert visit("1.1.1.1", "US") == {"visitor_count": 133, "countries": ["US"]}
        assert visit("2.2.2.2", "NP") == {"visitor_count": 134, "countries": ["NP", "US"]}
        assert visit("3.3.3.3", "XX") == {"visitor_count": 135, "countries": ["NP", "US"]}
        assert visit("4.4.4.4") == {"visitor_count": 136, "countries": ["NP", "US"]}


def test_country_failure_does_not_hide_or_increment_total_again():
    client = DummyDynamoDBClient()
    original = client.update_item
    def update(**kwargs):
        if kwargs["Key"]["id"]["S"] == "visitor_countries":
            raise RuntimeError("unavailable")
        return original(**kwargs)
    client.update_item = update
    with patch("app.boto3.client", return_value=client), patch.dict(os.environ, {"DYNAMODB_TABLE": "test"}):
        result = lambda_handler({"headers": {"CloudFront-Viewer-Country": "US"}}, {})
        assert json.loads(result["body"]) == {"visitor_count": 1}
