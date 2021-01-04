#!/usr/bin/env python3
"""
main file
entry point for running assignment 1
"""

import ast
import string
import random

import pandas as pd
import numpy as np
import networkx as nx
import tensorflow as tf
import yaml

from os.path import exists, join
from loguru import logger
from tensorflow import convert_to_tensor
from typing import List, Union, Tuple

from shared.type import NLPType
from shared.utils import get_file_path_relative, list_files
from shared.variables import (
    random_state,
    data_folder,
    clean_data_folder,
    type_path_dict,
    main_data_file,
    models_folder,
    inter_library_graph_file,
    inter_library_vocabulary_file,
    inter_library_tokenization_model_path
)

AUTOTUNE = tf.data.experimental.AUTOTUNE
embedding_dimensionality: int = 5

# Use this snippet to stop running the program and test stuff in the IDE
IMPORTS_COLUMN_NAME = "imports"


def initialize_randomState_GPU() -> None:
    """
    initialize before running anything
    """
    tf.random.set_seed(random_state)
    random.seed(random_state)
    np.random.seed(random_state)
    logger.info(
        f"Num GPUs Available: {len(tf.config.experimental.list_physical_devices('GPU'))}"
    )


def get_data(data_type: NLPType, clean_data_path=None):
    if clean_data_path == None:
        train_name: str = "train"
        library_data_folder = type_path_dict[data_type]

        clean_data_dir = get_file_path_relative(
            f"{data_folder}/{clean_data_folder}/{library_data_folder}"
        )
        clean_data_path = get_file_path_relative(
            f"{clean_data_dir}/{main_data_file}"
        )
        logger.info(f"Loading data from: {clean_data_path}")
    assert exists(clean_data_path)
    imported_data = pd.read_csv(clean_data_path, index_col=0)
    imported_data["imports"] = imported_data["imports"].apply(
        lambda x: ast.literal_eval(x)
    )
    # need index_col = 0 to avoid duplicating the index column
    logger.success("Data loaded")
    return imported_data

def count_imports_and_max_len(
    imports_df, imports_column_name=IMPORTS_COLUMN_NAME
):
    logger.info("Counting number of imports")
    length_of_imports_list: List[int] = [
        len(x) for x in imports_df[imports_column_name]
    ]
    total_number_imports: int = sum(length_of_imports_list)
    max_len: int = max(length_of_imports_list)
    return total_number_imports, max_len

def vectorize_imports(imports_df, total_number_imports, max_len):
    logger.info("Creating Vectorize layer")
    from tensorflow.python.keras.layers.preprocessing import (
        text_vectorization,
    )

    vectorize_layer = tf.keras.layers.experimental.preprocessing.TextVectorization(
        max_tokens=total_number_imports,
        output_mode="int",
        output_sequence_length=max_len,
        split=text_vectorization.SPLIT_ON_WHITESPACE,
        standardize=None,
    )

    logger.success("Created vectorize layer")
    logger.info("Preparing to adapt data to vectorize layer")
    imports_series = imports_df["imports"].to_list()
    imports_flattened = np.concatenate(imports_series)
    tf_data = tf.data.Dataset.from_tensor_slices(imports_flattened)
    vectorize_layer.adapt(tf_data.batch(64))
    model = tf.keras.models.Sequential()
    model.add(tf.keras.Input(shape=(1,), dtype=tf.string))
    model.add(vectorize_layer)

    space_stripper = lambda s: s.strip()
    super_space_stripper = lambda l: list(map(space_stripper, l))
    stripped_imports = list(map(super_space_stripper, imports_series))
    concatter = lambda l: " ".join(l)
    space_joined_imports = list(map(concatter, stripped_imports))
    vectorized_imports = model.predict(space_joined_imports)
    
    return vectorized_imports, vectorize_layer, model


def get_pairs_of_imports(vectorized_imports):
    from itertools import combinations

    pairs = []
    generate_and_add_to_pairs = lambda l: pairs.extend(combinations(l, 2))

    def make_pairs(l):
        # TODO: Change this to binary search, because otherwise, this could get slow (31*num_files comparisons)
        index = 0
        len_l = len(l)
        while index < len_l:
            if l[index] == 0:
                break
            index += 1
        if index > 0:
            generate_and_add_to_pairs(l[0:index])

    # TODO: Should this be a mapped function instead of a for .. in range ..?
    for i in range(len(vectorized_imports)):
        make_pairs(vectorized_imports[i])
    logger.success(
        f"Finished generating pairs of all imports ({len(pairs)} pairs). Example:"
    )
    logger.debug(pairs[0])
    return pairs


def make_graph(pairs):
    logger.debug("About to create a graph")
    graph_of_imports = nx.Graph()
    # graph_of_imports.add_edges_from(pairs)
    # TODO: Shouldn't this also be a mapped function??
    for import_a, import_b in pairs:
        if graph_of_imports.has_edge(import_a, import_b):
            graph_of_imports[import_a][import_b]["weight"] += 1
        else:
            graph_of_imports.add_edge(import_a, import_b, weight=1)
    logger.success("Made a graph!")
    return graph_of_imports


def get_n_nearest_libraries(base_library: Union[str, int], n: int, vocabulary: List[str], model: tf.keras.models.Sequential, graph: nx.Graph)->List[Tuple[str, int]]:
    """
    Returns the n most related libraries given a base library and a 
    """
    format_import = lambda n: f"{n}:{vocabulary[n]}"
    try:
        import_to_try = base_library  # Note that this can either be index of import or name of import
        max_num_imports_to_show = n  # This is only a number
        print("\n" * 10)  # Clear the screen

        # If possible, convert the input into an index. If not an index, give up, it's the name of an import
        try:
            import_to_try = int(import_to_try)
        except Exception:
            import_to_try = model.predict([import_to_try])[0][0]

        # Print out the import received and the imports it is connected to
        logger.info(f"{format_import(import_to_try)} was received.")
        edges = list(graph.edges(import_to_try, data=True))
        edges = sorted(
            edges, key=lambda i: i[2]["weight"], reverse=True
        )
        edges = edges[:max_num_imports_to_show]
        # for e in edges:
        #     logger.debug(f"{format_import(e[1])}: {e[2]['weight']}")
        return [(vocabulary[e[1]], e[2]['weight']) for e in edges]

    except Exception as e:
        logger.debug(e)
        logger.error("Import was likely out of range")
        # If the index provided is out of range, this block will get triggered
        # If the import string doesn't exist, then it'll just return <UNK>


def run_interactive_test_loop(vocabulary, model, graph):
    logger.info("Stepping into infinite loop to test...")
    format_import = lambda n: f"{n}:{vocabulary[n]}"
    while True:
        try:
            import_to_try = input(
                "What import would you like to try? >>> "
            )  # Note that this can either be index of import or name of import
            max_num_imports_to_show = int(
                input(
                    "What is the maximum number of imports you would like to see? >>> "
                )
            )  # This is only a number
            print("\n" * 100)  # Clear the screen
            [print(x) for x in get_n_nearest_libraries(import_to_try, max_num_imports_to_show, vocabulary, model, graph)]
        except Exception:
            logger.error("Import was out of range")


def save_graph_state(data_type: NLPType, vocabulary: List[str], model: tf.keras.models.Sequential, graph: nx.Graph)->None:
    folder_name: str = type_path_dict[data_type]
    graph_output_path = get_file_path_relative(
        f'{data_folder}/{models_folder}/{folder_name}')

    logger.info("Saving graph")
    nx.write_gpickle(graph, join(graph_output_path, inter_library_graph_file))

    logger.info("Saving vectorization model")
    model.save(join(graph_output_path, inter_library_tokenization_model_path))

    logger.info("Saving vocabulary")
    with open(join(graph_output_path, inter_library_vocabulary_file), 'w') as f:
        yaml.dump(vocabulary, stream=f, explicit_start=True, default_flow_style=False)
    

@logger.catch
def main(data_type: NLPType, interactive_debug: bool = False):
    initialize_randomState_GPU()
    imports_df = get_data(data_type)
    total_number_imports, max_len = count_imports_and_max_len(imports_df)
    vectorized_imports, vectorize_layer, model = vectorize_imports(
        imports_df, total_number_imports, max_len
    )
    # An array of imports in the order they were
    vocabulary = vectorize_layer.get_vocabulary()

    # TODO: Can't this be better done with a numpy array?
    vectorized_imports = vectorized_imports.tolist()
    # imports = imports_df[IMPORTS_COLUMN_NAME].tolist()
    imports = vectorized_imports
    pairs = get_pairs_of_imports(imports)
    graph = make_graph(pairs)

    logger.info("Saving graph state")
    save_graph_state(data_type, vocabulary, model, graph)
    logger.success("Graph state saved")
    
    if interactive_debug:
        run_interactive_test_loop(vocabulary, model, graph)
    else:
        pass

if __name__ == "__main__":
    main(NLPType.library_relation, interactive_debug=True)

"""
Two ways of splitting data: 
1) generate tuples of every possible combination
2) generate 'sentences' the way Josh was before...
idk which works better, but we will see
generating tuples: 
"""