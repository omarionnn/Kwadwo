"""conftest.py — shared pytest fixtures and async configuration."""
import pytest

import os
import shutil
import tempfile
from pathlib import Path

# Ensure asyncio event loop is reused across tests in the same session
# (pytest-asyncio handles this via asyncio_mode=auto in pytest.ini)

@pytest.fixture(scope="session", autouse=True)
def test_data_dir():
    """Sets up a temporary data directory for all tests in the session."""
    tmp_dir = tempfile.mkdtemp(prefix="saafi_test_data_")
    os.environ["SAAFI_DATA_DIR"] = tmp_dir
    yield tmp_dir
    # Cleanup after all tests
    if os.path.exists(tmp_dir):
        shutil.rmtree(tmp_dir)
