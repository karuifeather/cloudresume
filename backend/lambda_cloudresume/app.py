import json
import boto3
import os
import hashlib
import time


def lambda_handler(event, context):
    dynamodb = boto3.client("dynamodb")
    TABLE_NAME = os.environ.get("DYNAMODB_TABLE")

    # Get the country from CloudFront headers
    headers = event.get("headers", {})
    country = headers.get("CloudFront-Viewer-Country", "").upper()
    
    # If country is empty or None, try to get from other headers or set to UNKNOWN
    if not country or country == "":
        country = "UNKNOWN"
    
    # Get client IP and User-Agent for session tracking
    client_ip = headers.get("X-Forwarded-For", "").split(",")[0].strip()
    user_agent = headers.get("User-Agent", "")
    
    # Create a session identifier based on IP and User-Agent
    session_id = hashlib.md5(f"{client_ip}_{user_agent}".encode()).hexdigest()
    
    # Check if this session has already been counted today
    today = time.strftime("%Y-%m-%d")
    session_key = f"session_{session_id}_{today}"
    
    try:
        # Try to get the session record
        session_response = dynamodb.get_item(
            TableName=TABLE_NAME,
            Key={"id": {"S": session_key}}
        )
        
        # If session already exists, just return current counts without incrementing
        if "Item" in session_response:
            # Get current counts without incrementing
            total_response = dynamodb.get_item(
                TableName=TABLE_NAME,
                Key={"id": {"S": "total"}}
            )
            total_count = int(total_response.get("Item", {}).get("count", {}).get("N", "0"))
            
            country_key = f"country_{country}"
            country_response = dynamodb.get_item(
                TableName=TABLE_NAME,
                Key={"id": {"S": country_key}}
            )
            country_count = int(country_response.get("Item", {}).get("count", {}).get("N", "0"))
        else:
            # New session - increment counters
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

            # Update country-specific count (stored with id like 'country_US')
            country_response = dynamodb.update_item(
                TableName=TABLE_NAME,
                Key={"id": {"S": country_key}},
                UpdateExpression="ADD #count :inc",
                ExpressionAttributeNames={"#count": "count"},
                ExpressionAttributeValues={":inc": {"N": "1"}},
                ReturnValues="UPDATED_NEW",
            )
            country_count = int(country_response["Attributes"]["count"]["N"])
            
            # Mark this session as counted for today
            dynamodb.put_item(
                TableName=TABLE_NAME,
                Item={
                    "id": {"S": session_key},
                    "count": {"N": "1"},
                    "timestamp": {"S": str(int(time.time()))}
                }
            )
            
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

        # Update country-specific count (stored with id like 'country_US')
        country_response = dynamodb.update_item(
            TableName=TABLE_NAME,
            Key={"id": {"S": country_key}},
            UpdateExpression="ADD #count :inc",
            ExpressionAttributeNames={"#count": "count"},
            ExpressionAttributeValues={":inc": {"N": "1"}},
            ReturnValues="UPDATED_NEW",
        )
        country_count = int(country_response["Attributes"]["count"]["N"])

    # Get all country records (scan for keys that begin with "country_")
    scan_response = dynamodb.scan(
        TableName=TABLE_NAME,
        FilterExpression="begins_with(id, :prefix)",
        ExpressionAttributeValues={":prefix": {"S": "country_"}},
    )

    countries = []
    for item in scan_response.get("Items", []):
        key = item["id"]["S"]
        if key.startswith("country_"):
            country_code = key[len("country_") :]
            count_val = int(item["count"]["N"])
            countries.append({"country": country_code, "count": count_val})

    # Sort the country list by count descending and take the top 3
    top_countries = sorted(countries, key=lambda x: x["count"], reverse=True)[:3]

    return {
        "statusCode": 200,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET,OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
        },
        "body": json.dumps({"visitor_count": total_count, "countries": top_countries}),
    }
