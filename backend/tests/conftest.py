"""conftest.py — shared pytest fixtures and async configuration."""
import pytest

# Ensure asyncio event loop is reused across tests in the same session
# (pytest-asyncio handles this via asyncio_mode=auto in pytest.ini)
