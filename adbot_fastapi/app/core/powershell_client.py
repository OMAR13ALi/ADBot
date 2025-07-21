from pypsrp.client import Client
from .config import WINRM_CONFIG
import logging

logger = logging.getLogger(__name__)

def execute_remote_ps(command: str):
    client = None
    try:
        logger.info(f"Connecting to {WINRM_CONFIG['server']} as {WINRM_CONFIG['username']}")
        client = Client(
            server=WINRM_CONFIG["server"],
            username=WINRM_CONFIG["username"],
            password=WINRM_CONFIG["password"],
            ssl=WINRM_CONFIG["ssl"],
            cert_validation=WINRM_CONFIG["cert_validation"],
            auth=WINRM_CONFIG["auth"],
            transport=WINRM_CONFIG["transport"]
        )
        logger.info(f"Executing command: {command}")
        stdout, stderr, rc = client.execute_ps(command)
        logger.info(f"Command completed with return code: {rc}")
        if stderr:
            logger.warning(f"PowerShell stderr: {stderr}")
        return stdout, stderr, rc
    except Exception as e:
        logger.error(f"Error executing PowerShell command: {str(e)}")
        raise
    finally:
        if client:
            try:
                client.close()
            except:
                pass 