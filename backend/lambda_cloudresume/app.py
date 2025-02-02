import json
import boto3
import requests
import os


def get_country_from_ip(ip_address):
    try:
        response = requests.get(f"https://ipapi.co/{ip_address}/country/")
        if response.status_code == 200:
            return response.text.upper()
    except Exception as e:
        print(f"Error fetching country: {e}")
    return "UNKNOWN"


def lambda_handler(event, context):
    dynamodb = boto3.client("dynamodb")
    TABLE_NAME = os.environ.get("DYNAMODB_TABLE")

    # Get the country from the client IP address
    headers = event.get("headers", {})
    client_ip = event.get("headers", {}).get("X-Forwarded-For", "").split(",")[0]
    country = get_country_from_ip(client_ip)

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
    country_key = f"country_{country}"
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
