import os
import sys
from akamai.edgegrid import EdgeGridAuth
from requests import Session, HTTPError
import json

EDGEDNS_ZONE = os.environ.get('EDGEDNS_ZONE')
EDGEDNS_HOST = os.environ.get('EDGEDNS_HOST')

# Validate required environment variables
if not EDGEDNS_ZONE or not EDGEDNS_HOST:
    raise ValueError("EDGEDNS_ZONE and EDGEDNS_HOST environment variables must be set.")

# Create a session with EdgeGrid
def create_session():
    session = Session()
    session.auth = EdgeGridAuth(
        client_token=os.environ.get('EDGEDNS_CLIENT_TOKEN'),
        client_secret=os.environ.get('EDGEDNS_CLIENT_SECRET'),
        access_token=os.environ.get('EDGEDNS_ACCESS_TOKEN')
    )
    session.headers.update({
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    })
    return session


# Function to create DNS record
def create_dns_record(session, domain, ip):
    url = f"https://{EDGEDNS_HOST}/config-dns/v2/zones/{EDGEDNS_ZONE}/names/{domain}/types/A"
    data = {
        "name": domain,
        "rdata": [ip],
        "ttl": 300,
        "type": "A"
    }

    try:
        response = session.post(url, json=data)
        response.raise_for_status()
        print(f"DNS record created successfully !")
    except HTTPError as e:
        response_json = json.loads(e.response.text)
        print(f"Failed to create DNS record: {response_json['title']} ")
        sys.exit(1)

# Function to delete DNS record
def delete_dns_record(session, domain):
    url = f"https://{EDGEDNS_HOST}/config-dns/v2/zones/{EDGEDNS_ZONE}/names/{domain}/types/A"

    try:
        response = session.delete(url)
        response.raise_for_status()
        print(f"DNS record deleted successfully!")
    except HTTPError as e:
        response_json = json.loads(e.response.text)
        print(f"Failed to delete DNS record: {response_json['title']}")
        sys.exit(1)

# Function to list A records
def list_a_records(session):
    url = f"https://{EDGEDNS_HOST}/config-dns/v2/zones/{EDGEDNS_ZONE}/recordsets?types=A&showAll=true"

    try:
        response = session.get(url)
        response.raise_for_status()
        records = response.json().get("recordsets", [])
        if not records:
            print("No A records found.")
        else:
            for record in records:
                print(record['name'])
    except HTTPError as e:
        response_json = json.loads(e.response.text)
        print(f"Failed to list DNS records: {response_json['title']}")
        sys.exit(1)

def main():
    if len(sys.argv) < 2 or (sys.argv[1].lower() == "create" and len(sys.argv) != 4):
        print("Usage: python edgedns_A_record.py <action> <domain> [<ip>]")
        sys.exit(1)

    action = sys.argv[1].lower()
    domain = sys.argv[2].lower() if len(sys.argv) > 2 else None
    ip = sys.argv[3] if action == "create" else None

    session = create_session()

    if action == "create":
        if not ip:
            print("IP address must be specified for create action.")
            sys.exit(1)
        create_dns_record(session, domain, ip)
    elif action == "delete":
        delete_dns_record(session, domain)
    elif action == "list":
        list_a_records(session)
    else:
        print("Invalid action. Use 'create', 'delete', or 'list'.")
        sys.exit(1)

if __name__ == "__main__":
    main()
