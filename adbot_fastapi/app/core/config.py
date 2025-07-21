import os
from dotenv import load_dotenv
load_dotenv()


winrm_server = os.getenv("WINRM_SERVER")
winrm_username = os.getenv("WINRM_USERNAME")
winrm_password = os.getenv("WINRM_PASSWORD")

WINRM_CONFIG = {
    "server": winrm_server, # 192.168.1.10 (AD Server)
    "username": winrm_username, # Administrator (AD Admin)
    "password": winrm_password, # OMARali0201**
    "ssl": False,
    "cert_validation": False,
    "auth": "negotiate",
    "transport": "plaintext"
} 