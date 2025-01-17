#!/usr/bin/env python
"""
Utility functions for NLP
"""
import gzip
import os
import tarfile
import subprocess
import tensorflow as tf
from enum import Enum
from glob import glob
from os import makedirs, remove
from os.path import abspath, exists, join
from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Any, Dict, Iterable, List, Optional, Tuple, Union

import pandas as pd
from loguru import logger

class reScribeModel(tf.keras.Model):
    trained: bool = False
    def __init__(self):
        super(reScribeModel, self).__init__()

def get_values_concat(input_dictionary: Dict[str, List[str]]) -> List[str]:
    """
    flatten dictionary to list of strings
    """
    return_list: List[str] = []
    for value in input_dictionary.values():
        return_list.extend(value)
    return return_list


def clean_regex_str(input_str: str) -> str:
    """
    sanitize regex bigquery string
    """
    return input_str.replace("+", "\\+")


def enum_to_dict(enum: Enum) -> Dict[str, Any]:
    """
    Return the dictionary incarnation of an input enum
    """
    output: Dict[str, Any] = {}
    for item in enum:
        output[item.name] = item.value

    return output


def _compress_labels_helper(tags, langs: Dict) -> Optional[Any]:
    """
    Helper to encapsulate the inner loops of the process running in key label. This enables the use of a
    'continue' statement to complete row processing
    """
    for (key, labels) in langs.items():
        for tag in tags.split("|"):
            if tag in labels:
                return key

    return None


def compress_labels(frame: pd.DataFrame, keys: Dict) -> pd.DataFrame:
    """
    This takes in a dataframe and then a dict of {"key": ["associated labels"]} and transforms our dataset into
    id  |   title    |   tags
    num | "whatever" | "language"
    :param frame: Data frame of stackoverflow-like data
    :param keys: dict of {"eky": ["associated labels"]}
    :returns: Labeled data without the initial tag information
    """
    output = pd.DataFrame()

    for _index, row in frame.iterrows():
        tags = row["tags"]
        new_label = _compress_labels_helper(tags, keys)
        if new_label is not None:
            new_row = {"id": row["id"], "title": row["title"], "tags": new_label}
            output = output.append(new_row, ignore_index=True)
            continue

    return output


def get_file_path_relative(path: str) -> str:
    """
    returns path relative to the home folder (nlp)
    """
    current_path: str = abspath(Path(__file__).absolute())
    separator: str = "/nlp/"
    split_path: List[str] = current_path.split(separator)
    if len(split_path) < 2:
        raise RuntimeError("nlp path not found")
    nlp_path: str = abspath(join(split_path[0], separator.replace("/", "")))
    return abspath(join(nlp_path, path))


def list_files(directory: str, search: Iterable) -> List[str]:
    """
    list files
    """
    if isinstance(search, str):
        search = [search]

    output: List[str] = []
    for term in search:
        for filepath in glob(os.path.join(directory, term)):
            output.append(filepath)

    return output


def clean_folder(
    directory: str, extensions: Union[Iterable, str], use_glob: bool = True
) -> None:
    """
    Remove all files within a directory with the specified extensions
    If the directory does not exist, create the empty directory
    """
    if isinstance(extensions, str):
        extensions = [extensions]

    if not exists(directory):
        logger.critical(
            f"Attempting to clean a nonexistent directory: {directory}\nCreating empty folder"
        )
        makedirs(directory)
        return

    logger.info(f"cleaning directory: {directory}")
    if use_glob:
        for extension in extensions:
            for filepath in glob(os.path.join(directory, extension)):
                os.remove(filepath)

    else:
        filepaths: List[str] = []
        for extension in extensions:
            filepaths += list_files(directory, f"*.{extension}")

        for filepath in filepaths:
            remove(join(directory, filepath))


def normalize_filename(filename: str, file_id: str) -> str:
    """
    Given a filename and fileID, return the save path
    input: filename.extension, id
    returns: filename.id.extension.dat
    """
    filename_list: List[str] = filename.split(".")
    filename_list.append("dat")
    filename_list.insert(-2, file_id)

    return ".".join(filename_list)


def original_filename(normalized_filename: str) -> Tuple[str, str]:
    """
    Given a normalized filename, return the original filename
    input: filename.id.extension.dat
    returns: filename.extension, id
    """
    filename_list: List[str] = normalized_filename.split(".")
    file_id: str = filename_list.pop(-3)

    return ".".join(filename_list[:-1]), file_id


def decompress(data_path: str, extension: str) -> None:
    """
    Decompress your tgz file into the current working directory.
    """
    if extension == "tgz":
        with tarfile.open(data_path, "r:gz") as tar:
            tar.extractall(os.path.dirname(data_path))
    else:
        raise NotImplementedError(f"Extension {extension} is not yet supported.")


def read_from_disk(
    data_path: str, extension: str, chunksize: Optional[int] = None, extract_only=False
) -> Union[pd.DataFrame, List[pd.DataFrame]]:
    """
    Reads a GZipped or uncompressed CSV into a dataframe and returns
    """
    extension = extension.strip().lower()
    if extension == "gzip":
        if chunksize is not None:
            return pd.read_csv(data_path, compression="gzip", chunksize=chunksize)

        return pd.read_csv(data_path, compression="gzip")

    if extension == "csv":
        if chunksize is not None:
            return pd.read_csv(data_path, chunksize=chunksize)
        return pd.read_csv(data_path)
    
    if extension == 'tgz':
        output = []
        with tarfile.open(data_path, 'r:gz') as tar:
            with TemporaryDirectory(prefix='reading_processing_') as temp_dir:
                tar.extractall(temp_dir)
                if chunksize is not None:
                    logger.info('Chunksize param is ignored for tgz files')
                filepaths = list_files(temp_dir, '*')
                logger.info(filepaths)
                for filepath in filepaths:
                    if filepath.split('.')[-1] == 'csv':
                        if extract_only:
                            continue
                        output.append(pd.read_csv(filepath))
                    else:
                        logger.info(f"Found non csv {filepath}, saving to data directory {os.path.dirname(data_path)}/{os.path.basename(filepath)}")
                        bashCommand = f'mv {filepath} {os.path.dirname(data_path)}'
                        process = subprocess.Popen(bashCommand.split(), stdout=subprocess.PIPE)
                        process_return, error = process.communicate()
                        if process_return is not None and len(process_return) > 1:
                            logger.info(process_return)
                        if error is not None:
                            logger.info(error)
                        
        return output
        
    raise NotImplementedError(f"{extension} files are not yet supported.")


def save_to_disk(
    frame_dict: Dict[str, pd.DataFrame], data_path: str, extension: str
) -> None:

    if extension.lower().strip().endswith("gzip"):
        gz_slug = os.path.basename(data_path)
        gz_name = data_path

        if len(frame_dict) != 1:
            raise ValueError(
                f"Only dictionaries of length 1 are allowed with gzip compression\nRecieved length: {len(frame_dict)}"
            )

        with gzip.open(gz_name, "wb") as gzf:

            for file_name, data_frame in frame_dict.items():

                archive_name = os.path.join(gz_slug, file_name)

                with TemporaryDirectory(prefix="rev_processing__") as temp_dir:

                    temp_file_name = os.path.join(temp_dir, archive_name)
                    os.makedirs(os.path.dirname(temp_file_name), exist_ok=True)
                    data_frame.to_csv(temp_file_name, index=True)

                    with open(temp_file_name, "rb") as f_in:
                        gzf.writelines(f_in)

    elif extension.lower().strip().endswith("tar"):

        tarfile_slug = os.path.basename(data_path)
        # Compute the full path to the tarfile that will be created
        tarfile_name = data_path

        # Create a tarfile into which frames can be added
        with tarfile.open(tarfile_name, mode="w:gz") as tfo:

            # Loop over all dataframes to be saved
            for file_name, data_frame in frame_dict.items():

                # Compute the full path of the output file within the archive
                archive_name = os.path.join(tarfile_slug, file_name)

                # Create a temporary directory for packaging into a tar_file
                with TemporaryDirectory(prefix="rev_processing__") as temp_dir:

                    # Write a csv dump of the dataframe to a temporary file
                    temp_file_name = os.path.join(temp_dir, archive_name)
                    os.makedirs(os.path.dirname(temp_file_name), exist_ok=True)
                    data_frame.to_csv(temp_file_name, index=True)

                    # Add the temp file to the tarfile
                    tfo.add(temp_file_name, arcname=archive_name)
    else:
        raise NotImplementedError(
            f"The provided extension, {extension}, is not currently supported... please try again with a supported extension."
        )
