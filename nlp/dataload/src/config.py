#!/usr/bin/env python3
"""
config file

reads configuration from environment
"""

from dotenv import load_dotenv
from os import getenv
from typing import Union

PRODUCTION: bool = False


def read_config() -> None:
    """
    main entry point
    """
    global PRODUCTION
    load_dotenv()
    production_str: Union[str, None] = getenv('PRODUCTION')
    if production_str is not None:
        PRODUCTION = production_str == 'true'
    print(PRODUCTION)
