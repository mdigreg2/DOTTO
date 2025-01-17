#!/usr/bin/env python
"""
nlp type
"""

from enum import Enum
from typing import Dict, List
from utils.utils import enum_to_dict


class FileExtensions(Enum):
    """
    Enum to contain all of the file extensions we support
    """

    java = ["java.dat"]
    cpp = ["cpp.dat", "cc.dat"]
    python = ["py.dat"]


file_extensions: Dict[str, List[str]] = enum_to_dict(FileExtensions)
