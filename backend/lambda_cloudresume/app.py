import json
import boto3
import os
import hashlib
import time
import re


def lambda_handler(event, context):
    dynamodb = boto3.client("dynamodb")
    TABLE_NAME = os.environ.get("DYNAMODB_TABLE")

    # Get client IP for session tracking
    headers = {key.lower(): value for key, value in (event.get("headers") or {}).items()}

    # Try multiple sources for IP address
    client_ip = None

    # Try CloudFront headers first
    if headers.get("cloudfront-viewer-address"):
        client_ip = headers.get("cloudfront-viewer-address").split(":")[0]
    elif headers.get("x-forwarded-for"):
        client_ip = headers.get("x-forwarded-for").split(",")[0].strip()
    elif headers.get("x-real-ip"):
        client_ip = headers.get("x-real-ip")
    else:
        # Fallback to request context
        client_ip = (
            event.get("requestContext", {})
            .get("identity", {})
            .get("sourceIp", "unknown")
        )

    # Create a session identifier based on IP only
    session_id = hashlib.md5(f"{client_ip}".encode()).hexdigest()

    # Debug logging
    print(f"Session ID: {session_id}, IP: {client_ip}")

    # Check if this session has already been counted today
    today = time.strftime("%Y-%m-%d")
    session_key = f"session_{session_id}_{today}"

    try:
        # Try to get the session record
        session_response = dynamodb.get_item(
            TableName=TABLE_NAME,
            Key={"id": {"S": session_key}}
        )

        # If session already exists, just return current count without incrementing
        if "Item" in session_response:
            print(f"Session already exists for {session_key}")

            # Get current count without incrementing
            total_response = dynamodb.get_item(
                TableName=TABLE_NAME,
                Key={"id": {"S": "total"}}
            )

            total_count = int(
                total_response.get("Item", {}).get("count", {}).get("N", "0")
            )
        else:
            print(f"New session detected: {session_key}")

            # New session - increment counter
            # Update overall total count (stored with id 'total')
            total_response = dynamodb.update_item(
                TableName=TABLE_NAME,
                Key={"id": {"S": "total"}},
                UpdateExpression="ADD #count :inc",
                ExpressionAttributeNames={"#count": "count"},
                ExpressionAttributeValues={":inc": {"N": "1"}},
                ReturnValues="UPDATED_NEW",
            )
            total_count = int(total_response["Attributes"]["count"]["N"])

            # Mark this session as counted for today
            dynamodb.put_item(
                TableName=TABLE_NAME,
                Item={
                    "id": {"S": session_key},
                    "count": {"N": "1"},
                    "timestamp": {"S": str(int(time.time()))}
                }
            )
            print(f"Session recorded: {session_key}")

    except Exception as e:
        # If there's an error, fall back to the original behavior
        print(f"Error in session tracking: {e}")
        # Update overall total count (stored with id 'total')
        total_response = dynamodb.update_item(
            TableName=TABLE_NAME,
            Key={"id": {"S": "total"}},
            UpdateExpression="ADD #count :inc",
            ExpressionAttributeNames={"#count": "count"},
            ExpressionAttributeValues={":inc": {"N": "1"}},
            ReturnValues="UPDATED_NEW",
        )
        total_count = int(total_response["Attributes"]["count"]["N"])

    # An atomic string set records only observed countries, independently of
    # the existing total and daily session records. Never reset historical data.
    countries = None
    try:
        country = headers.get("cloudfront-viewer-country", "").upper()
        if re.fullmatch(r"[A-Z]{2}", country) and country not in {"XX", "ZZ"}:
            result = dynamodb.update_item(
                TableName=TABLE_NAME,
                Key={"id": {"S": "visitor_countries"}},
                UpdateExpression="ADD #countries :country",
                ExpressionAttributeNames={"#countries": "countries"},
                ExpressionAttributeValues={":country": {"SS": [country]}},
                ReturnValues="ALL_NEW",
            )
            countries = result.get("Attributes", {}).get("countries", {}).get("SS", [])
        else:
            result = dynamodb.get_item(
                TableName=TABLE_NAME,
                Key={"id": {"S": "visitor_countries"}},
            )
            countries = result.get("Item", {}).get("countries", {}).get("SS", [])
    except Exception as error:
        # A country lookup failure must not retry or hide a successful count.
        print(f"Country tracking unavailable: {error}")

    body = {"visitor_count": total_count}
    if countries is not None:
        body["countries"] = sorted(countries)

    return {
        "statusCode": 200,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "no-store",
            "Access-Control-Allow-Methods": "GET,OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
        },
        "body": json.dumps(body),
    }
