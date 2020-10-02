#!/usr/bin/env python3
"""
load data from github 
"""

#################################
# for handling relative imports #
#################################
if __name__ == '__main__':
    import sys
    from pathlib import Path
    current_file = Path(__file__).resolve()
    root = next(elem for elem in current_file.parents
                if str(elem).endswith('src'))
    sys.path.append(str(root))
    # remove the current file's directory from sys.path
    try:
        sys.path.remove(str(current_file.parent))
    except ValueError:  # Already removed
        pass
#################################

from os import getenv, remove, makedirs
from os.path import exists, basename, join, dirname, splitext
from shutil import rmtree
from typing import Union, List, Dict
from pandas import DataFrame
from loguru import logger
from tqdm import tqdm
from google.cloud import bigquery
import boto3
from load.bigquery.big_query_helper import BigQueryHelper as bqh
from load.bigquery.get_bigquery_credentials import main as get_bigquery_credentials
from shared.utils import get_file_path_relative
from glob import glob
from bigquery.get_bigquery_credentials import create_bigquery_client
from shared.config import PRODUCTION
from shared.type import NLPType
from shared.variables import bucket_name, dataset_length as default_dataset_length, \
    data_folder, main_data_file, \
    datasets_folder, type_path_dict
from math import floor

credentials_file: str = 'load/bigquery/bigquery_credentials.json'

s3_client = boto3.client('s3')


def get_values_concat(input_dictionary: Dict[str, List[str]]) -> List[str]:
    """
    flatten dictionary to list of strings
    """
    return_list: List[str] = []
    for value in input_dictionary.values():
        return_list.extend(value)
    return return_list


def sanitize_regex_str(input_str: str) -> str:
    """
    sanitize regex bigquery string
    """
    return input_str.replace('+', '\\+')


def get_storage_formatted_name(filename: str, file_id: str,
                               output_file_extension: str = ".dat") -> str:
    """
    Given a filename and fileID from GitHub's dataset, get the path under which the file should be
    saved. Note that it will be impossible to get the original filename back if the extension has
    an underscore in it
    """
    # 'file.java' -> ['file','.java']
    # 'filejava' ->  ['filejava','']
    # '' -> ['','']
    split_filename = splitext(filename)

    file_name_no_extension: str = split_filename[0]
    file_extension: str = split_filename[1]
    output_file_name_components_no_extension: str = [
        file_name_no_extension, file_extension, file_id]
    output_file_name_no_extension: str = '_'.join(
        output_file_name_components_no_extension)
    new_file_name: str = f"{output_file_name_no_extension}{output_file_extension}"
    return new_file_name


# TODO: Need to define what this returns... tuple?
def get_original_file_info(storage_filename: str):
    """
    (filename, fileID)
    Returns the file information given the name saved to disk. Note that this will fail for any
    files with _ in the original extension
    """
    file_without_output_extension = '.'.join(storage_filename.split(".")[:-1])
    split_file_name = file_without_output_extension.split(
        "_")  # TODO: type this... List[str]?
    file_id: str = split_file_name[-1]
    file_extension: str = split_file_name[-2]
    og_file_basename: str = '_'.join(split_file_name[:-2])
    og_filename = f"{og_file_basename}{file_extension}"
    return (og_filename, file_id)


def setup_output_folder(output_folder_path: str, delete_old_data=False) -> None:
    """
    If delete_old_data, then delete the folder; regardless, make sure the output directory exists.
    """
    if delete_old_data and not exists(dirname(output_folder_path)):
        rmtree(output_folder_path)
    if not exists(dirname(output_folder_path)):
        makedirs(dirname(output_folder_path))


def dataload(dataload_type: NLPType, dataset_length: int = default_dataset_length) -> DataFrame:
    """
    externally callable version of the main dataload function
    """
    folder_name: str = type_path_dict[dataload_type]

    client = create_bigquery_client(dataload_type)

    data = bqh(active_project="bigquery-public-data",
               dataset_name="github",
               client=client)

    data_folder_path = get_file_path_relative(
        f'{data_folder}/{datasets_folder}/{folder_name}')

    setup_output_folder(data_folder_path)

    num_files_in_batch = 1000  # BAD HARDCODING
    pbar = tqdm(total=dataset_length)
    for i in range(floor(dataset_length/num_files_in_batch) + 1):
        files_to_get = min(num_files_in_batch,
                           dataset_length-i*num_files_in_batch)
        # If this breaks, then my counter probably went 1 too far
        assert(files_to_get > 0)
        filecontent_col_title: str = "content"
        id_col_title: str = "id"
        filename_col_title: str = "filename"
        file_extension: str = ".java"
        query: str = f"""
        #
        SELECT
        {filecontent_col_title}, {id_col_title}, REGEXP_EXTRACT(sample_path,"[A-Z a-z 0-9]+\\{file_extension}") {filename_col_title}
        FROM
        `bigquery-public-data.github_repos.sample_contents`
        WHERE sample_path LIKE '%{file_extension}'
        ORDER BY 
            id desc
        LIMIT
            {files_to_get}
        OFFSET
            {num_files_in_batch*i};
        """
        # Note that the offset should be fine because we should always pull batch # of files until
        # the last iteration, where we pull a remainder, if any
        dumped_dataframe: DataFrame = data.query_to_pandas(query)
        logger.info(f"Writing to Local Disk - {data_folder_path}")

        # imports_frame.to_csv(data_folder_path) # convert to dump all files...
        for a_tuple in dumped_dataframe:
            columns = a_tuple[1]
            filename = columns[filename_col_title]
            file_id = columns[id_col_title]
            output_file = open(
                '/'.join(data_folder_path, get_storage_formatted_name(filename, file_id)))
            output_file.write(columns[filecontent_col_title])
            output_file.write(content)
            output_file.close()
            pbar.update(1)
    pbar.close()

    return dumped_dataframe
    # if PRODUCTION:
    #     s3_client.upload_file(
    #         questions_file_abs, bucket_name, basename(questions_file_abs))

    # return imports_frame


def main(dataload_type: NLPType):
    """
    main dataload function
    """
    logger.info("\n\nInitiating Data Load\n")

    imports_frame: DataFrame = dataload(dataload_type)

    logger.info("\nMETADATA:\n" + str(imports_frame.dtypes))
    logger.info(f"Number of rows: {len(imports_frame)}")
    logger.info('\n' + str(imports_frame.sample(5)) + '\n')
    logger.success("\n\nData Load Complete\n")


if __name__ == '__main__':
    main(NLPType.library_analysis)
